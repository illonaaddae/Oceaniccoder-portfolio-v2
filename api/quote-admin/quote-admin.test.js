// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { createHandler } = await import("./index.js");
const { createFakeRepo, createFakeLocks } = await import("../shared/quotes/fakes.js");
const M = await import("../shared/quotes/model.js");
const access = await import("../shared/quotes/access.js");

const NOW = new Date("2026-10-10T09:00:00.000Z");
const draft = {
  clientName: "Kofi Mensah",
  clientEmail: "kofi@example.com",
  currency: "GHS",
  title: "Online store",
  items: [{ id: "item-1", description: "Store build", qty: 1, unitMinor: 1000000 }],
  discountMinor: 0,
  schedule: M.DEFAULT_SCHEDULE,
  validDays: 14,
  inquiryId: "inq-1",
};

function setup({ admin = true, quotes = [], payments = [], invoices = [] } = {}) {
  const repo = createFakeRepo({ quotes, payments, invoices });
  const locks = createFakeLocks();
  const notify = {
    quoteSent: vi.fn().mockResolvedValue({ ok: true }),
    paymentRequest: vi.fn().mockResolvedValue({ ok: true }),
    paymentReceived: vi.fn().mockResolvedValue({ ok: true }),
    quoteEmailAgain: vi.fn().mockResolvedValue({ ok: true }),
  };
  const handler = createHandler({
    requireAdmin: async () =>
      admin ? { user: { email: "illona@oceaniccoder.dev" } } : { status: 401, error: "Sign in" },
    services: () => ({ repo, locks, notify, now: () => NOW }),
  });
  const call = async (body) => {
    const context = { log: { error: vi.fn(), info: vi.fn() } };
    await handler(context, { method: "POST", body, headers: {} });
    return { status: context.res.status, body: JSON.parse(context.res.body) };
  };
  return { repo, locks, notify, call };
}

async function sentQuote(t) {
  const created = await t.call({ action: "create", draft });
  const sent = await t.call({ action: "send", id: created.body.quote.id });
  return sent;
}

