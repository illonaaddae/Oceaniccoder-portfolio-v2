// @vitest-environment node
import { describe, it, expect } from "vitest";

const V = await import("./views.js");
const M = await import("./model.js");

const quote = {
  id: "q1",
  quoteNumber: "Q-2026-0001",
  revision: 1,
  status: "accepted",
  currency: "GHS",
  title: "Online store",
  clientName: "Kofi Mensah",
  clientEmail: "kofi@example.com",
  clientCompany: "Mensah Ltd",
  items: [{ id: "item-1", description: "Store", qty: 1, unitMinor: 1000000 }],
  subtotalMinor: 1000000,
  discountMinor: 0,
  totalMinor: 1000000,
  schedule: M.DEFAULT_SCHEDULE,
  respondedAt: "2026-10-01T10:00:00.000Z",
  sentAt: "2026-09-30T10:00:00.000Z",
  validUntil: "2026-10-14T10:00:00.000Z",
  payState: { due: {} },
  tokenHash: "secret-hash",
  acceptedIpHash: "ip-hash",
  acceptedName: "Kofi Mensah",
};

describe("formatting", () => {
  it("formats money and dates", () => {
    expect(V.formatMoney(123456, "GHS")).toBe("GHS 1,234.56");
    expect(V.formatMoney(5, "USD")).toBe("USD 0.05");
    expect(V.formatDate("2026-10-01T23:30:00.000Z")).toBe("1 Oct 2026");
    expect(V.formatDate(null)).toBe("");
  });
  it("summarises the plan", () =>
    expect(V.planSummary(M.DEFAULT_SCHEDULE)).toBe("60% deposit, 40% balance"));
  it("falls back to 'there' for a missing first name", () => expect(V.firstName("")).toBe("there"));
});

describe("clientQuoteView", () => {
  it("never exposes secrets or internal evidence", () => {
    const stages = M.stageStates(quote, [], Date.parse("2026-10-02T00:00:00Z"));
    const view = V.clientQuoteView(quote, stages, { receiptSecret: "s" });
    const json = JSON.stringify(view);
    expect(json).not.toContain("secret-hash");
    expect(json).not.toContain("ip-hash");
    expect(view).not.toHaveProperty("id");
    expect(view.items[0]).toMatchObject({ lineMinor: 1000000 });
    expect(view.summary).toMatchObject({ paidMinor: 0, balanceMinor: 1000000, complete: false });
  });
  it("adds a signed receipt path to paid stages", () => {
    const payments = [
      { stageId: "deposit", status: "success", paystackReference: "Q-2026-0001-1-AAAAAAAA" },
    ];
    const stages = M.stageStates(quote, payments);
    const view = V.clientQuoteView(quote, stages, { receiptSecret: "s" });
    expect(view.stages[0].receiptPath).toMatch(/^\/receipt\/Q-2026-0001-1-AAAAAAAA\?s=.{32}$/);
    expect(view.stages[1].receiptPath).toBeNull();
  });
});

describe("adminQuoteView", () => {
  it("drops the token hash and IP hash", () => {
    const view = V.adminQuoteView(quote);
    expect(view).not.toHaveProperty("tokenHash");
    expect(view).not.toHaveProperty("acceptedIpHash");
    expect(view).toMatchObject({ id: "q1", hasLink: true });
  });
});

describe("email views", () => {
  it("builds the accepted view with the deposit invoice card", () => {
    const stages = M.stageStates(quote, []);
    const v = V.acceptedView(quote, "TOKEN", stages, "https://oceaniccoder.dev");
    expect(v.invoice).toMatchObject({
      invoiceNumber: "Q-2026-0001-INV-1",
      amount: "GHS 6,000.00",
      payLink: "https://oceaniccoder.dev/q/TOKEN/pay/deposit",
    });
  });
});
