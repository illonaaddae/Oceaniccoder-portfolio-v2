// The /api/finance actions. Each takes (repo, input, now) and returns the
// response body. Validation lives in shared/finance/model.js; the ledger
// checks need every record, so each write starts from one full read (the
// whole personal ledger is a few thousand small documents at most).

const { HttpError } = require("../shared/http");
const M = require("../shared/finance/model");
const { stamp } = require("../shared/finance/repo");

function byKind(docs) {
  const out = { funds: [], txns: [], budgets: [], expected: [] };
  for (const d of docs) {
    if (d.kind === "fund") out.funds.push(d);
    else if (d.kind === "txn") out.txns.push(d);
    else if (d.kind === "budget") out.budgets.push(d);
    else if (d.kind === "expected") out.expected.push(d);
  }
  return out;
}

function findOrThrow(docs, kind, id) {
  const doc = docs.find((d) => d.kind === kind && d.id === id);
  if (!doc) throw new HttpError(404, "That record no longer exists. Refresh and try again.");
  return doc;
}

function touch(doc, fields, now) {
  return { ...doc, ...fields, updatedAt: now.toISOString() };
}

async function list(repo) {
  return byKind(await repo.listAll());
}

async function saveFund(repo, input, now) {
  const fields = M.parseFund(input);
  if (!input.id) return { fund: await repo.create(stamp({ kind: "fund", ...fields }, now)) };
  const docs = await repo.listAll();
  const existing = findOrThrow(docs, "fund", M.id(input.id, "Fund"));
  return { fund: await repo.replace(touch(existing, fields, now)) };
}

async function deleteFund(repo, input) {
  const fundId = M.id(input.id, "Fund");
  const docs = await repo.listAll();
  findOrThrow(docs, "fund", fundId);
  const used = docs.some(
    (d) =>
      (d.kind === "txn" && (d.fundId === fundId || d.toFundId === fundId)) ||
      (d.kind === "budget" && d.lines.some((l) => l.fundId === fundId)) ||
      (d.kind === "expected" && d.depositFundId === fundId),
  );
  if (used)
    throw new HttpError(409, "This fund has history or is used in a budget. Archive it instead.");
  await repo.remove(fundId);
  return { deleted: fundId };
}

async function addTxn(repo, input, now) {
  const txn = M.parseTxn(input);
  const { funds, txns } = byKind(await repo.listAll());
  M.checkTxnAgainstLedger(txn, funds, txns);
  return { txn: await repo.create(stamp({ kind: "txn", ...txn }, now)) };
}

async function deleteTxn(repo, input) {
  const txnId = M.id(input.id, "Transaction");
  const docs = await repo.listAll();
  const txn = findOrThrow(docs, "txn", txnId);
  const { txns, expected } = byKind(docs);
  if (expected.some((e) => e.receivedTxnIds?.includes(txnId)))
    throw new HttpError(409, "This came from a received payment. Undo it from Expected income.");
  M.checkDeleteAgainstLedger(txn.id, txns);
  await repo.remove(txnId);
  return { deleted: txnId };
}

/** One budget per starting month; saving the same month again replaces it. */
async function saveBudget(repo, input, now) {
  const fields = M.parseBudget(input);
  const docs = await repo.listAll();
  const { funds, budgets } = byKind(docs);
  const fundIds = new Set(funds.map((f) => f.id));
  if (fields.lines.some((l) => l.fundId && !fundIds.has(l.fundId)))
    throw new HttpError(400, "A budget line points at a fund that doesn't exist.");
  const existing = budgets.find((b) => b.month === fields.month);
  if (existing) return { budget: await repo.replace(touch(existing, fields, now)) };
  return { budget: await repo.create(stamp({ kind: "budget", ...fields }, now)) };
}

async function deleteBudget(repo, input) {
  const budgetId = M.id(input.id, "Budget");
  findOrThrow(await repo.listAll(), "budget", budgetId);
  await repo.remove(budgetId);
  return { deleted: budgetId };
}

async function saveExpected(repo, input, now) {
  const fields = M.parseExpected(input);
  const depositFundId = input.depositFundId ? M.id(input.depositFundId, "Fund") : "";
  const docs = await repo.listAll();
  if (depositFundId) findOrThrow(docs, "fund", depositFundId);
  if (!input.id)
    return {
      expected: await repo.create(
        stamp(
          { kind: "expected", ...fields, depositFundId, status: "expected", receivedTxnIds: [] },
          now,
        ),
      ),
    };
  const existing = findOrThrow(docs, "expected", M.id(input.id, "Expected income"));
  if (existing.status !== "expected")
    throw new HttpError(409, "Only income that hasn't arrived yet can be edited.");
  return { expected: await repo.replace(touch(existing, { ...fields, depositFundId }, now)) };
}

async function setExpectedStatus(repo, input, now) {
  const docs = await repo.listAll();
  const existing = findOrThrow(docs, "expected", M.id(input.id, "Expected income"));
  if (input.status !== "cancelled" && input.status !== "expected")
    throw new HttpError(400, "Status must be cancelled or expected.");
  if (existing.status === "received") throw new HttpError(409, "This has already been received.");
  return { expected: await repo.replace(touch(existing, { status: input.status }, now)) };
}

/**
 * Records expected income as received: one income transaction for the amount
 * that actually arrived and, if a fund was chosen, a deposit of it into that
 * fund. All in one batch, so the money is never half-recorded.
 */
async function receiveExpected(repo, input, now) {
  const docs = await repo.listAll();
  const existing = findOrThrow(docs, "expected", M.id(input.id, "Expected income"));
  if (existing.status !== "expected")
    throw new HttpError(409, "Only income that hasn't arrived yet can be received.");
  const amountMinor = M.minor(input.amountMinor, "Amount received", { positive: true });
  const receivedOn = M.date(input.date, "Date received");
  const depositFundId = input.depositFundId ? M.id(input.depositFundId, "Fund") : "";
  const { funds, txns } = byKind(docs);

  const income = stamp(
    {
      kind: "txn",
      type: "income",
      date: receivedOn,
      amountMinor,
      fundId: "",
      toFundId: "",
      category: M.text(input.category, "Category", 40) || "Freelance",
      note: existing.source,
    },
    now,
  );
  const create = [income];
  if (depositFundId) {
    const deposit = stamp(
      {
        kind: "txn",
        type: "deposit",
        date: receivedOn,
        amountMinor,
        fundId: depositFundId,
        toFundId: "",
        category: "",
        note: existing.source,
      },
      now,
    );
    M.checkTxnAgainstLedger(deposit, funds, txns);
    create.push(deposit);
  }
  const updated = touch(
    existing,
    { status: "received", receivedOn, receivedTxnIds: create.map((t) => t.id) },
    now,
  );
  await repo.batch({ create, replace: [updated] });
  return { expected: updated, txns: create };
}

module.exports = {
  list,
  saveFund,
  deleteFund,
  addTxn,
  deleteTxn,
  saveBudget,
  deleteBudget,
  saveExpected,
  setExpectedStatus,
  receiveExpected,
};
