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
  clientPhone: "+233000000000",
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
  $permissions: ['read("any")'],
  $collectionId: "quotes-collection",
  $databaseId: "oc-database",
  someFutureField: "future-leak",
};

const CLIENT_KEYS = [
  "highlights",
  "extras",
  "discountLabel",
  "runningCosts",
  "exclusions",
  "assumptions",
  "nextSteps",
  "optionalTitle",
  "optionalItems",
  "optionalTotalMinor",
  "acceptedName",
  "clientCompany",
  "clientEmail",
  "clientName",
  "contact",
  "currency",
  "discountMinor",
  "issuedAt",
  "items",
  "notes",
  "overview",
  "quoteNumber",
  "respondedAt",
  "revision",
  "scope",
  "stages",
  "status",
  "subtotalMinor",
  "summary",
  "terms",
  "timeline",
  "title",
  "totalMinor",
  "validUntil",
];

const CLIENT_STAGE_KEYS = [
  "note",
  "amountMinor",
  "dueAt",
  "dueBy",
  "id",
  "index",
  "invoiceNumber",
  "label",
  "overdue",
  "paidAt",
  "percent",
  "receiptPath",
  "state",
];

const ADMIN_KEYS = [
  "highlights",
  "extras",
  "discountLabel",
  "runningCosts",
  "exclusions",
  "assumptions",
  "nextSteps",
  "optionalTitle",
  "optionalItems",
  "acceptedName",
  "acceptedUa",
  "clientCompany",
  "clientEmail",
  "clientName",
  "clientPhone",
  "createdAt",
  "currency",
  "declineReason",
  "discountMinor",
  "hasLink",
  "id",
  "inquiryId",
  "items",
  "notes",
  "overview",
  "payState",
  "quoteNumber",
  "requirementsId",
  "maintenanceOfferSentAt",
  "respondedAt",
  "revision",
  "schedule",
  "scope",
  "sentAt",
  "status",
  "subtotalMinor",
  "terms",
  "timeline",
  "title",
  "totalMinor",
  "updatedAt",
  "validDays",
  "validUntil",
  "viewedAt",
];

const sorted = (xs) => [...xs].sort();

