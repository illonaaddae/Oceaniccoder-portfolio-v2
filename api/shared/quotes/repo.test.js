// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { createQuoteRepo } = await import("./repo.js");
const { createLocks } = await import("../locks.js");

function conflict() {
  return Object.assign(new Error("exists"), { code: 409 });
}

describe("quote repo", () => {
  it("parses JSON fields and exposes id", async () => {
    const db = {
      getDocument: vi.fn().mockResolvedValue({
        $id: "q1",
        $createdAt: "2026-10-10T00:00:00Z",
        items: '[{"id":"item-1"}]',
        schedule: "[]",
        payState: null,
      }),
    };
    const q = await createQuoteRepo(db).get("q1");
    expect(q).toMatchObject({
      id: "q1",
      items: [{ id: "item-1" }],
      schedule: [],
      payState: { due: {} },
    });
  });

  it("parses the full-proposal JSON fields and defaults them when absent", async () => {
    const db = {
      getDocument: vi.fn().mockResolvedValue({
        $id: "q1",
        highlights: '["Live in 14 weeks"]',
        runningCosts: '[{"service":"Appwrite","purpose":"Hosting","cost":"USD 25"}]',
        optionalItems: '[{"id":"o1","description":"SMS"}]',
        extras: '{"needs":{"intro":"Send early","groups":[]}}',
      }),
    };
    const q = await createQuoteRepo(db).get("q1");
    expect(q.highlights).toEqual(["Live in 14 weeks"]);
    expect(q.runningCosts[0].service).toBe("Appwrite");
    expect(q.optionalItems[0].description).toBe("SMS");
    expect(q.extras).toEqual({ needs: { intro: "Send early", groups: [] } });
    db.getDocument.mockResolvedValue({ $id: "q2" });
    const old = await createQuoteRepo(db).get("q2");
    expect(old).toMatchObject({ highlights: [], runningCosts: [], optionalItems: [], extras: {} });
  });

  it("lists accepted quotes whose maintenance offer is not sent", async () => {
    const db = {
      listDocuments: vi.fn().mockResolvedValue({
        documents: [{ $id: "q1", status: "accepted", extras: '{"maintenance":{"freeDays":30}}' }],
      }),
    };
    const list = await createQuoteRepo(db).listMaintenanceCandidates();
    expect(list[0]).toMatchObject({ id: "q1", extras: { maintenance: { freeDays: 30 } } });
    const queries = JSON.stringify(db.listDocuments.mock.calls[0][2]);
    expect(queries).toContain("isNull");
    expect(queries).toContain("maintenanceOfferSentAt");
    expect(queries).toContain("accepted");
  });

  it("returns null for a missing quote", async () => {
    const db = {
      getDocument: vi.fn().mockRejectedValue(Object.assign(new Error("nf"), { code: 404 })),
    };
    expect(await createQuoteRepo(db).get("nope")).toBeNull();
  });

  it("allocates the next number and retries on a unique conflict", async () => {
    const db = {
      listDocuments: vi.fn().mockResolvedValue({ documents: [{ quoteNumber: "Q-2026-0004" }] }),
      createDocument: vi
        .fn()
        .mockRejectedValueOnce(conflict())
        .mockImplementation(async (_d, _c, _id, data) => ({ $id: "new", ...data })),
    };
    const q = await createQuoteRepo(db).create(
      { items: [], schedule: [], payState: { due: {} } },
      2026,
    );
    expect(db.createDocument).toHaveBeenCalledTimes(2);
    expect(db.createDocument.mock.calls[0][3].quoteNumber).toBe("Q-2026-0005");
    expect(q.quoteNumber).toBe("Q-2026-0006");
    expect(typeof db.createDocument.mock.calls[1][3].items).toBe("string");
  });

  it("serialises JSON fields on update and never writes id fields", async () => {
    const db = {
      updateDocument: vi
        .fn()
        .mockImplementation(async (_d, _c, id, data) => ({ $id: id, ...data })),
    };
    await createQuoteRepo(db).update("q1", {
      id: "x",
      payState: { due: { b: "t" } },
      status: "accepted",
    });
    const written = db.updateDocument.mock.calls[0][3];
    expect(written).toEqual({ payState: '{"due":{"b":"t"}}', status: "accepted" });
  });

  it("fills amountMinor from amount for older payment rows", async () => {
    const db = {
      listDocuments: vi.fn().mockResolvedValue({ documents: [{ $id: "p1", amount: 12.5 }] }),
    };
    const [p] = await createQuoteRepo(db).listPayments("Q-2026-0001");
    expect(p).toMatchObject({ id: "p1", amountMinor: 1250 });
  });

  it("ignores inquiry status failures", async () => {
    const db = { updateDocument: vi.fn().mockRejectedValue(new Error("no attr")) };
    await expect(createQuoteRepo(db).setInquiryStatus("i1", "won")).resolves.toBeUndefined();
    await createQuoteRepo(db).setInquiryStatus(null, "won");
    expect(db.updateDocument).toHaveBeenCalledTimes(1);
  });
});

