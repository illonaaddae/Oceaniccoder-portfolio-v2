// @vitest-environment node
// The quote repo contract, run against the in-memory fake every function test
// uses (fakes.js) and against the Cosmos repo on a fake Cosmos database. If
// the two disagree, function tests that pass on the fake prove nothing about
// Cosmos.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { createFakeRepo } = await import("./fakes.js");
const { createCosmosQuoteRepo } = await import("./repo.cosmos.js");
const { createCosmosLocks } = await import("../locks.js");
const { createFakeCosmos } = await import("../fakeCosmos.js");

const IMPLEMENTATIONS = {
  "fakes.js": (seed) => createFakeRepo(seed),
  "repo.cosmos.js": ({ quotes = [], payments = [], invoices = [] } = {}) => {
    const db = createFakeCosmos();
    for (const q of quotes) db.container("quotes").seed(q);
    for (const p of payments) db.container("payments").seed(p);
    for (const i of invoices) db.container("invoices").seed(i);
    return createCosmosQuoteRepo(db, { locks: createCosmosLocks(db) });
  },
};

const DEFAULTS = {
  items: [],
  schedule: [],
  payState: { due: {} },
  highlights: [],
  runningCosts: [],
  optionalItems: [],
  extras: {},
};

describe.each(Object.entries(IMPLEMENTATIONS))("quote repo contract: %s", (_name, makeRepo) => {
  let clock = Date.parse("2026-10-17T09:00:00.000Z");
  const tick = () => vi.setSystemTime((clock += 1000));

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    tick();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("quotes", () => {
    it("returns null for a missing quote", async () => {
      const repo = makeRepo();
      expect(await repo.get("nope")).toBeNull();
      expect(await repo.findByTokenHash("nope")).toBeNull();
    });

    it("fills every JSON field default when it is missing or null", async () => {
      const repo = makeRepo({
        quotes: [{ id: "q1", quoteNumber: "Q-2026-0001", items: null, tokenHash: "h1" }],
      });
      expect(await repo.get("q1")).toMatchObject({ id: "q1", ...DEFAULTS });
      expect(await repo.findByTokenHash("h1")).toMatchObject({ id: "q1", ...DEFAULTS });
    });

    it("returns stored JSON fields as they were written", async () => {
      const repo = makeRepo();
      const created = await repo.create(
        {
          items: [{ id: "i1", qty: 2 }],
          payState: { due: { s1: "2026-11-01" } },
          extras: { needs: { intro: "Send early" } },
        },
        2026,
      );
      const read = await repo.get(created.id);
      expect(read.items).toEqual([{ id: "i1", qty: 2 }]);
      expect(read.payState).toEqual({ due: { s1: "2026-11-01" } });
      expect(read.extras).toEqual({ needs: { intro: "Send early" } });
      expect(read.highlights).toEqual([]);
    });

    it("lists quotes newest first", async () => {
      const repo = makeRepo({
        quotes: [
          { id: "old", quoteNumber: "Q-2026-0001", createdAt: "2026-10-01T00:00:00.000Z" },
          { id: "new", quoteNumber: "Q-2026-0002", createdAt: "2026-10-02T00:00:00.000Z" },
        ],
      });
      expect((await repo.list()).map((q) => q.id)).toEqual(["new", "old"]);
    });

    it("numbers after the highest number of the same year", async () => {
      const repo = makeRepo({
        quotes: [
          { id: "a", quoteNumber: "Q-2026-0003" },
          { id: "b", quoteNumber: "Q-2025-0009" },
        ],
      });
      const first = await repo.create({ title: "Shop" }, 2026);
      expect(first).toMatchObject({ quoteNumber: "Q-2026-0004", title: "Shop", ...DEFAULTS });
      expect(typeof first.id).toBe("string");
      expect(typeof first.createdAt).toBe("string");
      expect((await repo.create({}, 2026)).quoteNumber).toBe("Q-2026-0005");
      expect((await repo.create({}, 2025)).quoteNumber).toBe("Q-2025-0010");
      expect((await repo.create({}, 2027)).quoteNumber).toBe("Q-2027-0001");
    });

    it("never takes id fields or a quote number from the caller on create", async () => {
      const repo = makeRepo();
      const q = await repo.create({ id: "mine", createdAt: "1999-01-01T00:00:00.000Z" }, 2026);
      expect(q.id).not.toBe("mine");
      expect(q.createdAt).not.toBe("1999-01-01T00:00:00.000Z");
    });

    it("update merges, keeps id and createdAt, and returns the stored row", async () => {
      const repo = makeRepo({
        quotes: [
          {
            id: "q1",
            quoteNumber: "Q-2026-0001",
            status: "draft",
            title: "Shop",
            createdAt: "2026-10-01T00:00:00.000Z",
          },
        ],
      });
      tick();
      const updated = await repo.update("q1", {
        id: "other",
        $id: "zzz",
        createdAt: "1999-01-01T00:00:00.000Z",
        status: "sent",
        payState: { due: { s1: "t" } },
      });
      expect(updated).toMatchObject({
        id: "q1",
        quoteNumber: "Q-2026-0001",
        title: "Shop",
        status: "sent",
        payState: { due: { s1: "t" } },
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: new Date().toISOString(),
      });
      expect(updated.$id).toBeUndefined();
      expect(await repo.get("q1")).toEqual(updated);
    });

    it("update writes null over a field", async () => {
      const repo = makeRepo({
        quotes: [{ id: "q1", quoteNumber: "Q-2026-0001", archivedAt: "2026-10-01" }],
      });
      expect((await repo.update("q1", { archivedAt: null })).archivedAt).toBeNull();
    });

    it("update rejects a missing quote with code 404", async () => {
      await expect(makeRepo().update("nope", { status: "sent" })).rejects.toMatchObject({
        code: 404,
      });
    });

    it("lists accepted quotes whose maintenance offer is missing or null", async () => {
      const repo = makeRepo({
        quotes: [
          { id: "missing", quoteNumber: "Q-2026-0001", status: "accepted" },
          {
            id: "null",
            quoteNumber: "Q-2026-0002",
            status: "accepted",
            maintenanceOfferSentAt: null,
          },
          {
            id: "sent",
            quoteNumber: "Q-2026-0003",
            status: "accepted",
            maintenanceOfferSentAt: "2026-10-01T00:00:00.000Z",
          },
          { id: "draft", quoteNumber: "Q-2026-0004", status: "draft" },
        ],
      });
      const ids = (await repo.listMaintenanceCandidates()).map((q) => q.id).sort();
      expect(ids).toEqual(["missing", "null"]);
    });
  });

  describe("payments", () => {
    it("fills amountMinor from amount on create, update and reads", async () => {
      const repo = makeRepo({ payments: [{ id: "old", quoteNumber: "Q-2026-0001", amount: 7 }] });
      const p = await repo.createPayment({ quoteNumber: "Q-2026-0001", amount: 12.5 });
      expect(p.amountMinor).toBe(1250);
      expect((await repo.updatePayment(p.id, { amount: 3 })).amountMinor).toBe(300);
      const explicit = await repo.createPayment({ quoteNumber: "Q-2026-0001", amountMinor: 99 });
      expect(explicit.amountMinor).toBe(99);
      expect((await repo.getPayment("old")).amountMinor).toBe(700);
    });

    it("lists a quote's payments and all quote payments newest first", async () => {
      const repo = makeRepo();
      const first = await repo.createPayment({ quoteNumber: "Q-2026-0001", kind: "quote" });
      tick();
      const second = await repo.createPayment({ quoteNumber: "Q-2026-0001", kind: "quote" });
      tick();
      await repo.createPayment({ quoteNumber: "Q-2026-0002", kind: "quote" });
      tick();
      const invoice = await repo.createPayment({ invoiceNumber: "INV-1", kind: "invoice" });
      expect((await repo.listPayments("Q-2026-0001")).map((p) => p.id)).toEqual([
        second.id,
        first.id,
      ]);
      const quoteRows = await repo.listQuotePayments();
      expect(quoteRows).toHaveLength(3);
      expect(quoteRows.map((p) => p.id)).not.toContain(invoice.id);
      expect(quoteRows[0].quoteNumber).toBe("Q-2026-0002");
    });

    it("finds a payment by its Paystack reference, or null", async () => {
      const repo = makeRepo();
      const p = await repo.createPayment({ kind: "quote", paystackReference: "Q-2026-0001-1-AB" });
      expect(await repo.findPaymentByReference("Q-2026-0001-1-AB")).toMatchObject({ id: p.id });
      expect(await repo.findPaymentByReference("missing")).toBeNull();
    });

    it("finds a seeded payment by reference", async () => {
      const repo = makeRepo({
        payments: [{ id: "appwrite1", kind: "quote", paystackReference: "OLD-REF", amount: 1 }],
      });
      expect(await repo.findPaymentByReference("OLD-REF")).toMatchObject({
        id: "appwrite1",
        amountMinor: 100,
      });
    });

    it("returns null for a missing payment and 404s its update", async () => {
      const repo = makeRepo();
      expect(await repo.getPayment("nope")).toBeNull();
      await expect(repo.updatePayment("nope", { status: "failed" })).rejects.toMatchObject({
        code: 404,
      });
    });

    it("lists an invoice's payments and refuses a missing invoice number", async () => {
      const repo = makeRepo();
      await repo.createPayment({ invoiceNumber: "INV-1", amount: 5 });
      await repo.createPayment({ invoiceNumber: "INV-2", amount: 6 });
      const rows = await repo.listInvoicePayments("INV-1");
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ invoiceNumber: "INV-1", amountMinor: 500 });
      await expect(repo.listInvoicePayments(undefined)).rejects.toMatchObject({ code: 400 });
    });
  });

  describe("invoices and inquiries", () => {
    it("reads and updates an invoice, null and 404 when missing", async () => {
      const repo = makeRepo({
        invoices: [{ id: "inv1", invoiceNumber: "INV-1", status: "sent", archivedAt: "x" }],
      });
      expect(await repo.getInvoice("nope")).toBeNull();
      const updated = await repo.updateInvoice("inv1", { archivedAt: null });
      expect(updated).toMatchObject({ id: "inv1", invoiceNumber: "INV-1", archivedAt: null });
      expect(await repo.getInvoice("inv1")).toMatchObject({ archivedAt: null, status: "sent" });
      await expect(repo.updateInvoice("nope", {})).rejects.toMatchObject({ code: 404 });
    });

    it("never fails a quote action on an inquiry status write", async () => {
      const repo = makeRepo();
      await expect(repo.setInquiryStatus(null, "won")).resolves.toBeUndefined();
      await expect(repo.setInquiryStatus("missing", "won")).resolves.toBeUndefined();
    });
  });
});
