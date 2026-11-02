// The /api/finance actions. Each takes (repo, input, now) and returns the
// response body. Validation lives in shared/finance/model.js; the ledger
// checks need every record, so each write starts from one full read (the
// whole personal ledger is a few thousand small documents at most) and hands
// the version from that read to repo.write, which refuses the write if any
// other write landed in between.

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
  return byKind((await repo.read()).docs);
}

async function saveFund(repo, input, now) {
  const fields = M.parseFund(input);
  const { docs, version } = await repo.read();
  if (!input.id) {
    const fund = stamp({ kind: "fund", ...fields }, now);
    await repo.write({ create: [fund] }, version);
    return { fund };
  }
  const existing = findOrThrow(docs, "fund", M.id(input.id, "Fund"));
  const { txns } = byKind(docs);
  const hasHistory = txns.some((t) => t.fundId === existing.id || t.toFundId === existing.id);
  // A fund's group decides which totals its past counts in (saved to wealth,
  // savings rate, streak), so changing it would rewrite history.
  if (fields.group !== existing.group && hasHistory)
    throw new HttpError(
      409,
      "This fund has history, so its kind can't change. Create a new fund instead.",
    );
  // Archived funds drop out of the cards and projections; with money still in
  // them the totals on screen would disagree.
  const balance = M.fundBalances(txns).get(existing.id) ?? 0;
  if (fields.archived && !existing.archived && balance !== 0)
    throw new HttpError(409, "Move the money out of this fund before archiving it.");
  const fund = touch(existing, fields, now);
  await repo.write({ replace: [fund] }, version);
  return { fund };
}

async function deleteFund(repo, input) {
  const fundId = M.id(input.id, "Fund");
  const { docs, version } = await repo.read();
  findOrThrow(docs, "fund", fundId);
  const used = docs.some(
    (d) =>
      (d.kind === "txn" && (d.fundId === fundId || d.toFundId === fundId)) ||
      (d.kind === "budget" && d.lines.some((l) => l.fundId === fundId)) ||
      (d.kind === "expected" && d.depositFundId === fundId),
  );
  if (used)
    throw new HttpError(409, "This fund has history or is used in a budget. Archive it instead.");
  await repo.write({ remove: [fundId] }, version);
  return { deleted: fundId };
}

async function addTxn(repo, input, now) {
  const parsed = M.parseTxn(input);
  const { docs, version } = await repo.read();
  const { funds, txns } = byKind(docs);
  M.checkTxnAgainstLedger(parsed, funds, txns);
  const txn = stamp({ kind: "txn", ...parsed }, now);
  await repo.write({ create: [txn] }, version);
  return { txn };
}

async function deleteTxn(repo, input) {
  const txnId = M.id(input.id, "Transaction");
  const { docs, version } = await repo.read();
  const txn = findOrThrow(docs, "txn", txnId);
  const { txns, expected } = byKind(docs);
  if (expected.some((e) => e.receivedTxnIds?.includes(txnId)))
    throw new HttpError(
      409,
      "This came from a received payment. Use Undo on it under Expected instead.",
    );
  M.checkDeleteAgainstLedger([txn.id], txns);
  await repo.write({ remove: [txnId] }, version);
  return { deleted: txnId };
}

/** One budget per starting month; saving the same month again replaces it. */
async function saveBudget(repo, input, now) {
  const fields = M.parseBudget(input);
  const { docs, version } = await repo.read();
  const { funds, budgets } = byKind(docs);
  const fundIds = new Set(funds.map((f) => f.id));
  if (fields.lines.some((l) => l.fundId && !fundIds.has(l.fundId)))
    throw new HttpError(400, "A budget line points at a fund that doesn't exist.");
  const existing = budgets.find((b) => b.month === fields.month);
  if (existing) {
    const budget = touch(existing, fields, now);
    await repo.write({ replace: [budget] }, version);
    return { budget };
  }
  const budget = stamp({ kind: "budget", ...fields }, now);
  await repo.write({ create: [budget] }, version);
  return { budget };
}

