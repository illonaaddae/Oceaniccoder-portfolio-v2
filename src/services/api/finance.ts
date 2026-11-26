import { apiUrl } from "@/utils/apiUrl";
import { adminHeaders } from "./adminHeaders";
import type {
  Budget,
  BudgetInput,
  ExpectedIncome,
  ExpectedInput,
  FinanceData,
  Fund,
  FundInput,
  Txn,
  TxnInput,
} from "@/types/finance";

export class FinanceApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "FinanceApiError";
    this.status = status;
  }
}

/** One admin-only action on /api/finance. */
async function call<T>(action: string, input: object = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl("/api/finance"), {
      method: "POST",
      headers: await adminHeaders(),
      body: JSON.stringify({ action, ...input }),
    });
  } catch {
    throw new FinanceApiError("Couldn't reach the server. Check your connection and try again.", 0);
  }
  let body: { error?: string };
  try {
    body = await res.json();
  } catch {
    throw new FinanceApiError(`Unexpected response from the server (${res.status}).`, res.status);
  }
  if (!res.ok) throw new FinanceApiError(body.error || "Something went wrong.", res.status);
  return body as T;
}

/** The `version` from the list the screen was loaded from; see FinanceData. */
type Version = string | null;

export const financeApi = {
  list: () => call<FinanceData>("list"),
  saveFund: (fund: FundInput, version: Version) =>
    call<{ fund: Fund }>("saveFund", { ...fund, version }),
  deleteFund: (id: string, version: Version) =>
    call<{ deleted: string }>("deleteFund", { id, version }),
  addTxn: (txn: TxnInput, version: Version) => call<{ txn: Txn }>("addTxn", { ...txn, version }),
  deleteTxn: (id: string, version: Version) =>
    call<{ deleted: string }>("deleteTxn", { id, version }),
  saveBudget: (budget: BudgetInput, version: Version) =>
    call<{ budget: Budget }>("saveBudget", { ...budget, version }),
  deleteBudget: (id: string, version: Version) =>
    call<{ deleted: string }>("deleteBudget", { id, version }),
  saveExpected: (expected: ExpectedInput, version: Version) =>
    call<{ expected: ExpectedIncome }>("saveExpected", { ...expected, version }),
  setExpectedStatus: (id: string, status: "expected" | "cancelled", version: Version) =>
    call<{ expected: ExpectedIncome }>("setExpectedStatus", { id, status, version }),
  receiveExpected: (
    input: {
      id: string;
      amountMinor: number;
      date: string;
      depositFundId: string;
      category?: string;
    },
    version: Version,
  ) => call<{ expected: ExpectedIncome; txns: Txn[] }>("receiveExpected", { ...input, version }),
  unreceiveExpected: (id: string, version: Version) =>
    call<{ expected: ExpectedIncome }>("unreceiveExpected", { id, version }),
};