describe("quote repo paging", () => {
  const docs = (prefix, from, count, extra = {}) =>
    Array.from({ length: count }, (_, i) => ({ $id: `${prefix}${from + i}`, ...extra }));
  const queriesOf = (db, call) => db.listDocuments.mock.calls[call][2].map(String);

  it("list follows the cursor past 100 quotes, newest first", async () => {
    const db = {
      listDocuments: vi
        .fn()
        .mockResolvedValueOnce({ documents: docs("q", 1, 100, { items: "[]" }) })
        .mockResolvedValueOnce({ documents: docs("q", 101, 100) })
        .mockResolvedValueOnce({ documents: docs("q", 201, 7) }),
    };
    const quotes = await createQuoteRepo(db).list();
    expect(quotes).toHaveLength(207);
    expect(quotes[0]).toMatchObject({ id: "q1", items: [] });
    expect(db.listDocuments).toHaveBeenCalledTimes(3);
    expect(db.listDocuments.mock.calls[0][1]).toBe("quotes");
    expect(queriesOf(db, 0)).toContain('{"method":"orderDesc","attribute":"$createdAt"}');
    expect(queriesOf(db, 0).join()).not.toContain("cursorAfter");
    expect(queriesOf(db, 1)).toContain('{"method":"cursorAfter","values":["q100"]}');
    expect(queriesOf(db, 2)).toContain('{"method":"cursorAfter","values":["q200"]}');
  });

  it("listQuotePayments keeps the kind filter on every page and reads past 500", async () => {
    const db = { listDocuments: vi.fn() };
    for (let page = 0; page < 6; page++) {
      db.listDocuments.mockResolvedValueOnce({
        documents: docs("p", page * 100 + 1, 100, { amount: 1 }),
      });
    }
    db.listDocuments.mockResolvedValueOnce({ documents: docs("p", 601, 1, { amount: 1 }) });
    const payments = await createQuoteRepo(db).listQuotePayments();
    expect(payments).toHaveLength(601);
    expect(payments[600]).toMatchObject({ id: "p601", amountMinor: 100 });
    for (let call = 0; call < 7; call++) {
      expect(db.listDocuments.mock.calls[call][1]).toBe("payments");
      expect(queriesOf(db, call)).toContain(
        '{"method":"equal","attribute":"kind","values":["quote"]}',
      );
    }
  });

  it("stops after one read when the first page is short", async () => {
    const db = { listDocuments: vi.fn().mockResolvedValue({ documents: docs("q", 1, 3) }) };
    expect(await createQuoteRepo(db).list()).toHaveLength(3);
    expect(db.listDocuments).toHaveBeenCalledTimes(1);
  });

  it("stops at the 5,000-row safety cap and warns", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    let next = 1;
    const db = {
      listDocuments: vi.fn(async (_d, _c, queries) => {
        const limit = JSON.parse(queries.find((q) => String(q).includes('"limit"'))).values[0];
        const page = docs("q", next, limit);
        next += limit;
        return { documents: page };
      }),
    };
    expect(await createQuoteRepo(db).list()).toHaveLength(5000);
    expect(db.listDocuments).toHaveBeenCalledTimes(50);
    expect(warn.mock.calls[0][0]).toMatch(/stopped at 5000 rows in "quotes"/);
    warn.mockRestore();
  });
});

