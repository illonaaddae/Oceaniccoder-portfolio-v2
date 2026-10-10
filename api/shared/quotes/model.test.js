// @vitest-environment node
import { describe, it, expect } from "vitest";

const M = await import("./model.js");

const item = (over = {}) => ({
  id: "item-1",
  description: "Website",
  qty: 1,
  unitMinor: 10000,
  ...over,
});
const draft = (over = {}) => ({
  clientName: "Kofi Mensah",
  clientEmail: "kofi@example.com",
  currency: "GHS",
  title: "Online store",
  items: [item()],
  discountMinor: 0,
  schedule: M.DEFAULT_SCHEDULE,
  validDays: 14,
  ...over,
});

describe("totals", () => {
  it("rounds each line and clamps the discount to the subtotal", () => {
    expect(M.computeTotals([item({ qty: 1.5, unitMinor: 333 })], 0)).toEqual({
      subtotalMinor: 500,
      discountMinor: 0,
      totalMinor: 500,
    });
    expect(M.computeTotals([item()], 99999).totalMinor).toBe(0);
  });
});

describe("stageAmounts", () => {
  it("puts the rounding remainder on the last stage so parts sum to the total", () => {
    const stages = M.stageAmounts(10001, M.DEFAULT_SCHEDULE);
    expect(stages.map((s) => s.amountMinor)).toEqual([6000, 4001]);
    const three = M.stageAmounts(100, [
      { id: "a", label: "A", percent: 33 },
      { id: "b", label: "B", percent: 33 },
      { id: "c", label: "C", percent: 34 },
    ]);
    expect(three.reduce((t, s) => t + s.amountMinor, 0)).toBe(100);
  });
});

describe("scheduleError", () => {
  it.each([
    [[], /between 1 and 8/],
    [[{ id: "a", label: "A", percent: 50 }], /add up to 50%/],
    [
      [
        { id: "a", label: "A", percent: 60 },
        { id: "a", label: "B", percent: 40 },
      ],
      /unique id/,
    ],
    [[{ id: "a", label: "", percent: 100 }], /name/],
    [
      [
        { id: "a", label: "A", percent: 99.5 },
        { id: "b", label: "B", percent: 0.5 },
      ],
      /whole percentage/,
    ],
  ])("rejects %j", (schedule, msg) => {
    expect(M.scheduleError(schedule)).toMatch(msg);
  });
  it("accepts the default", () => expect(M.scheduleError(M.DEFAULT_SCHEDULE)).toBeNull());
});

describe("validateDraft", () => {
  it("accepts a good draft and trims strings", () => {
    const r = M.validateDraft(draft({ clientName: "  Kofi  " }));
    expect(r.ok).toBe(true);
    expect(r.value.clientName).toBe("Kofi");
  });
  it("reports field errors", () => {
    const r = M.validateDraft(draft({ currency: "EUR", items: [], title: "" }));
    expect(r.ok).toBe(false);
    expect(Object.keys(r.errors)).toEqual(expect.arrayContaining(["currency", "items", "title"]));
  });
  it("rejects a discount above the subtotal", () => {
    expect(M.validateDraft(draft({ discountMinor: 20000 })).errors.discountMinor).toBeTruthy();
  });
  it("rejects a non-integer price", () => {
    expect(
      M.validateDraft(draft({ items: [item({ unitMinor: 10.5 })] })).errors["items.0.unitMinor"],
    ).toBeTruthy();
  });
});

describe("sendError", () => {
  it("needs a client email and a total above zero", () => {
    expect(M.sendError({ clientEmail: "", totalMinor: 100 })).toMatch(/email/);
    expect(M.sendError({ clientEmail: "a@b.co", totalMinor: 0 })).toMatch(/total/);
    expect(M.sendError({ clientEmail: "a@b.co", totalMinor: 100 })).toBeNull();
  });
});

describe("canMove", () => {
  it("follows the move table", () => {
    expect(M.canMove("draft", "sent")).toBe(true);
    expect(M.canMove("accepted", "draft")).toBe(false);
    expect(M.canMove("cancelled", "draft")).toBe(false);
  });
});

describe("stageStates", () => {
  const base = {
    quoteNumber: "Q-2026-0001",
    status: "accepted",
    totalMinor: 10000,
    schedule: M.DEFAULT_SCHEDULE,
    respondedAt: "2026-10-01T10:00:00.000Z",
    payState: { due: {} },
  };
  const now = Date.parse("2026-10-03T10:00:00.000Z");

  it("makes the first stage due on acceptance and the rest later", () => {
    const [deposit, balance] = M.stageStates(base, [], now);
    expect(deposit).toMatchObject({
      state: "due",
      amountMinor: 6000,
      invoiceNumber: "Q-2026-0001-INV-1",
      overdue: false,
    });
    expect(balance).toMatchObject({ state: "later", dueAt: null });
  });
  it("marks paid stages and requested stages", () => {
    const quote = { ...base, payState: { due: { balance: "2026-10-02T00:00:00.000Z" } } };
    const payments = [
      {
        stageId: "deposit",
        status: "success",
        paidAt: "2026-10-01T11:00:00.000Z",
        paystackReference: "R1",
      },
    ];
    const [deposit, balance] = M.stageStates(quote, payments, now);
    expect(deposit).toMatchObject({ state: "paid", reference: "R1" });
    expect(balance.state).toBe("due");
  });
  it("flags a due stage as overdue after 7 days", () => {
    const later = Date.parse("2026-10-09T10:00:01.000Z");
    expect(M.stageStates(base, [], later)[0].overdue).toBe(true);
  });
  it("ignores failed and pending payments", () => {
    const payments = [
      { stageId: "deposit", status: "pending" },
      { stageId: "deposit", status: "failed" },
    ];
    expect(M.stageStates(base, payments, now)[0].state).toBe("due");
  });
  it("shows everything as later before acceptance", () => {
    expect(
      M.stageStates({ ...base, status: "sent" }, [], now).every((s) => s.state === "later"),
    ).toBe(true);
  });
});

describe("paymentSummary", () => {
  it("adds paid stages and finds the next due one", () => {
    const stages = [
      { id: "deposit", amountMinor: 6000, state: "paid" },
      { id: "balance", amountMinor: 4000, state: "due" },
    ];
    expect(M.paymentSummary(stages)).toMatchObject({
      paidMinor: 6000,
      balanceMinor: 4000,
      complete: false,
      nextDue: stages[1],
    });
  });
});

describe("numbers", () => {
  it("formats quote, invoice and reference numbers", () => {
    expect(M.quoteNumber(2026, 7)).toBe("Q-2026-0007");
    expect(M.invoiceNumber("Q-2026-0007", 1)).toBe("Q-2026-0007-INV-2");
    expect(M.paymentReference("Q-2026-0007", 0)).toMatch(/^Q-2026-0007-1-[A-Z2-9]{8}$/);
  });
});

describe("isExpired", () => {
  it("only expires sent quotes past validUntil", () => {
    const now = Date.parse("2026-10-10T00:00:00Z");
    expect(M.isExpired({ status: "sent", validUntil: "2026-10-09T00:00:00Z" }, now)).toBe(true);
    expect(M.isExpired({ status: "accepted", validUntil: "2026-10-09T00:00:00Z" }, now)).toBe(
      false,
    );
  });
});
