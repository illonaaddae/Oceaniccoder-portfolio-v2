// @vitest-environment node
// Cosmos-specific behaviour of the quote repo. The behaviour it shares with
// fakes.js is in contract.test.js.
import { describe, it, expect, vi } from "vitest";
import { createRequire } from "module";

const { createCosmosQuoteRepo } = await import("./repo.cosmos.js");
const { paymentIdFor } = await import("../tokens.js");
const { createCosmosLocks } = await import("../locks.js");
const { createFakeCosmos } = await import("../fakeCosmos.js");
const { lockId } = await import("../tokens.js");

const SYSTEM_FIELDS = ["_rid", "_self", "_etag", "_attachments", "_ts"];

describe("paymentIdFor", () => {
  // Through Node's require, as repo.cosmos.js loads tokens.js: import() goes
  // through Vite and would give a second copy of the module.
  it("is still exported here, as the same function as tokens.paymentIdFor", () => {
    const require = createRequire(import.meta.url);
    expect(require("./repo.cosmos.js").paymentIdFor).toBe(require("../tokens.js").paymentIdFor);
  });
});

function setup() {
  const db = createFakeCosmos();
  const locks = createCosmosLocks(db);
  const repo = createCosmosQuoteRepo(db, { locks });
  return { db, locks, repo, quotes: db.container("quotes"), payments: db.container("payments") };
}

const conflict = () => Object.assign(new Error("Precondition Failed"), { code: 412 });