describe("locks", () => {
  it("takes a lock once", async () => {
    const db = {
      createDocument: vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(conflict()),
    };
    const locks = createLocks(db);
    expect(await locks.take("settle:R1")).toBe(true);
    expect(await locks.take("settle:R1")).toBe(false);
    expect(db.createDocument.mock.calls[0][2]).toMatch(/^s_[0-9a-f]{34}$/);
  });
  it("rethrows other errors and tolerates releasing a missing lock", async () => {
    const db = {
      createDocument: vi.fn().mockRejectedValue(new Error("down")),
      deleteDocument: vi.fn().mockRejectedValue(Object.assign(new Error("nf"), { code: 404 })),
    };
    await expect(createLocks(db).take("k")).rejects.toThrow("down");
    await expect(createLocks(db).release("k")).resolves.toBe(false);
  });
  it("reports whether release deleted the lock", async () => {
    const db = { deleteDocument: vi.fn().mockResolvedValue({}) };
    expect(await createLocks(db).release("k")).toBe(true);
  });
  it("reads whether a lock is held without creating it", async () => {
    const notFound = Object.assign(new Error("nf"), { code: 404 });
    const db = {
      getDocument: vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(notFound),
      createDocument: vi.fn(),
    };
    const locks = createLocks(db);
    expect(await locks.has("qa:epoch:q1:1:1")).toBe(true);
    expect(await locks.has("qa:epoch:q1:1:2")).toBe(false);
    expect(db.getDocument.mock.calls[0][2]).toMatch(/^s_[0-9a-f]{34}$/);
    expect(db.createDocument).not.toHaveBeenCalled();
  });
  it("lists locks created before a time, following the cursor", async () => {
    const page = (n, start) =>
      Array.from({ length: n }, (_, i) => ({
        $id: `s_${start + i}`,
        key: `qa:try:c:${start + i}`,
        $createdAt: "2026-10-01T00:00:00.000Z",
      }));
    const db = {
      listDocuments: vi
        .fn()
        .mockResolvedValueOnce({ documents: page(100, 0) })
        .mockResolvedValueOnce({ documents: page(3, 100) }),
    };
    const rows = await createLocks(db).listBefore("2026-10-20T00:00:00.000Z");
    expect(rows).toHaveLength(103);
    expect(rows[0]).toEqual({ key: "qa:try:c:0", createdAt: "2026-10-01T00:00:00.000Z" });
    expect(db.listDocuments).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(db.listDocuments.mock.calls[1][2])).toContain("s_99");
  });
  it("stops listing locks at the cap", async () => {
    const db = {
      listDocuments: vi.fn().mockResolvedValue({
        documents: Array.from({ length: 5 }, (_, i) => ({ $id: `s_${i}`, key: `k${i}` })),
      }),
    };
    expect(await createLocks(db).listBefore("2026-10-20T00:00:00.000Z", 5)).toHaveLength(5);
    expect(db.listDocuments).toHaveBeenCalledTimes(1);
  });
  it("rethrows a failed read", async () => {
    const db = { getDocument: vi.fn().mockRejectedValue(new Error("down")) };
    await expect(createLocks(db).has("k")).rejects.toThrow("down");
  });
});

