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

export const financeApi = {
  list: () => call<FinanceData>("list"),
  saveFund: (fund: FundInput) => call<{ fund: Fund }>("saveFund", fund),
  deleteFund: (id: string) => call<{ deleted: string }>("deleteFund", { id }),
  addTxn: (txn: TxnInput) => call<{ txn: Txn }>("addTxn", txn),
  deleteTxn: (id: string) => call<{ deleted: string }>("deleteTxn", { id }),
  saveBudget: (budget: BudgetInput) => call<{ budget: Budget }>("saveBudget", budget),
  deleteBudget: (id: string) => call<{ deleted: string }>("deleteBudget", { id }),
  saveExpected: (expected: ExpectedInput) =>
    call<{ expected: ExpectedIncome }>("saveExpected", expected),
  setExpectedStatus: (id: string, status: "expected" | "cancelled") =>
    call<{ expected: ExpectedIncome }>("setExpectedStatus", { id, status }),
  receiveExpected: (input: {
    id: string;
    amountMinor: number;
    date: string;
    depositFundId: string;
    category?: string;
  }) => call<{ expected: ExpectedIncome; txns: Txn[] }>("receiveExpected", input),
};