describe("quote-admin", () => {
  it("refuses callers who are not the admin", async () => {
    expect((await setup({ admin: false }).call({ action: "list" })).status).toBe(401);
  });

  it("rejects unknown actions", async () => {
    expect((await setup().call({ action: "explode" })).status).toBe(400);
  });

  it("creates a draft with server-computed totals", async () => {
    const r = await setup().call({ action: "create", draft: { ...draft, totalMinor: 1 } });
    expect(r.status).toBe(200);
    expect(r.body.quote).toMatchObject({
      status: "draft",
      revision: 1,
      totalMinor: 1000000,
      quoteNumber: "Q-2026-0001",
    });
    expect(r.body.stages.map((s) => s.amountMinor)).toEqual([600000, 400000]);
  });

  it("returns field errors for a bad draft", async () => {
    const r = await setup().call({
      action: "create",
      draft: { ...draft, schedule: [{ id: "a", label: "A", percent: 50 }] },
    });
    expect(r.status).toBe(400);
    expect(r.body.fields.schedule).toMatch(/100%/);
  });

  it("sends: issues a link, sets validity, marks the inquiry quoted and emails the client", async () => {
    const t = setup();
    const r = await sentQuote(t);
    expect(r.status).toBe(200);
    expect(r.body.link).toMatch(/^https:\/\/oceaniccoder\.dev\/q\/[A-Za-z0-9_-]{43}$/);
    expect(r.body.quote).toMatchObject({
      status: "sent",
      hasLink: true,
      validUntil: "2026-10-24T09:00:00.000Z",
    });
    expect(r.body.quote).not.toHaveProperty("tokenHash");
    expect(t.repo.inquiryStatus["inq-1"]).toBe("quoted");
    expect(t.notify.quoteSent).toHaveBeenCalledTimes(1);
    expect(r.body.emailed).toBe(true);
  });

  it("clientView previews a draft as the client page without sending it", async () => {
    const t = setup();
    const created = await t.call({ action: "create", draft });
    const r = await t.call({ action: "clientView", id: created.body.quote.id });
    expect(r.status).toBe(200);
    expect(r.body.quote).toMatchObject({
      quoteNumber: "Q-2026-0001",
      status: "draft",
      title: "Online store",
      totalMinor: 1000000,
      issuedAt: null,
      validUntil: null,
    });
    expect(r.body.quote.stages.map((s) => s.state)).toEqual(["later", "later"]);
    expect(r.body.quote).not.toHaveProperty("tokenHash");
    expect(r.body.quote).not.toHaveProperty("id");
    expect(r.body).not.toHaveProperty("link");
    expect(t.notify.quoteSent).not.toHaveBeenCalled();
    expect((await t.repo.get(created.body.quote.id)).status).toBe("draft");
  });

  it("clientView shows paid stages for an accepted quote and 404s for unknown ids", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    const id = sent.body.quote.id;
    await t.repo.update(id, { status: "accepted", respondedAt: NOW.toISOString() });
    await t.repo.createPayment({
      kind: "quote",
      quoteNumber: "Q-2026-0001",
      stageId: "deposit",
      status: "success",
      paystackReference: "Q-2026-0001-1-ABCDEFGH",
    });
    const r = await t.call({ action: "clientView", id });
    expect(r.status).toBe(200);
    expect(r.body.quote.status).toBe("accepted");
    expect(r.body.quote.issuedAt).toBe(NOW.toISOString());
    expect(r.body.quote.stages[0].state).toBe("paid");
    expect(r.body.quote.summary.paidMinor).toBe(600000);
    expect((await t.call({ action: "clientView", id: "nope" })).status).toBe(404);
  });

  it("only edits drafts", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    expect((await t.call({ action: "save", id: sent.body.quote.id, draft })).status).toBe(409);
  });

  it("revise returns to draft, bumps the revision and kills the link", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    const r = await t.call({ action: "revise", id: sent.body.quote.id });
    expect(r.body.quote).toMatchObject({ status: "draft", revision: 2, hasLink: false });
  });

  it("will not cancel a quote with a successful payment", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    const id = sent.body.quote.id;
    await t.repo.update(id, { status: "accepted", respondedAt: NOW.toISOString() });
    await t.repo.createPayment({
      kind: "quote",
      quoteNumber: "Q-2026-0001",
      stageId: "deposit",
      status: "success",
    });
    expect((await t.call({ action: "cancel", id })).status).toBe(409);
  });

  it("requests a later stage: marks it due, rotates the link and emails the invoice", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    const id = sent.body.quote.id;
    await t.repo.update(id, { status: "accepted", respondedAt: NOW.toISOString() });
    expect((await t.call({ action: "requestStage", id, stageId: "deposit" })).status).toBe(409);
    const r = await t.call({ action: "requestStage", id, stageId: "balance" });
    expect(r.status).toBe(200);
    expect(r.body.stages[1].state).toBe("due");
    expect(r.body.link).not.toBe(sent.body.link);
    expect(t.notify.paymentRequest).toHaveBeenCalledTimes(1);
  });

  it("records a manual payment once per stage", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    const id = sent.body.quote.id;
    await t.repo.update(id, { status: "accepted", respondedAt: NOW.toISOString() });
    const r = await t.call({
      action: "recordManual",
      id,
      stageId: "deposit",
      method: "bank",
      note: "GCB transfer",
    });
    expect(r.status).toBe(200);
    expect(r.body.stages[0].state).toBe("paid");
    expect(r.body.payments[0]).toMatchObject({
      method: "bank",
      status: "success",
      recordedBy: "illona@oceaniccoder.dev",
      amountMinor: 600000,
    });
    expect(t.notify.paymentReceived).toHaveBeenCalledTimes(1);
    expect(
      (await t.call({ action: "recordManual", id, stageId: "deposit", method: "bank" })).status,
    ).toBe(409);
    expect(
      (await t.call({ action: "recordManual", id, stageId: "balance", method: "card" })).status,
    ).toBe(400);
  });

  it("lists quotes with amounts paid", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    await t.repo.update(sent.body.quote.id, { status: "accepted", respondedAt: NOW.toISOString() });
    await t.repo.createPayment({
      kind: "quote",
      quoteNumber: "Q-2026-0001",
      stageId: "deposit",
      status: "success",
    });
    const r = await t.call({ action: "list" });
    expect(r.body.quotes[0]).toMatchObject({
      quoteNumber: "Q-2026-0001",
      paidMinor: 600000,
      nextDue: null,
    });
  });

  it("reports whether the payment receipt was emailed", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    const id = sent.body.quote.id;
    await t.repo.update(id, { status: "accepted", respondedAt: NOW.toISOString() });
    const r = await t.call({ action: "recordManual", id, stageId: "deposit", method: "cash" });
    expect(r.status).toBe(200);
    expect(r.body.emailed).toBe(true);
    expect(r.body.quote).toBeDefined();
  });

  it("refuses a manual payment while the stage lock is already held", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    const id = sent.body.quote.id;
    await t.repo.update(id, { status: "accepted", respondedAt: NOW.toISOString() });
    await t.locks.take(`stage:${id}:deposit`);
    const r = await t.call({ action: "recordManual", id, stageId: "deposit", method: "bank" });
    expect(r.status).toBe(409);
    expect(t.repo.payments.size).toBe(0);
  });

  it("holds the stage lock after a successful manual payment", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    const id = sent.body.quote.id;
    await t.repo.update(id, { status: "accepted", respondedAt: NOW.toISOString() });
    await t.call({ action: "recordManual", id, stageId: "deposit", method: "bank" });
    expect(t.locks.held.has(`stage:${id}:deposit`)).toBe(true);
  });

  it("releases the stage lock when the payment write fails", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    const id = sent.body.quote.id;
    await t.repo.update(id, { status: "accepted", respondedAt: NOW.toISOString() });
    const real = t.repo.createPayment;
    t.repo.createPayment = vi.fn().mockRejectedValueOnce(new Error("write failed"));
    const r = await t.call({ action: "recordManual", id, stageId: "deposit", method: "bank" });
    expect(r.status).toBe(500);
    expect(r.body.error).not.toContain("write failed");
    expect(t.locks.held.has(`stage:${id}:deposit`)).toBe(false);
    t.repo.createPayment = real;
  });

  it("rotates the link and replaces the stored token hash", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    const id = sent.body.quote.id;
    const before = t.repo.quotes.get(id).tokenHash;
    const r = await t.call({ action: "rotate", id });
    expect(r.status).toBe(200);
    expect(r.body.link).toMatch(/^https:\/\/oceaniccoder\.dev\/q\/[A-Za-z0-9_-]{43}$/);
    expect(r.body.link).not.toBe(sent.body.link);
    expect(t.repo.quotes.get(id).tokenHash).not.toBe(before);
  });

  describe("browsers unlocked with a code", () => {
    const SECRET = "s".repeat(32);

    async function unlockedQuote(t, status = "accepted") {
      const sent = await sentQuote(t);
      const id = sent.body.quote.id;
      await t.repo.update(id, { status, respondedAt: NOW.toISOString() });
      const quote = await t.repo.get(id);
      const epoch = await access.currentEpoch(t.locks, quote);
      const header = access.sessionCookie(SECRET, quote, epoch, NOW.getTime());
      const req = { headers: { cookie: header.split(";")[0] } };
      const stillOpen = async () =>
        access.hasAccess({
          secret: SECRET,
          locks: t.locks,
          req,
          quote: await t.repo.get(id),
          nowMs: NOW.getTime(),
        });
      expect(await stillOpen()).toBe(true);
      return { id, stillOpen };
    }

    it("are locked out by New link (rotate)", async () => {
      const t = setup();
      const { id, stillOpen } = await unlockedQuote(t);
      expect((await t.call({ action: "rotate", id })).status).toBe(200);
      expect(await stillOpen()).toBe(false);
    });

    it("are locked out by revise", async () => {
      const t = setup();
      const { id, stillOpen } = await unlockedQuote(t, "sent");
      expect((await t.call({ action: "revise", id })).status).toBe(200);
      expect(await stillOpen()).toBe(false);
    });

    it("stay unlocked through a payment request's fresh link", async () => {
      const t = setup();
      const { id, stillOpen } = await unlockedQuote(t);
      const r = await t.call({ action: "requestStage", id, stageId: "balance" });
      expect(r.status).toBe(200);
      expect(await stillOpen()).toBe(true);
    });

    it("stay unlocked through Email again to the same address, not a new one", async () => {
      const t = setup();
      const { id, stillOpen } = await unlockedQuote(t, "sent");
      expect((await t.call({ action: "emailAgain", id })).status).toBe(200);
      expect(await stillOpen()).toBe(true);
      const moved = { action: "emailAgain", id, to: "new@example.com", saveAddress: true };
      expect((await t.call(moved)).status).toBe(200);
      expect(await stillOpen()).toBe(false);
    });

    it("keep the old link when the lockout can't be written", async () => {
      const t = setup();
      const sent = await sentQuote(t);
      const id = sent.body.quote.id;
      const before = t.repo.quotes.get(id).tokenHash;
      t.locks.take = async () => {
        throw new Error("locks down");
      };
      expect((await t.call({ action: "rotate", id })).status).toBe(500);
      expect(t.repo.quotes.get(id).tokenHash).toBe(before);
    });
  });

  describe("emailAgain", () => {
    const addresses = (t) => t.notify.quoteEmailAgain.mock.calls.map((c) => c[3]);

    it("emails the client again with a fresh link that replaces the old one", async () => {
      const t = setup();
      const sent = await sentQuote(t);
      const id = sent.body.quote.id;
      const before = t.repo.quotes.get(id).tokenHash;
      const r = await t.call({ action: "emailAgain", id });
      expect(r.status).toBe(200);
      expect(r.body.link).toMatch(/^https:\/\/oceaniccoder\.dev\/q\/[A-Za-z0-9_-]{43}$/);
      expect(r.body.link).not.toBe(sent.body.link);
      expect(t.repo.quotes.get(id).tokenHash).not.toBe(before);
      expect(addresses(t)).toEqual(["kofi@example.com"]);
      expect(r.body).toMatchObject({
        emailed: true,
        emailedTo: ["kofi@example.com"],
        failedTo: [],
      });
    });

    it("also sends to another address, one email each, without saving it", async () => {
      const t = setup();
      const id = (await sentQuote(t)).body.quote.id;
      const r = await t.call({ action: "emailAgain", id, to: " Prince_Ofori@Hotmail.com " });
      expect(r.status).toBe(200);
      expect(addresses(t)).toEqual(["kofi@example.com", "prince_ofori@hotmail.com"]);
      expect(t.repo.quotes.get(id).clientEmail).toBe("kofi@example.com");
      expect(r.body.quote.clientEmail).toBe("kofi@example.com");
    });

    it("saves the other address as the client's email when asked", async () => {
      const t = setup();
      const id = (await sentQuote(t)).body.quote.id;
      const r = await t.call({
        action: "emailAgain",
        id,
        to: "prince_ofori@hotmail.com",
        saveAddress: true,
      });
      expect(r.status).toBe(200);
      expect(addresses(t)).toEqual(["kofi@example.com", "prince_ofori@hotmail.com"]);
      expect(t.repo.quotes.get(id).clientEmail).toBe("prince_ofori@hotmail.com");
    });

    it("sends once when the other address is the client's own", async () => {
      const t = setup();
      const id = (await sentQuote(t)).body.quote.id;
      await t.call({ action: "emailAgain", id, to: "KOFI@example.com" });
      expect(addresses(t)).toEqual(["kofi@example.com"]);
    });

    it("works for an accepted quote", async () => {
      const t = setup();
      const id = (await sentQuote(t)).body.quote.id;
      await t.repo.update(id, { status: "accepted", respondedAt: NOW.toISOString() });
      const r = await t.call({ action: "emailAgain", id });
      expect(r.status).toBe(200);
      expect(t.notify.quoteEmailAgain.mock.calls[0][0].status).toBe("accepted");
    });

    it("refuses drafts and a bad address, and leaves the link alone", async () => {
      const t = setup();
      const created = await t.call({ action: "create", draft });
      expect((await t.call({ action: "emailAgain", id: created.body.quote.id })).status).toBe(409);

      const id = (await sentQuote(t)).body.quote.id;
      const before = t.repo.quotes.get(id).tokenHash;
      const bad = await t.call({ action: "emailAgain", id, to: "not-an-email" });
      expect(bad.status).toBe(400);
      const noAddress = await t.call({ action: "emailAgain", id, saveAddress: true });
      expect(noAddress.status).toBe(400);
      expect(t.repo.quotes.get(id).tokenHash).toBe(before);
      expect(t.notify.quoteEmailAgain).not.toHaveBeenCalled();
    });

    it("refuses a sent quote that has passed its valid-until date", async () => {
      const t = setup();
      const id = (await sentQuote(t)).body.quote.id;
      await t.repo.update(id, { validUntil: "2026-10-01T09:00:00.000Z" });
      const before = t.repo.quotes.get(id).tokenHash;
      const r = await t.call({ action: "emailAgain", id });
      expect(r.status).toBe(409);
      expect(r.body.error).toMatch(/expired/i);
      expect(t.repo.quotes.get(id).tokenHash).toBe(before);
    });

    it("refuses an accepted quote with nothing due, leaving the link alone", async () => {
      const t = setup();
      const id = (await sentQuote(t)).body.quote.id;
      await t.repo.update(id, { status: "accepted", respondedAt: NOW.toISOString() });
      await t.repo.createPayment({
        quoteNumber: "Q-2026-0001",
        stageId: "deposit",
        status: "success",
        paidAt: NOW.toISOString(),
      });
      const before = t.repo.quotes.get(id).tokenHash;
      const r = await t.call({ action: "emailAgain", id });
      expect(r.status).toBe(409);
      expect(r.body.error).toMatch(/nothing is due/i);
      expect(t.repo.quotes.get(id).tokenHash).toBe(before);
      expect(t.notify.quoteEmailAgain).not.toHaveBeenCalled();
    });

    it("refuses an address longer than 254 characters instead of cutting it short", async () => {
      const t = setup();
      const id = (await sentQuote(t)).body.quote.id;
      const long = `${"a".repeat(250)}@b.co`;
      expect((await t.call({ action: "emailAgain", id, to: long })).status).toBe(400);
      expect(t.notify.quoteEmailAgain).not.toHaveBeenCalled();
    });

    it("reports which addresses the email failed to reach", async () => {
      const t = setup();
      const id = (await sentQuote(t)).body.quote.id;
      t.notify.quoteEmailAgain.mockImplementation(async (_q, _t, _s, address) =>
        address === "kofi@example.com" ? { ok: true } : { ok: false, error: "bounced" },
      );
      const r = await t.call({ action: "emailAgain", id, to: "prince_ofori@hotmail.com" });
      expect(r.status).toBe(200);
      expect(r.body).toMatchObject({
        emailed: false,
        emailedTo: ["kofi@example.com"],
        failedTo: ["prince_ofori@hotmail.com"],
      });
    });
  });

  it("returns 404 for an unknown quote id", async () => {
    expect((await setup().call({ action: "get", id: "missing" })).status).toBe(404);
  });

  it("returns 404 for an unknown stage id", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    const id = sent.body.quote.id;
    await t.repo.update(id, { status: "accepted", respondedAt: NOW.toISOString() });
    expect((await t.call({ action: "requestStage", id, stageId: "nope" })).status).toBe(404);
  });
});

