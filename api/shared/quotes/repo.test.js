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
    await expect(createLocks(db).release("k")).resolves.toBeUndefined();
  });
});