describe("quote repo, additional paths", () => {
  it("does not share fallback objects between reads", async () => {
    const db = {
      getDocument: vi.fn().mockResolvedValue({ $id: "q1", payState: null, items: "not json" }),
    };
    const repo = createQuoteRepo(db);
    const a = await repo.get("q1");
    a.payState.due.x = "mutated";
    a.items.push({ id: "leak" });
    const b = await repo.get("q1");
    expect(b.payState).toEqual({ due: {} });
    expect(b.items).toEqual([]);
  });

  it("findByTokenHash returns the quote or null", async () => {
    const found = {
      listDocuments: vi.fn().mockResolvedValue({ documents: [{ $id: "q1", items: "[]" }] }),
    };
    expect(await createQuoteRepo(found).findByTokenHash("h")).toMatchObject({ id: "q1" });
    const none = { listDocuments: vi.fn().mockResolvedValue({ documents: [] }) };
    expect(await createQuoteRepo(none).findByTokenHash("h")).toBeNull();
  });

  it("createPayment and updatePayment return amountMinor", async () => {
    const db = {
      createDocument: vi.fn().mockResolvedValue({ $id: "p1", amount: 3 }),
      updateDocument: vi.fn().mockResolvedValue({ $id: "p1", amount: 1.5 }),
    };
    const repo = createQuoteRepo(db);
    expect(await repo.createPayment({ amount: 3 })).toMatchObject({ id: "p1", amountMinor: 300 });
    expect(await repo.updatePayment("p1", { amount: 1.5 })).toMatchObject({ amountMinor: 150 });
  });

  it("getPayment and getInvoice return the row, or null on a 404", async () => {
    const db = {
      getDocument: vi
        .fn()
        .mockResolvedValueOnce({ $id: "p1", amount: 2 })
        .mockResolvedValueOnce({ $id: "inv1", $createdAt: "2026-09-01T00:00:00Z" }),
    };
    const repo = createQuoteRepo(db);
    expect(await repo.getPayment("p1")).toMatchObject({ id: "p1", amountMinor: 200 });
    expect(db.getDocument.mock.calls[0].slice(1)).toEqual(["payments", "p1"]);
    expect(await repo.getInvoice("inv1")).toMatchObject({
      id: "inv1",
      createdAt: "2026-09-01T00:00:00Z",
    });
    expect(db.getDocument.mock.calls[1].slice(1)).toEqual(["invoices", "inv1"]);
    const missing = {
      getDocument: vi.fn().mockImplementation(async () => {
        throw Object.assign(new Error("nf"), { code: 404 });
      }),
    };
    expect(await createQuoteRepo(missing).getPayment("x")).toBeNull();
    expect(await createQuoteRepo(missing).getInvoice("x")).toBeNull();
  });

  it("updateInvoice writes the patch to the invoices collection", async () => {
    const db = {
      updateDocument: vi
        .fn()
        .mockImplementation(async (_d, _c, id, data) => ({ $id: id, ...data })),
    };
    const inv = await createQuoteRepo(db).updateInvoice("inv1", { archivedAt: null });
    expect(db.updateDocument.mock.calls[0].slice(1)).toEqual([
      "invoices",
      "inv1",
      { archivedAt: null },
    ]);
    expect(inv).toMatchObject({ id: "inv1", archivedAt: null });
  });

  it("listInvoicePayments queries payments by invoice number", async () => {
    const db = {
      listDocuments: vi.fn().mockResolvedValue({ documents: [{ $id: "p1", amount: 5 }] }),
    };
    const [p] = await createQuoteRepo(db).listInvoicePayments("INV-1");
    expect(p).toMatchObject({ id: "p1", amountMinor: 500 });
    expect(db.listDocuments.mock.calls[0][1]).toBe("payments");
    expect(JSON.stringify(db.listDocuments.mock.calls[0][2])).toContain("INV-1");
  });

  it("findPaymentByReference returns null when nothing matches", async () => {
    const db = { listDocuments: vi.fn().mockResolvedValue({ documents: [] }) };
    expect(await createQuoteRepo(db).findPaymentByReference("ref")).toBeNull();
  });

  it("create rethrows a non-409 error", async () => {
    const db = {
      listDocuments: vi.fn().mockResolvedValue({ documents: [] }),
      createDocument: vi.fn().mockRejectedValue(new Error("down")),
    };
    await expect(createQuoteRepo(db).create({}, 2026)).rejects.toThrow("down");
    expect(db.createDocument).toHaveBeenCalledTimes(1);
  });

  it("create gives up after 5 conflicts", async () => {
    const db = {
      listDocuments: vi.fn().mockResolvedValue({ documents: [] }),
      createDocument: vi.fn().mockRejectedValue(conflict()),
    };
    await expect(createQuoteRepo(db).create({}, 2026)).rejects.toThrow(
      "Could not allocate a quote number",
    );
    expect(db.createDocument).toHaveBeenCalledTimes(5);
  });
});