async function deleteBudget(repo, input) {
  const budgetId = M.id(input.id, "Budget");
  const { docs, version } = await repo.read();
  findOrThrow(docs, "budget", budgetId);
  await repo.write({ remove: [budgetId] }, version);
  return { deleted: budgetId };
}

async function saveExpected(repo, input, now) {
  const fields = M.parseExpected(input);
  const depositFundId = input.depositFundId ? M.id(input.depositFundId, "Fund") : "";
  const { docs, version } = await repo.read();
  if (depositFundId) findOrThrow(docs, "fund", depositFundId);
  if (!input.id) {
    const expected = stamp(
      { kind: "expected", ...fields, depositFundId, status: "expected", receivedTxnIds: [] },
      now,
    );
    await repo.write({ create: [expected] }, version);
    return { expected };
  }
  const existing = findOrThrow(docs, "expected", M.id(input.id, "Expected income"));
  if (existing.status !== "expected")
    throw new HttpError(409, "Only income that hasn't arrived yet can be edited.");
  const expected = touch(existing, { ...fields, depositFundId }, now);
  await repo.write({ replace: [expected] }, version);
  return { expected };
}

async function setExpectedStatus(repo, input, now) {
  const { docs, version } = await repo.read();
  const existing = findOrThrow(docs, "expected", M.id(input.id, "Expected income"));
  if (input.status !== "cancelled" && input.status !== "expected")
    throw new HttpError(400, "Status must be cancelled or expected.");
  if (existing.status === "received") throw new HttpError(409, "This has already been received.");
  const expected = touch(existing, { status: input.status }, now);
  await repo.write({ replace: [expected] }, version);
  return { expected };
}

/**
 * Records expected income as received: one income transaction for the amount
 * that actually arrived and, if a fund was chosen, a deposit of it into that
 * fund. All in one batch, so the money is never half-recorded.
 */
async function receiveExpected(repo, input, now) {
  const { docs, version } = await repo.read();
  const existing = findOrThrow(docs, "expected", M.id(input.id, "Expected income"));
  if (existing.status !== "expected")
    throw new HttpError(409, "Only income that hasn't arrived yet can be received.");
  const amountMinor = M.minor(input.amountMinor, "Amount received", { positive: true });
  const receivedOn = M.date(input.date, "Date received");
  const depositFundId = input.depositFundId ? M.id(input.depositFundId, "Fund") : "";
  const { funds, txns } = byKind(docs);

  // Ids derived from the expected item: a second, overlapping receive creates
  // the same ids, so its batch fails instead of recording the money twice.
  const income = stamp(
    {
      id: `rcv-${existing.id}`,
      kind: "txn",
      type: "income",
      date: receivedOn,
      amountMinor,
      fundId: "",
      toFundId: "",
      category: M.text(input.category, "Category", 40) || "Other",
      note: existing.source,
    },
    now,
  );
  const create = [income];
  if (depositFundId) {
    const deposit = stamp(
      {
        id: `rcvd-${existing.id}`,
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
    {
      status: "received",
      receivedOn,
      receivedMinor: amountMinor,
      receivedTxnIds: create.map((t) => t.id),
    },
    now,
  );
  await repo.write({ create, replace: [updated] }, version);
  return { expected: updated, txns: create };
}

/**
 * Undoes a receive, for when the amount, date or fund was wrong: removes its
 * income and deposit and puts the item back to expected, in one batch.
 */
async function unreceiveExpected(repo, input, now) {
  const { docs, version } = await repo.read();
  const existing = findOrThrow(docs, "expected", M.id(input.id, "Expected income"));
  if (existing.status !== "received") throw new HttpError(409, "This hasn't been received.");
  const { txns } = byKind(docs);
  const ids = (existing.receivedTxnIds || []).filter((txnId) => txns.some((t) => t.id === txnId));
  M.checkDeleteAgainstLedger(ids, txns);
  const updated = touch(
    existing,
    { status: "expected", receivedOn: "", receivedMinor: null, receivedTxnIds: [] },
    now,
  );
  await repo.write({ replace: [updated], remove: ids }, version);
  return { expected: updated };
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
  unreceiveExpected,
};
