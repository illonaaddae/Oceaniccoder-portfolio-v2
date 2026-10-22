// @vitest-environment node
import { describe, it, expect } from "vitest";

const { createFakeRepo, createFakeLocks } = await import("./fakes.js");

describe("fake quote repo mirrors the real repo", () => {
  it("fills defaults for missing JSON fields on every read path", async () => {
    const r = createFakeRepo({ quotes: [{ id: "q1", quoteNumber: "Q-2026-0001", items: null }] });
    const got = await r.get("q1");
    expect(got).toMatchObject({ items: [], schedule: [], payState: { due: {} } });
    const found = await r.findByTokenHash("nope");
    expect(found).toBeNull();
    const [listed] = await r.list();
    expect(listed).toMatchObject({ items: [], schedule: [], payState: { due: {} } });
    const created = await r.create({});
    expect(created).toMatchObject({ items: [], schedule: [], payState: { due: {} } });
    const updated = await r.update("q1", { status: "sent" });
    expect(updated).toMatchObject({ items: [], schedule: [], payState: { due: {} } });
  });

  it("never shares default objects between reads", async () => {
    const r = createFakeRepo({ quotes: [{ id: "q1", quoteNumber: "Q-2026-0001" }] });
    const a = await r.get("q1");
    a.payState.due.x = "mutated";
    a.items.push({ id: "leak" });
    const b = await r.get("q1");
    expect(b.payState).toEqual({ due: {} });
    expect(b.items).toEqual([]);
  });

  it("update strips id fields and throws 404 for a missing id", async () => {
    const r = createFakeRepo({ quotes: [{ id: "q1", quoteNumber: "Q-2026-0001" }] });
    const before = await r.get("q1");
    const after = await r.update("q1", {
      id: "other",
      $id: "zzz",
      createdAt: "1999-01-01T00:00:00Z",
      updatedAt: "1999-01-01T00:00:00Z",
      status: "sent",
    });
    expect(after.id).toBe("q1");
    expect(after.status).toBe("sent");
    expect(after.createdAt).toBe(before.createdAt);
    expect(after.$id).toBeUndefined();
    await expect(r.update("nope", { status: "sent" })).rejects.toMatchObject({ code: 404 });
  });

  it("fills amountMinor on createPayment and updatePayment when not provided", async () => {
    const r = createFakeRepo();
    const p = await r.createPayment({ quoteNumber: "Q-2026-0001", amount: 12.5 });
    expect(p.amountMinor).toBe(1250);
    const u = await r.updatePayment(p.id, { amount: 3 });
    expect(u.amountMinor).toBe(300);
    const explicit = await r.createPayment({
      quoteNumber: "Q-2026-0001",
      amount: 1,
      amountMinor: 99,
    });
    expect(explicit.amountMinor).toBe(99);
  });

  it("numbers after the highest seeded number for the year", async () => {
    const r = createFakeRepo({
      quotes: [
        { id: "a", quoteNumber: "Q-2026-0003" },
        { id: "b", quoteNumber: "Q-2025-0009" },
      ],
    });
    const c1 = await r.create({}, 2026);
    expect(c1.quoteNumber).toBe("Q-2026-0004");
    const c2 = await r.create({});
    expect(c2.quoteNumber).toBe("Q-2026-0005");
    const other = await r.create({}, 2025);
    expect(other.quoteNumber).toBe("Q-2025-0010");
  });

  it("returns payments newest first", async () => {
    const r = createFakeRepo();
    const first = await r.createPayment({ quoteNumber: "Q-2026-0001", amount: 1 });
    const second = await r.createPayment({ quoteNumber: "Q-2026-0001", amount: 2, kind: "quote" });
    const byQuote = await r.listPayments("Q-2026-0001");
    expect(byQuote.map((p) => p.id)).toEqual([second.id, first.id]);
    const quoteOnly = await r.listQuotePayments();
    expect(quoteOnly.map((p) => p.id)).toEqual([second.id]);
  });

  it("returns null for an unknown payment reference", async () => {
    const r = createFakeRepo();
    expect(await r.findPaymentByReference("missing")).toBeNull();
  });
});

describe("fake locks", () => {
  it("take succeeds once until released", async () => {
    const l = createFakeLocks();
    expect(await l.take("settle:R1")).toBe(true);
    expect(await l.take("settle:R1")).toBe(false);
    await l.release("settle:R1");
    expect(await l.take("settle:R1")).toBe(true);
  });
  it("has reports a held lock without taking it", async () => {
    const l = createFakeLocks();
    expect(await l.has("k")).toBe(false);
    expect(await l.take("k")).toBe(true);
    expect(await l.has("k")).toBe(true);
  });
});
