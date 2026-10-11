import { describe, it, expect } from "vitest";
import { journeySteps } from "./journey";
import type { ClientQuote, ClientStage } from "@/types/quote";

const stage = (id: string, state: ClientStage["state"]): ClientStage => ({
  id,
  label: id === "deposit" ? "Deposit" : "Balance",
  percent: 50,
  index: 0,
  amountMinor: 1,
  state,
  dueAt: null,
  dueBy: null,
  overdue: false,
  invoiceNumber: "x",
  paidAt: null,
  receiptPath: null,
});
const quote = (status: ClientQuote["status"], states: ClientStage["state"][]) =>
  ({
    status,
    stages: [stage("deposit", states[0]), stage("balance", states[1])],
  }) as unknown as ClientQuote;

describe("journeySteps", () => {
  it("points at Accept while the quote is open", () => {
    const steps = journeySteps(quote("sent", ["later", "later"]));
    expect(steps.map((s) => s.label)).toEqual(["Review", "Accept", "Deposit", "Balance"]);
    expect(steps.find((s) => s.current)?.key).toBe("accept");
  });
  it("points at the deposit after acceptance, then the balance", () => {
    expect(journeySteps(quote("accepted", ["due", "later"])).find((s) => s.current)?.key).toBe(
      "deposit",
    );
    expect(journeySteps(quote("accepted", ["paid", "due"])).find((s) => s.current)?.key).toBe(
      "balance",
    );
  });
  it("has no current step when everything is paid", () => {
    expect(journeySteps(quote("accepted", ["paid", "paid"])).some((s) => s.current)).toBe(false);
  });
});
