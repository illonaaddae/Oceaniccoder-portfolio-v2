// Personal finance records: validation and the ledger rules the server enforces.
//
// Every amount is an integer number of pesewas (minor units), so sums never
// drift. Balances are never stored: a fund's balance is derived from its
// transactions every time, which is what stops a deposit being counted twice.
//
// Transaction types, and what each one moves:
//   income      outside → cash        (salary, client payment, bonus, gift)
//   expense     cash → outside        (food, transport, ...)
//   deposit     cash → fund
//   withdrawal  fund → cash
//   transfer    fund → another fund
//   fund_spend  fund → outside        (rent paid from the rent fund, a purchase)
//   opening     outside → fund        (a balance that existed before tracking began)

const { HttpError } = require("../http");

const SCOPE = "me";
const FUND_GROUPS = ["wealth", "emergency", "rent", "goal"];
const TXN_TYPES = [
  "income",
  "expense",
  "deposit",
  "withdrawal",
  "transfer",
  "fund_spend",
  "opening",
];
const EXPECTED_STATUSES = ["expected", "received", "cancelled"];
const FUND_OUT_TYPES = new Set(["withdrawal", "transfer", "fund_spend"]);
const NEEDS_FUND = new Set(["deposit", "withdrawal", "transfer", "fund_spend", "opening"]);
// GH₵ 100 million: far above any real amount, low enough to stay an exact integer.
const MAX_MINOR = 10_000_000_000;

function cedis(minorUnits) {
  const major = minorUnits / 100;
  return `GHS ${major.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function invalid(message) {
  return new HttpError(400, message);
}

function text(value, label, max, { required = false } = {}) {
  if (value === undefined || value === null) value = "";
  if (typeof value !== "string") throw invalid(`${label} must be text.`);
  const trimmed = value.trim();
  if (required && !trimmed) throw invalid(`${label} is required.`);
  if (trimmed.length > max) throw invalid(`${label} must be ${max} characters or fewer.`);
  return trimmed;
}

function minor(value, label, { positive = false } = {}) {
  if (!Number.isInteger(value) || value < 0 || value > MAX_MINOR)
    throw invalid(`${label} must be a whole number of pesewas from 0 to ${MAX_MINOR}.`);
  if (positive && value === 0) throw invalid(`${label} must be more than zero.`);
  return value;
}

function isRealDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function date(value, label, { required = true } = {}) {
  if (!required && (value === undefined || value === null || value === "")) return "";
  if (!isRealDate(value)) throw invalid(`${label} must be a date like 2027-01-31.`);
  return value;
}

function month(value, label) {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value))
    throw invalid(`${label} must be a month like 2027-01.`);
  return value;
}

function oneOf(value, allowed, label) {
  if (!allowed.includes(value)) throw invalid(`${label} must be one of: ${allowed.join(", ")}.`);
  return value;
}

function id(value, label) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(value))
    throw invalid(`${label} is not a valid id.`);
  return value;
}

function list(value, label, max) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw invalid(`${label} must be a list.`);
  if (value.length > max) throw invalid(`${label} can have at most ${max} entries.`);
  return value;
}

function parseItem(raw, index) {
  if (!raw || typeof raw !== "object") throw invalid(`Item ${index + 1} is not valid.`);
  const label = `Item ${index + 1}`;
  const item = {
    id: id(raw.id, `${label} id`),
    name: text(raw.name, `${label} name`, 60, { required: true }),
    budgetMinor: minor(raw.budgetMinor, `${label} budget`),
    ceilingMinor: minor(raw.ceilingMinor ?? raw.budgetMinor, `${label} ceiling`),
    boughtMinor: raw.boughtMinor == null ? null : minor(raw.boughtMinor, `${label} price paid`),
    boughtOn: date(raw.boughtOn, `${label} purchase date`, { required: false }),
  };
  if (item.ceilingMinor < item.budgetMinor)
    throw invalid(`${label}: the ceiling can't be below the budget.`);
  return item;
}

/** The editable fields of a fund. */
function parseFund(input) {
  const items = list(input.items, "Items", 30).map(parseItem);
  return {
    name: text(input.name, "Name", 60, { required: true }),
    group: oneOf(input.group, FUND_GROUPS, "Group"),
    targetMinor: minor(input.targetMinor ?? 0, "Target"),
    targetDate: date(input.targetDate, "Target date", { required: false }),
    monthlyMinor: minor(input.monthlyMinor ?? 0, "Monthly contribution"),
    institution: text(input.institution, "Held at", 60),
    notes: text(input.notes, "Notes", 500),
    archived: input.archived === true,
    sort: Number.isInteger(input.sort) && Math.abs(input.sort) <= 10_000 ? input.sort : 0,
    items,
  };
}

/** The fields of a transaction, before the balance checks. */
function parseTxn(input) {
  const type = oneOf(input.type, TXN_TYPES, "Type");
  const txn = {
    type,
    date: date(input.date, "Date"),
    amountMinor: minor(input.amountMinor, "Amount", { positive: true }),
    fundId: NEEDS_FUND.has(type) ? id(input.fundId, "Fund") : "",
    toFundId: type === "transfer" ? id(input.toFundId, "Destination fund") : "",
    category: text(input.category, "Category", 40),
    note: text(input.note, "Note", 200),
  };
  if (type === "transfer" && txn.fundId === txn.toFundId)
    throw invalid("A transfer needs two different funds.");
  return txn;
}

