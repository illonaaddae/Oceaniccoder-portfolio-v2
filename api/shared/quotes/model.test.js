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

describe("full-proposal fields", () => {
  const base = {
    clientName: "Kofi",
    currency: "GHS",
    title: "Store",
    items: [
      {
        id: "i1",
        description: "Build",
        qty: 1,
        unitMinor: 100000,
        detail: "  Pages and checkout  ",
      },
    ],
    schedule: [
      { id: "deposit", label: "Deposit", percent: 60, note: " To start " },
      { id: "balance", label: "Balance", percent: 40 },
    ],
  };

  it("keeps trimmed item details and stage notes, empty when blank", () => {
    const r = M.validateDraft({
      ...base,
      items: [
        { ...base.items[0] },
        { id: "i2", description: "Hosting", qty: 1, unitMinor: 0, detail: "   " },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.value.items[0].detail).toBe("Pages and checkout");
    expect(r.value.items[1].detail).toBe("");
    expect(r.value.schedule[0].note).toBe("To start");
    expect(r.value.schedule[1].note).toBe("");
  });

  it("drops empty highlight and running-cost rows and limits them", () => {
    const r = M.validateDraft({
      ...base,
      highlights: ["Live in 14 weeks", " ", "You own it"],
      runningCosts: [
        { service: "Appwrite", purpose: "Hosting", cost: "USD 25/month" },
        { service: "", purpose: "", cost: "" },
      ],
    });
    expect(r.value.highlights).toEqual(["Live in 14 weeks", "You own it"]);
    expect(r.value.runningCosts).toHaveLength(1);
    expect(
      M.validateDraft({ ...base, highlights: ["a", "b", "c", "d", "e"] }).errors.highlights,
    ).toMatch(/4/);
  });

  it("flags a half-filled running cost row instead of dropping it", () => {
    const r = M.validateDraft({
      ...base,
      runningCosts: [{ service: "", purpose: "", cost: "USD 25" }],
    });
    expect(r.errors["runningCosts.0.service"]).toBeDefined();
  });

  it("reports running-cost errors at the editor row, not the filtered position", () => {
    const r = M.validateDraft({
      ...base,
      runningCosts: [
        { service: "", purpose: "", cost: "" },
        { service: "Vercel", purpose: "", cost: "" },
      ],
    });
    expect(r.errors["runningCosts.1.cost"]).toBeDefined();
    expect(r.errors["runningCosts.0.cost"]).toBeUndefined();
    expect(r.value.runningCosts).toEqual([{ service: "Vercel", purpose: "", cost: "" }]);
  });

  it("reports optional-item errors at the editor row, not the filtered position", () => {
    const r = M.validateDraft({
      ...base,
      optionalItems: [
        { id: "o1", description: "", qty: 1, unitMinor: 0 },
        { id: "o2", description: "SMS", qty: 1, unitMinor: 250000 },
        { id: "o3", description: "", qty: 1, unitMinor: 5000 },
      ],
    });
    expect(r.errors["optionalItems.2.description"]).toBeDefined();
    expect(r.errors["optionalItems.1.description"]).toBeUndefined();
    expect(r.value.optionalItems.map((i) => i.id)).toEqual(["o2", "o3"]);
  });

  it("never lets optional items change the price", () => {
    const withOpt = M.validateDraft({
      ...base,
      optionalItems: [{ id: "o1", description: "SMS", qty: 1, unitMinor: 250000 }],
    });
    const plain = M.validateDraft(base);
    expect(M.computeTotals(withOpt.value.items, 0)).toEqual(M.computeTotals(plain.value.items, 0));
    expect(M.optionalTotals(withOpt.value.optionalItems).optionalTotalMinor).toBe(250000);
  });

  it("applies the text limits", () => {
    const r = M.validateDraft({
      ...base,
      discountLabel: "x".repeat(61),
      exclusions: "x".repeat(3001),
      optionalTitle: "x".repeat(81),
    });
    expect(r.errors.discountLabel).toBeDefined();
    expect(r.errors.exclusions).toBeDefined();
    expect(r.errors.optionalTitle).toBeDefined();
  });

  it("reads a quote saved before these fields existed", () => {
    const r = M.validateDraft(base);
    expect(r.value).toMatchObject({
      highlights: [],
      runningCosts: [],
      optionalItems: [],
      exclusions: "",
      discountLabel: "",
    });
  });
});