describe("Cosmos quote repo", () => {
  it("needs locks to reserve quote numbers", () => {
    expect(() => createCosmosQuoteRepo(createFakeCosmos())).toThrow(/needs locks/);
  });

  describe("reads", () => {
    it("strips Cosmos system fields on every read path", async () => {
      const { db, repo, quotes, payments } = setup();
      quotes.seed({ id: "q1", quoteNumber: "Q-2026-0001", tokenHash: "h", status: "accepted" });
      payments.seed({
        id: "p1",
        quoteNumber: "Q-2026-0001",
        kind: "quote",
        paystackReference: "R",
      });
      db.container("invoices").seed({ id: "inv1" });
      const rows = [
        await repo.get("q1"),
        await repo.findByTokenHash("h"),
        ...(await repo.list()),
        ...(await repo.listMaintenanceCandidates()),
        await repo.update("q1", { title: "x" }),
        await repo.getPayment("p1"),
        await repo.findPaymentByReference("R"),
        ...(await repo.listPayments("Q-2026-0001")),
        ...(await repo.listQuotePayments()),
        await repo.updatePayment("p1", { note: "n" }),
        await repo.getInvoice("inv1"),
        await repo.updateInvoice("inv1", { archivedAt: null }),
      ];
      expect(rows).toHaveLength(12);
      for (const row of rows) {
        for (const field of SYSTEM_FIELDS) expect(row).not.toHaveProperty(field);
      }
    });

    it("treats a thrown 404 as missing and rethrows other errors", async () => {
      const item = (read) => ({ container: () => ({ item: () => ({ read }) }) });
      const locks = { take: vi.fn(), release: vi.fn() };
      const gone = item(async () => {
        throw Object.assign(new Error("nf"), { code: 404 });
      });
      expect(await createCosmosQuoteRepo(gone, { locks }).get("q1")).toBeNull();
      const down = item(async () => {
        throw Object.assign(new Error("throttled"), { code: 429 });
      });
      await expect(createCosmosQuoteRepo(down, { locks }).get("q1")).rejects.toThrow("throttled");
    });

    it("returns null for an empty or non-string id without reading", async () => {
      const { repo, quotes } = setup();
      const read = vi.spyOn(quotes, "item");
      expect(await repo.get("")).toBeNull();
      expect(await repo.get(undefined)).toBeNull();
      expect(await repo.getPayment(42)).toBeNull();
      expect(read).not.toHaveBeenCalled();
    });

    it("parses JSON fields imported from Appwrite as strings", async () => {
      const { repo, quotes } = setup();
      quotes.seed({
        id: "q1",
        quoteNumber: "Q-2026-0001",
        items: '[{"id":"item-1"}]',
        payState: '{"due":{"s1":"2026-11-01"}}',
        extras: "not json",
        highlights: "",
      });
      const q = await repo.get("q1");
      expect(q.items).toEqual([{ id: "item-1" }]);
      expect(q.payState).toEqual({ due: { s1: "2026-11-01" } });
      expect(q.extras).toEqual({});
      expect(q.highlights).toEqual([]);
    });

    it("never shares fallback objects between reads", async () => {
      const { repo, quotes } = setup();
      quotes.seed({ id: "q1", quoteNumber: "Q-2026-0001" });
      const a = await repo.get("q1");
      a.payState.due.x = "mutated";
      a.items.push({ id: "leak" });
      const b = await repo.get("q1");
      expect(b.payState).toEqual({ due: {} });
      expect(b.items).toEqual([]);
    });

    it("lists rows without createdAt last instead of dropping them", async () => {
      const { repo, quotes } = setup();
      quotes.seed({ id: "none", quoteNumber: "Q-2026-0001" });
      quotes.seed({ id: "dated", quoteNumber: "Q-2026-0002", createdAt: "2026-10-01T00:00:00Z" });
      expect((await repo.list()).map((q) => q.id)).toEqual(["dated", "none"]);
    });
  });

  describe("SQL", () => {
    it("passes every value as a parameter", async () => {
      const { repo, quotes, payments } = setup();
      await repo.findByTokenHash("x' OR 1=1 --");
      await repo.listPayments('Q-2026-0001" OR true');
      await repo.listInvoicePayments("INV-1");
      await repo.findPaymentByReference("REF");
      await repo.create({}, 2026);
      await repo.listMaintenanceCandidates();
      const specs = [...quotes.queries, ...payments.queries];
      expect(specs.length).toBeGreaterThanOrEqual(6);
      for (const { query, parameters } of specs) {
        expect(query).not.toMatch(/['"]/);
        for (const name of query.match(/@[A-Za-z]+/g) || []) {
          expect(parameters.map((p) => p.name)).toContain(name);
        }
      }
      expect(quotes.queries[0]).toEqual({
        query: "SELECT TOP 1 * FROM c WHERE c.tokenHash = @hash",
        parameters: [{ name: "@hash", value: "x' OR 1=1 --" }],
      });
    });

    it("treats a missing maintenance date and null alike", async () => {
      const { repo, quotes } = setup();
      await repo.listMaintenanceCandidates();
      expect(quotes.queries[0].query).toContain(
        "(NOT IS_DEFINED(c.maintenanceOfferSentAt) OR IS_NULL(c.maintenanceOfferSentAt))",
      );
    });
  });

  describe("writes", () => {
    it("stores JSON fields as JSON, not strings", async () => {
      const { repo, quotes } = setup();
      const q = await repo.create({ items: [{ id: "i1" }], payState: { due: {} } }, 2026);
      expect(quotes.docs.get(q.id).items).toEqual([{ id: "i1" }]);
      await repo.update(q.id, { extras: { a: 1 } });
      expect(quotes.docs.get(q.id).extras).toEqual({ a: 1 });
    });

    it("keeps imported string JSON readable after an unrelated update", async () => {
      const { repo, quotes } = setup();
      quotes.seed({ id: "q1", quoteNumber: "Q-2026-0001", items: '[{"id":"i1"}]' });
      const updated = await repo.update("q1", { status: "sent" });
      expect(updated.items).toEqual([{ id: "i1" }]);
    });

    it("leaves a field alone when the patch value is undefined", async () => {
      const { repo, quotes } = setup();
      quotes.seed({ id: "q1", quoteNumber: "Q-2026-0001", note: "keep" });
      const updated = await repo.update("q1", { note: undefined, status: "sent" });
      expect(updated.note).toBe("keep");
      expect(quotes.docs.get("q1").note).toBe("keep");
    });

    it("replaces only if the row still has the etag it read", async () => {
      const { repo, quotes } = setup();
      quotes.seed({ id: "q1", quoteNumber: "Q-2026-0001" });
      const etag = quotes.docs.get("q1")._etag;
      const realItem = quotes.item.bind(quotes);
      const options = [];
      vi.spyOn(quotes, "item").mockImplementation((id, pk) => {
        const handle = realItem(id, pk);
        return {
          ...handle,
          replace: (body, opts) => {
            options.push(opts);
            return handle.replace(body, opts);
          },
        };
      });
      await repo.update("q1", { status: "sent" });
      expect(options).toEqual([{ accessCondition: { type: "IfMatch", condition: etag } }]);
    });

    it("rereads and retries when another writer changed the row", async () => {
      const { repo, quotes } = setup();
      quotes.seed({ id: "q1", quoteNumber: "Q-2026-0001", status: "accepted" });
      let calls = 0;
      quotes.hooks.beforeReplace = async () => {
        calls += 1;
        if (calls === 1) {
          // The webhook writes viewedAt between our read and our replace.
          const { _rid, _self, _etag, _attachments, _ts, ...current } = quotes.docs.get("q1");
          quotes.seed({ ...current, viewedAt: "2026-10-17T09:00:00.000Z" });
        }
      };
      const updated = await repo.update("q1", { maintenanceOfferSentAt: "2026-10-17" });
      expect(calls).toBe(2);
      expect(updated).toMatchObject({
        status: "accepted",
        viewedAt: "2026-10-17T09:00:00.000Z",
        maintenanceOfferSentAt: "2026-10-17",
      });
    });

    it("gives up with the 412 after three retries", async () => {
      const { repo, quotes } = setup();
      quotes.seed({ id: "q1", quoteNumber: "Q-2026-0001" });
      const replace = vi.fn(async () => {
        throw conflict();
      });
      quotes.hooks.beforeReplace = replace;
      await expect(repo.update("q1", { status: "sent" })).rejects.toMatchObject({ code: 412 });
      expect(replace).toHaveBeenCalledTimes(4);
    });

    it("waits a random moment of up to 50 ms before each retry", async () => {
      const { repo, quotes } = setup();
      quotes.seed({ id: "q1", quoteNumber: "Q-2026-0001" });
      quotes.hooks.beforeReplace = async () => {
        throw conflict();
      };
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const timer = vi.spyOn(globalThis, "setTimeout");
      try {
        await expect(repo.update("q1", { status: "sent" })).rejects.toMatchObject({ code: 412 });
        expect(timer.mock.calls.map(([, ms]) => ms)).toEqual([25, 25, 25]);
      } finally {
        vi.restoreAllMocks();
      }
    });

    it("does not retry other replace errors", async () => {
      const { repo, payments } = setup();
      payments.seed({ id: "p1", amount: 1 });
      const replace = vi.fn(async () => {
        throw Object.assign(new Error("too large"), { code: 413 });
      });
      payments.hooks.beforeReplace = replace;
      await expect(repo.updatePayment("p1", { note: "x" })).rejects.toThrow("too large");
      expect(replace).toHaveBeenCalledTimes(1);
    });

    it("updates an inquiry's status and ignores a missing inquiry", async () => {
      const { db, repo } = setup();
      db.container("project_inquiries").seed({ id: "i1", status: "new", name: "Ama" });
      await repo.setInquiryStatus("i1", "won");
      expect(db.container("project_inquiries").docs.get("i1")).toMatchObject({
        status: "won",
        name: "Ama",
      });
      await expect(repo.setInquiryStatus("gone", "won")).resolves.toBeUndefined();
    });
  });

  describe("quote numbers", () => {
    it("reserves each number with a lock", async () => {
      const { db, repo } = setup();
      const q = await repo.create({}, 2026);
      expect(q.quoteNumber).toBe("Q-2026-0001");
      expect(db.container("locks").docs.has(lockId("quoteNumber:Q-2026-0001"))).toBe(true);
    });

    it("gives admins creating at once different numbers", async () => {
      const { repo, quotes } = setup();
      quotes.seed({ id: "a", quoteNumber: "Q-2026-0007" });
      const created = await Promise.all([
        repo.create({ title: "one" }, 2026),
        repo.create({ title: "two" }, 2026),
        repo.create({ title: "three" }, 2026),
      ]);
      expect(created.map((q) => q.quoteNumber).sort()).toEqual([
        "Q-2026-0008",
        "Q-2026-0009",
        "Q-2026-0010",
      ]);
      expect(quotes.docs.size).toBe(4);
    });

    it("skips a number whose reservation is already taken", async () => {
      const { repo, locks } = setup();
      await locks.take("quoteNumber:Q-2026-0001");
      expect((await repo.create({}, 2026)).quoteNumber).toBe("Q-2026-0002");
    });

    it("gives up after five taken numbers", async () => {
      const { repo, locks, quotes } = setup();
      for (let n = 1; n <= 5; n++) await locks.take(`quoteNumber:Q-2026-000${n}`);
      await expect(repo.create({}, 2026)).rejects.toThrow("Could not allocate a quote number");
      expect(quotes.docs.size).toBe(0);
    });

    it("frees the number when the quote write fails", async () => {
      const { repo, locks, quotes } = setup();
      quotes.hooks.beforeCreate = async () => {
        throw Object.assign(new Error("throttled"), { code: 429 });
      };
      await expect(repo.create({}, 2026)).rejects.toThrow("throttled");
      expect(await locks.take("quoteNumber:Q-2026-0001")).toBe(true);
    });

    it("reports the write error even when freeing the number fails", async () => {
      const db = createFakeCosmos();
      const locks = {
        take: vi.fn().mockResolvedValue(true),
        release: vi.fn().mockRejectedValue(new Error("release failed")),
      };
      db.container("quotes").hooks.beforeCreate = async () => {
        throw new Error("write failed");
      };
      const repo = createCosmosQuoteRepo(db, { locks });
      await expect(repo.create({}, 2026)).rejects.toThrow("write failed");
      expect(locks.release).toHaveBeenCalledWith("quoteNumber:Q-2026-0001");
    });
  });

  describe("payments", () => {
    it("derives the id from the Paystack reference", async () => {
      const { repo } = setup();
      const p = await repo.createPayment({ kind: "quote", paystackReference: "REF-1" });
      expect(p.id).toBe(paymentIdFor("REF-1"));
      expect(p.id).toMatch(/^pi_[0-9a-f]{64}$/);
      const manual = await repo.createPayment({ kind: "quote" });
      expect(manual.id).toMatch(/^[0-9a-f]{20}$/);
    });

    it("refuses a second row for the same reference with 409", async () => {
      const { repo, payments } = setup();
      await repo.createPayment({ kind: "quote", paystackReference: "REF-1", status: "success" });
      await expect(
        repo.createPayment({ kind: "quote", paystackReference: "REF-1", status: "pending" }),
      ).rejects.toMatchObject({ code: 409 });
      expect(payments.docs.size).toBe(1);
      expect((await repo.findPaymentByReference("REF-1")).status).toBe("success");
    });

    it("finds a new row by point read, without a query", async () => {
      const { repo, payments } = setup();
      await repo.createPayment({ kind: "quote", paystackReference: "REF-1" });
      expect(await repo.findPaymentByReference("REF-1")).toMatchObject({
        paystackReference: "REF-1",
      });
      expect(payments.queries).toHaveLength(0);
    });

    it("finds an imported row with an Appwrite id by query", async () => {
      const { repo, payments } = setup();
      payments.seed({ id: "6801a2b3c4d5e6f7a8b9", kind: "quote", paystackReference: "OLD" });
      expect(await repo.findPaymentByReference("OLD")).toMatchObject({
        id: "6801a2b3c4d5e6f7a8b9",
      });
      expect(payments.queries[0].parameters).toEqual([{ name: "@reference", value: "OLD" }]);
    });

    it("returns null for an empty reference without reading", async () => {
      const { repo, payments } = setup();
      const item = vi.spyOn(payments, "item");
      expect(await repo.findPaymentByReference(undefined)).toBeNull();
      expect(await repo.findPaymentByReference("")).toBeNull();
      expect(item).not.toHaveBeenCalled();
      expect(payments.queries).toHaveLength(0);
    });
  });
});
