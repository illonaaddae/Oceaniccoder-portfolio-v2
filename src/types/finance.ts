// Personal finance records, as /api/finance returns them. Amounts are integer
// pesewas (minor units). Balances are never stored; see utils/finance/ledger.ts.

export type FundGroup = "wealth" | "emergency" | "rent" | "goal";

export type TxnType =
  | "income"
  | "expense"
  | "deposit"
  | "withdrawal"
  | "transfer"
  | "fund_spend"
  | "opening";

interface Stamped {
  id: string;
  scope: "me";
  createdAt: string;
  updatedAt: string;
}

export interface FundItem {
  id: string;
  name: string;
  budgetMinor: number;
  ceilingMinor: number;
  boughtMinor: number | null;
  boughtOn: string;
}

export interface Fund extends Stamped {
  kind: "fund";
  name: string;
  group: FundGroup;
  targetMinor: number;
  targetDate: string;
  monthlyMinor: number;
  institution: string;
  notes: string;
  archived: boolean;
  sort: number;
  items: FundItem[];
}

export interface Txn extends Stamped {
  kind: "txn";
  type: TxnType;
  date: string;
  amountMinor: number;
  fundId: string;
  toFundId: string;
  category: string;
  note: string;
}

export interface BudgetLine {
  id: string;
  label: string;
  amountMinor: number;
  /** Set when the line is a saving into a fund rather than spending. */
  fundId: string;
}

export interface Budget extends Stamped {
  kind: "budget";
  /** First month this plan applies to, "YYYY-MM". It runs until a later plan starts. */
  month: string;
  netIncomeMinor: number;
  lines: BudgetLine[];
}

export type ExpectedStatus = "expected" | "received" | "cancelled";

export interface ExpectedIncome extends Stamped {
  kind: "expected";
  source: string;
  amountMinor: number;
  expectedDate: string;
  note: string;
  depositFundId: string;
  status: ExpectedStatus;
  receivedOn?: string;
  receivedTxnIds: string[];
}

export interface FinanceData {
  funds: Fund[];
  txns: Txn[];
  budgets: Budget[];
  expected: ExpectedIncome[];
}

export type FundInput = Omit<Fund, keyof Stamped | "kind"> & { id?: string };
export type TxnInput = Pick<
  Txn,
  "type" | "date" | "amountMinor" | "fundId" | "toFundId" | "category" | "note"
>;
export type BudgetInput = Pick<Budget, "month" | "netIncomeMinor" | "lines">;
export type ExpectedInput = Pick<
  ExpectedIncome,
  "source" | "amountMinor" | "expectedDate" | "note" | "depositFundId"
> & { id?: string };