describe("quote-admin archive and restore", () => {
  const attempt = (over = {}) => ({
    id: "p1",
    kind: "quote",
    quoteNumber: "Q-2026-0001",
    stageId: "deposit",
    status: "pending",
    ...over,
  });

  it.each([
    ["pending", {}],
    ["abandoned", {}],
    ["failed before checkout (no Paystack id)", { status: "failed", note: "initialize: down" }],
    ["failed by Paystack", { status: "failed", paystackId: "99", note: "Paystack: Declined" }],
  ])("archives a %s attempt", async (name, over) => {
    const t = setup({ payments: [attempt({ status: name, ...over })] });
    const r = await t.call({ action: "archivePayment", id: "p1" });
    expect(r.status).toBe(200);
    expect(r.body.payment).toEqual({ id: "p1", archivedAt: NOW.toISOString() });
    expect(t.repo.payments.get("p1").archivedAt).toBe(NOW.toISOString());
  });

  it.each([
    ["successful", { status: "success" }],
    ["duplicate (refund owed)", { status: "duplicate", paystackId: "99" }],
    ["refunded", { status: "refunded", paystackId: "99" }],
    ["underpaid capture", { status: "failed", paystackId: "99", note: "underpaid" }],
    [
      "currency mismatch capture",
      { status: "failed", paystackId: "99", note: "currency-mismatch" },
    ],
    ["mode mismatch", { status: "failed", paystackId: "99", note: "mode-mismatch" }],
  ])("refuses to archive a %s payment", async (_name, over) => {
    const t = setup({ payments: [attempt(over)] });
    const r = await t.call({ action: "archivePayment", id: "p1" });
    expect(r.status).toBe(409);
    expect(r.body.error).toMatch(/can't be archived/i);
    expect(t.repo.payments.get("p1").archivedAt).toBeUndefined();
  });

  it("undoes the archive when the row was settled between the read and the write", async () => {
    const t = setup({ payments: [attempt()] });
    const realUpdate = t.repo.updatePayment.bind(t.repo);
    // The webhook settles the row just before the archive write lands.
    t.repo.updatePayment = vi.fn(async (id, patch) => {
      if (patch.archivedAt) t.repo.payments.get(id).status = "success";
      return realUpdate(id, patch);
    });
    const r = await t.call({ action: "archivePayment", id: "p1" });
    expect(r.status).toBe(409);
    expect(t.repo.payments.get("p1")).toMatchObject({ status: "success", archivedAt: null });
  });

  it("refuses to archive a part-paid invoice but allows one with only failed attempts", async () => {
    const t = setup({
      invoices: [
        { id: "inv1", invoiceNumber: "INV-2026-0042", status: "sent" },
        { id: "inv2", invoiceNumber: "INV-2026-0043", status: "sent" },
      ],
      payments: [
        { id: "p1", invoiceNumber: "INV-2026-0042", status: "success", amount: 100 },
        { id: "p2", invoiceNumber: "INV-2026-0043", status: "failed" },
      ],
    });
    const r = await t.call({ action: "archiveInvoice", id: "inv1" });
    expect(r.status).toBe(409);
    expect(r.body.error).toMatch(/payment recorded against it/i);
    expect(t.repo.invoices.get("inv1").archivedAt).toBeUndefined();
    expect((await t.call({ action: "archiveInvoice", id: "inv2" })).status).toBe(200);
  });

  it("archives an invoice with no invoice number without querying its payments", async () => {
    const t = setup({ invoices: [{ id: "inv1", status: "sent" }] });
    const lookup = vi.spyOn(t.repo, "listInvoicePayments");
    const r = await t.call({ action: "archiveInvoice", id: "inv1" });
    expect(r.status).toBe(200);
    expect(lookup).not.toHaveBeenCalled();
    // The fake behaves like Appwrite for an undefined value.
    await expect(t.repo.listInvoicePayments(undefined)).rejects.toMatchObject({ code: 400 });
  });

  it("refuses to archive a paid invoice, including one paid mid-archive", async () => {
    const paid = setup({ invoices: [{ id: "inv1", status: "paid" }] });
    const r = await paid.call({ action: "archiveInvoice", id: "inv1" });
    expect(r.status).toBe(409);
    expect(r.body.error).toMatch(/paid invoices can't be archived/i);
    expect(paid.repo.invoices.get("inv1").archivedAt).toBeUndefined();

    const racing = setup({ invoices: [{ id: "inv1", status: "sent" }] });
    const realUpdate = racing.repo.updateInvoice.bind(racing.repo);
    racing.repo.updateInvoice = vi.fn(async (id, patch) => {
      if (patch.archivedAt) racing.repo.invoices.get(id).status = "paid";
      return realUpdate(id, patch);
    });
    expect((await racing.call({ action: "archiveInvoice", id: "inv1" })).status).toBe(409);
    expect(racing.repo.invoices.get("inv1")).toMatchObject({ status: "paid", archivedAt: null });
  });

  it("treats a legacy row with no status as successful and refuses to archive it", async () => {
    const t = setup({ payments: [attempt({ status: undefined })] });
    expect((await t.call({ action: "archivePayment", id: "p1" })).status).toBe(409);
  });

  it("restores an archived payment", async () => {
    const t = setup({ payments: [attempt({ archivedAt: "2026-10-01T00:00:00.000Z" })] });
    const r = await t.call({ action: "restorePayment", id: "p1" });
    expect(r.status).toBe(200);
    expect(r.body.payment).toEqual({ id: "p1", archivedAt: null });
    expect(t.repo.payments.get("p1").archivedAt).toBeNull();
  });

  it("archives and restores a one-off invoice", async () => {
    const t = setup({ invoices: [{ id: "inv1", invoiceNumber: "INV-2026-0042", status: "sent" }] });
    const archived = await t.call({ action: "archiveInvoice", id: "inv1" });
    expect(archived.status).toBe(200);
    expect(archived.body.invoice).toEqual({ id: "inv1", archivedAt: NOW.toISOString() });
    const restored = await t.call({ action: "restoreInvoice", id: "inv1" });
    expect(restored.body.invoice).toEqual({ id: "inv1", archivedAt: null });
    expect(t.repo.invoices.get("inv1")).toMatchObject({ status: "sent", archivedAt: null });
  });

  it.each(["archivePayment", "restorePayment", "archiveInvoice", "restoreInvoice"])(
    "%s returns 404 for an unknown id and 400 for a missing or unsafe one",
    async (action) => {
      const t = setup();
      const getPayment = vi.spyOn(t.repo, "getPayment");
      const getInvoice = vi.spyOn(t.repo, "getInvoice");
      expect((await t.call({ action, id: "nope" })).status).toBe(404);
      const bad = [undefined, "", "../quotes/q1", "a/b", "x?y=1", "-lead", "a".repeat(37), 42];
      for (const id of bad) expect((await t.call({ action, id })).status).toBe(400);
      // Only the well-formed id reached the repo.
      expect(getPayment.mock.calls.length + getInvoice.mock.calls.length).toBe(1);
    },
  );

  it("keeps stage state unchanged after archiving an attempt", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    const id = sent.body.quote.id;
    await t.repo.update(id, { status: "accepted", respondedAt: NOW.toISOString() });
    await t.repo.createPayment(attempt({ id: undefined }));
    const before = await t.call({ action: "get", id });
    const paymentId = [...t.repo.payments.keys()][0];
    await t.call({ action: "archivePayment", id: paymentId });
    const after = await t.call({ action: "get", id });
    expect(after.body.stages).toEqual(before.body.stages);
  });
});