describe("formatting", () => {
  it("formats money and dates", () => {
    expect(V.formatMoney(123456, "GHS")).toBe("GHS 1,234.56");
    expect(V.formatMoney(5, "USD")).toBe("USD 0.05");
    expect(V.formatDate("2026-10-01T23:30:00.000Z")).toBe("1 Oct 2026");
    expect(V.formatDate(null)).toBe("");
  });
  it("returns an empty string for an invalid date instead of throwing", () => {
    expect(V.formatDate("not-a-date")).toBe("");
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
    expect(json).not.toContain("future-leak");
    expect(json).not.toContain("+233000000000");
    expect(json).not.toContain("$permissions");
    expect(json).not.toContain("quotes-collection");
    expect(json).not.toContain("oc-database");
    expect(view).not.toHaveProperty("id");
    expect(view.items[0]).toMatchObject({ lineMinor: 1000000 });
    expect(view.summary).toMatchObject({ paidMinor: 0, balanceMinor: 1000000, complete: false });
  });
  it("has an exact top-level key set", () => {
    const stages = M.stageStates(quote, []);
    const view = V.clientQuoteView(quote, stages, { receiptSecret: "s" });
    expect(sorted(Object.keys(view))).toEqual(sorted(CLIENT_KEYS));
  });
  it("has an exact stage key set", () => {
    const stages = M.stageStates(quote, []);
    const view = V.clientQuoteView(quote, stages, { receiptSecret: "s" });
    expect(sorted(Object.keys(view.stages[0]))).toEqual(sorted(CLIENT_STAGE_KEYS));
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
  it("is an explicit whitelist: exact key set, no stray or $-metadata fields", () => {
    const view = V.adminQuoteView(quote);
    expect(sorted(Object.keys(view))).toEqual(sorted(ADMIN_KEYS));
    const json = JSON.stringify(view);
    expect(json).not.toContain("secret-hash");
    expect(json).not.toContain("ip-hash");
    expect(json).not.toContain("future-leak");
    expect(json).not.toContain("$permissions");
    expect(json).not.toContain("$collectionId");
    expect(json).not.toContain("$databaseId");
  });
  it("keeps the key set stable when optional fields are missing", () => {
    const view = V.adminQuoteView({ id: "bare" });
    expect(sorted(Object.keys(view))).toEqual(sorted(ADMIN_KEYS));
    expect(view).toMatchObject({ id: "bare", clientPhone: null, acceptedUa: null, hasLink: false });
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
  it("flags a one-stage quote so emails skip the deposit wording", () => {
    const one = { ...quote, schedule: [{ id: "full", label: "Full payment", percent: 100 }] };
    expect(V.quoteSentView(one, "TOKEN").singleStage).toBe(true);
    expect(V.quoteSentView(quote, "TOKEN").singleStage).toBe(false);
    const stages = M.stageStates(one, []);
    expect(V.acceptedView(one, "TOKEN", stages).singleStage).toBe(true);
    expect(V.acceptedView(quote, "TOKEN", M.stageStates(quote, [])).singleStage).toBe(false);
  });
  it("sets invoice to null when the quote has no stages", () => {
    const v = V.acceptedView(quote, "TOKEN", [], "https://oceaniccoder.dev");
    expect(v.invoice).toBeNull();
  });
  it("clamps the balance after a payment at zero", () => {
    const payments = [
      { stageId: "deposit", status: "success", paystackReference: "Q-2026-0001-1-AAAAAAAA" },
      { stageId: "balance", status: "success", paystackReference: "Q-2026-0001-2-BBBBBBBB" },
    ];
    const stages = M.stageStates(quote, payments);
    const v = V.requestView(quote, stages[0], "TOKEN", stages, "https://oceaniccoder.dev");
    expect(v.balanceAfter).toBe("GHS 0.00");
  });
  it("builds the access-code view without the client's email", () => {
    const v = V.accessCodeView(quote, "004217", 10);
    expect(v).toEqual({
      clientFirstName: "Kofi",
      quoteNumber: "Q-2026-0001",
      code: "004217",
      minutes: 10,
    });
  });
  it("builds the lockout alert view with the date and dashboard link", () => {
    const v = V.accessLockedView(quote, "2026-10-20T09:00:00.000Z", "https://oceaniccoder.dev");
    expect(v).toMatchObject({
      clientName: "Kofi Mensah",
      quoteNumber: "Q-2026-0001",
      lockedOn: "20 Oct 2026",
      adminLink: "https://oceaniccoder.dev/admin/dashboard",
    });
    expect(JSON.stringify(v)).not.toContain("kofi@example.com");
  });
});

describe("payment method label", () => {
  const stages = M.stageStates({ ...quote, status: "accepted" }, [], Date.now());
  const pay = (over) => ({
    stageId: stages[0].id,
    amountMinor: 100,
    currency: "GHS",
    paystackReference: "R",
    paidAt: "2026-10-11T00:00:00Z",
    ...over,
  });

  it("names the Mobile Money network on the receipt when the client picked one", () => {
    expect(V.receiptView(quote, pay({ method: "momo", note: "network:mtn" }), stages).method).toBe(
      "Mobile Money (MTN)",
    );
    expect(
      V.receiptView(quote, pay({ method: "momo", note: "network:telecel" }), stages).method,
    ).toBe("Mobile Money (Telecel)");
  });

  it("falls back to the plain method name", () => {
    expect(V.receiptView(quote, pay({ method: "momo" }), stages).method).toBe("Mobile Money");
    expect(V.receiptView(quote, pay({ method: "card", note: "x" }), stages).method).toBe("Card");
  });
});

describe("summarize invoices", () => {
  it("lists issued stage invoices (due or paid) for the Invoices tab", () => {
    const q = { ...quote, id: "q1", status: "accepted" };
    const stages = M.stageStates(q, [], Date.now()).map((s, i) =>
      i === 0 ? { ...s, state: "paid", paidAt: "2026-10-11T19:01:48Z" } : s,
    );
    const s = V.summarize(q, stages);
    expect(s.invoices).toHaveLength(1);
    expect(s.clientEmail).toBe(q.clientEmail || "");
    expect(s.invoices[0].issuedAt).toBe(stages[0].dueAt);
    expect(s.invoices[0]).toMatchObject({
      stageId: stages[0].id,
      invoiceNumber: stages[0].invoiceNumber,
      label: stages[0].label,
      amountMinor: stages[0].amountMinor,
      state: "paid",
      paidAt: "2026-10-11T19:01:48Z",
    });
  });

  it("carries the dates, inquiry link and decline reason Analytics needs", () => {
    const declined = {
      ...quote,
      id: "q1",
      status: "declined",
      createdAt: "2026-09-29T08:00:00.000Z",
      inquiryId: "inq-1",
      declineReason: "Went with a cheaper quote",
    };
    const s = V.summarize(declined, M.stageStates(declined, [], Date.now()));
    expect(s).toMatchObject({
      createdAt: "2026-09-29T08:00:00.000Z",
      respondedAt: "2026-10-01T10:00:00.000Z",
      validUntil: "2026-10-14T10:00:00.000Z",
      inquiryId: "inq-1",
      declineReason: "Went with a cheaper quote",
    });
    // Still a whitelist: secrets and client contact details stay out.
    expect(s).not.toHaveProperty("tokenHash");
    expect(s).not.toHaveProperty("acceptedIpHash");
    expect(s).not.toHaveProperty("clientPhone");
  });

  it("reads the new fields as null on quotes that never had them", () => {
    const draft = { id: "q2", quoteNumber: "Q-2026-0002", status: "draft", schedule: [] };
    expect(V.summarize(draft, [])).toMatchObject({
      createdAt: null,
      respondedAt: null,
      validUntil: null,
      inquiryId: null,
      declineReason: null,
    });
  });

  it("has no invoices before any stage is requested", () => {
    const later = M.stageStates({ ...quote, status: "sent" }, [], Date.now());
    expect(V.summarize({ ...quote, id: "q1" }, later).invoices).toEqual([]);
  });

  it("shows optional extras with a display-only total and reads old quotes as empty", () => {
    const q = {
      ...quote,
      optionalItems: [{ id: "o1", description: "SMS", qty: 2, unitMinor: 100, detail: "Opt-in" }],
    };
    const v = V.clientQuoteView(q, M.stageStates(q, []), { receiptSecret: "s" });
    expect(v.optionalTotalMinor).toBe(200);
    expect(v.optionalItems[0]).toMatchObject({ lineMinor: 200, detail: "Opt-in" });
    expect(v.totalMinor).toBe(quote.totalMinor);
    const old = V.clientQuoteView(quote, M.stageStates(quote, []), { receiptSecret: "s" });
    expect(old).toMatchObject({
      highlights: [],
      runningCosts: [],
      optionalItems: [],
      optionalTotalMinor: 0,
      discountLabel: "",
    });
    expect(old.items[0].detail).toBe("");
    expect(old.stages[0].note).toBe("");
  });
});

describe("needs tables in the views", () => {
  const needs = {
    intro: "Send these early.",
    secretNote: "admin-only-leak",
    groups: [
      {
        id: "g1",
        title: "Accounts",
        intro: "",
        detailLabel: "Notes",
        internal: "group-leak",
        rows: [{ id: "r1", item: "Domain access", detail: "", when: "Week 1", extra: "row-leak" }],
        footnote: "You keep control.",
      },
    ],
  };
  const q = { ...quote, extras: { needs, futureKey: { plan: "later-key-leak" } } };

  it("shows each group and row field by field to the client", () => {
    const v = V.clientQuoteView(q, M.stageStates(q, []), { receiptSecret: "s" });
    expect(v.extras).toEqual({
      needs: {
        intro: "Send these early.",
        groups: [
          {
            id: "g1",
            title: "Accounts",
            intro: "",
            detailLabel: "Notes",
            rows: [{ id: "r1", item: "Domain access", detail: "", when: "Week 1" }],
            footnote: "You keep control.",
          },
        ],
      },
      maintenance: null,
    });
    const json = JSON.stringify(v);
    for (const leak of ["admin-only-leak", "group-leak", "row-leak", "later-key-leak"])
      expect(json).not.toContain(leak);
  });

  it("gives the admin the same needs and old quotes an empty value", () => {
    expect(V.adminQuoteView(q).extras).toEqual(
      V.clientQuoteView(q, M.stageStates(q, []), { receiptSecret: "s" }).extras,
    );
    expect(V.adminQuoteView(quote).extras).toEqual({ needs: null, maintenance: null });
    expect(V.clientQuoteView(quote, M.stageStates(quote, [])).extras).toEqual({
      needs: null,
      maintenance: null,
    });
  });
});

describe("maintenance in the views", () => {
  const maintenance = {
    freeDays: 30,
    freeText: "Any defect found is fixed at no cost.",
    secret: "maint-leak",
    plans: [
      {
        id: "care",
        name: "Care",
        priceMinor: 40000,
        period: "month",
        includes: "- Updates\nMonitoring\n\n",
        cost: "plan-leak",
      },
      { id: "plus", name: "Care Plus", priceMinor: 900000, period: "year", includes: "" },
    ],
    note: "Optional.",
  };
  const q = { ...quote, extras: { maintenance } };

  it("shows the section field by field and is the same for the admin", () => {
    const v = V.clientQuoteView(q, M.stageStates(q, []), { receiptSecret: "s" });
    expect(v.extras.maintenance).toEqual({
      freeDays: 30,
      freeText: "Any defect found is fixed at no cost.",
      plans: [
        {
          id: "care",
          name: "Care",
          priceMinor: 40000,
          period: "month",
          includes: "- Updates\nMonitoring\n\n",
        },
        { id: "plus", name: "Care Plus", priceMinor: 900000, period: "year", includes: "" },
      ],
      note: "Optional.",
    });
    const json = JSON.stringify(v);
    expect(json).not.toContain("maint-leak");
    expect(json).not.toContain("plan-leak");
    expect(V.adminQuoteView(q).extras.maintenance).toEqual(v.extras.maintenance);
  });

  it("is null when neither a free period nor a plan is set", () => {
    const empty = { ...quote, extras: { maintenance: { freeDays: 0, plans: [], note: "x" } } };
    expect(V.adminQuoteView(empty).extras.maintenance).toBeNull();
  });

  it("gives the admin the sent time and the offer timing", () => {
    const sent = { ...q, maintenanceOfferSentAt: "2026-12-03T08:00:00.000Z" };
    expect(V.adminQuoteView(sent).maintenanceOfferSentAt).toBe("2026-12-03T08:00:00.000Z");
    const payments = [
      { status: "success", stageId: "deposit", paidAt: "2026-10-02T00:00:00.000Z" },
      { status: "success", stageId: "balance", paidAt: "2026-11-10T09:00:00.000Z" },
    ];
    const due = { ...sent, payState: { due: { balance: "2026-11-01T00:00:00.000Z" } } };
    expect(V.maintenanceOfferState(due, M.stageStates(due, payments))).toEqual({
      launchedAt: "2026-11-10T09:00:00.000Z",
      dueAt: "2026-12-03T09:00:00.000Z",
      sentAt: "2026-12-03T08:00:00.000Z",
    });
    expect(V.maintenanceOfferState(q, M.stageStates(q, []))).toBeNull();
  });

  it("builds the offer email view with formatted prices, lines and WhatsApp", () => {
    const payments = [
      { status: "success", stageId: "deposit", paidAt: "2026-10-02T00:00:00.000Z" },
      { status: "success", stageId: "balance", paidAt: "2026-11-10T09:00:00.000Z" },
    ];
    const done = { ...q, payState: { due: { balance: "2026-11-01T00:00:00.000Z" } } };
    const stages = M.stageStates(done, payments);
    const v = V.maintenanceOfferEmailView(done, stages, {
      now: new Date("2026-12-03T09:00:00.000Z"),
      whatsapp: V.whatsappLink("+233 24 123 4567"),
    });
    expect(v).toMatchObject({
      clientFirstName: "Kofi",
      freeEnds: "10 Dec 2026",
      freeEnded: false,
      whatsappLink: "https://wa.me/233241234567",
      note: "Optional.",
    });
    expect(v.plans[0]).toEqual({
      name: "Care",
      price: "GHS 400.00",
      period: "month",
      includes: ["Updates", "Monitoring"],
    });
    expect(v.plans[1].period).toBe("year");
    const later = V.maintenanceOfferEmailView(done, stages, {
      now: new Date("2026-12-20T00:00:00.000Z"),
      whatsapp: "",
    });
    expect(later).toMatchObject({ freeEnded: true, whatsappLink: "" });
    expect(V.whatsappLink("")).toBe("");
  });
});