function parseBudget(input) {
  const lines = list(input.lines, "Lines", 30).map((raw, i) => {
    if (!raw || typeof raw !== "object") throw invalid(`Line ${i + 1} is not valid.`);
    return {
      id: id(raw.id, `Line ${i + 1} id`),
      label: text(raw.label, `Line ${i + 1} label`, 60, { required: true }),
      amountMinor: minor(raw.amountMinor, `Line ${i + 1} amount`),
      fundId: raw.fundId ? id(raw.fundId, `Line ${i + 1} fund`) : "",
    };
  });
  return {
    month: month(input.month, "Starts in"),
    netIncomeMinor: minor(input.netIncomeMinor, "Take-home pay"),
    lines,
  };
}

function parseExpected(input) {
  return {
    source: text(input.source, "Source", 80, { required: true }),
    amountMinor: minor(input.amountMinor, "Amount", { positive: true }),
    expectedDate: date(input.expectedDate, "Expected date", { required: false }),
    note: text(input.note, "Note", 200),
  };
}

/** Balance of every fund, from all transactions. Unknown funds still get a key. */
function fundBalances(txns) {
  const balances = new Map();
  const add = (fundId, delta) => balances.set(fundId, (balances.get(fundId) ?? 0) + delta);
  for (const t of txns) {
    switch (t.type) {
      case "deposit":
      case "opening":
        add(t.fundId, t.amountMinor);
        break;
      case "withdrawal":
      case "fund_spend":
        add(t.fundId, -t.amountMinor);
        break;
      case "transfer":
        add(t.fundId, -t.amountMinor);
        add(t.toFundId, t.amountMinor);
        break;
      default:
        break;
    }
  }
  return balances;
}

/**
 * Refuses a transaction that names a missing or archived fund, that takes
 * more out of a fund than it holds, or that sets a starting balance on a fund
 * that already has history. `others` are the existing transactions, not
 * including the one being checked.
 */
function checkTxnAgainstLedger(txn, funds, others) {
  const byId = new Map(funds.map((f) => [f.id, f]));
  for (const fundId of [txn.fundId, txn.toFundId].filter(Boolean)) {
    const fund = byId.get(fundId);
    if (!fund) throw invalid("That fund doesn't exist.");
    if (fund.archived) throw invalid(`${fund.name} is archived. Restore it first.`);
  }
  // A starting balance is what the fund held before tracking began, so it
  // only makes sense before anything else was recorded against the fund.
  if (
    txn.type === "opening" &&
    others.some((t) => t.fundId === txn.fundId || t.toFundId === txn.fundId)
  )
    throw new HttpError(
      409,
      `${byId.get(txn.fundId).name} already has history. Record a deposit instead.`,
    );
  // Checks the fund's balance after every recorded transaction, whatever its
  // date, not the balance as of this transaction's date. A backdated
  // withdrawal can pass while the fund was short on that day, as long as a
  // later deposit covers it.
  if (FUND_OUT_TYPES.has(txn.type)) {
    const balance = fundBalances(others).get(txn.fundId) ?? 0;
    if (txn.amountMinor > balance)
      throw new HttpError(409, `${byId.get(txn.fundId).name} only holds ${cedis(balance)}.`);
  }
}

/**
 * Refuses deleting transactions when that would leave a fund they touch below
 * zero (for example the deposit that a later withdrawal relied on). Funds the
 * deleted transactions don't touch are not checked, so one bad balance can't
 * block every unrelated delete.
 */
function checkDeleteAgainstLedger(txnIds, txns) {
  const ids = new Set(Array.isArray(txnIds) ? txnIds : [txnIds]);
  const touched = new Set(
    txns.filter((t) => ids.has(t.id)).flatMap((t) => [t.fundId, t.toFundId].filter(Boolean)),
  );
  const remaining = txns.filter((t) => !ids.has(t.id));
  for (const [fundId, balance] of fundBalances(remaining)) {
    if (touched.has(fundId) && balance < 0)
      throw new HttpError(
        409,
        "Deleting this would leave a fund below zero. Delete the later withdrawal first.",
      );
  }
}

/**
 * Refuses deleting transactions that touch an archived fund. Archiving needs a
 * zero balance, so taking a transaction away would leave the archived fund
 * holding money (or owing it) where no card or projection shows it.
 */
function checkDeleteTouchesNoArchivedFund(deleted, funds) {
  const byId = new Map(funds.map((f) => [f.id, f]));
  for (const fundId of deleted.flatMap((t) => [t.fundId, t.toFundId].filter(Boolean))) {
    const fund = byId.get(fundId);
    if (fund?.archived) throw new HttpError(409, `${fund.name} is archived. Restore it first.`);
  }
}

module.exports = {
  SCOPE,
  FUND_GROUPS,
  TXN_TYPES,
  EXPECTED_STATUSES,
  MAX_MINOR,
  id,
  date,
  minor,
  text,
  parseFund,
  parseTxn,
  parseBudget,
  parseExpected,
  fundBalances,
  checkTxnAgainstLedger,
  checkDeleteAgainstLedger,
  checkDeleteTouchesNoArchivedFund,
};
