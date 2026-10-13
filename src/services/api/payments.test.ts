import { describe, it, expect, vi, afterEach } from "vitest";
import { PAYMENTS_CHANNELS, getPayments, subscribeToPayments } from "./payments";
import { client, databases, DATABASE_ID, COLLECTIONS } from "./client";

const rows = (from: number, count: number) =>
  Array.from({ length: count }, (_, i) => ({ $id: `p${from + i}` }));

describe("payments realtime", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // A malformed channel string fails silently: Appwrite accepts the
  // subscription and simply never delivers an event, which looks identical to
  // "no payments happened". Pin the exact shapes.
  it("builds the legacy documents channel and the TablesDB rows channel", () => {
    expect(PAYMENTS_CHANNELS).toEqual([
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.PAYMENTS}.documents`,
      `databases.${DATABASE_ID}.tables.${COLLECTIONS.PAYMENTS}.rows`,
    ]);
    expect(PAYMENTS_CHANNELS[0]).toMatch(/^databases\..+\.collections\.payments\.documents$/);
    expect(PAYMENTS_CHANNELS[1]).toMatch(/^databases\..+\.tables\.payments\.rows$/);
  });

  it("subscribes on both channels and invokes the callback on an event", () => {
    const unsubscribe = vi.fn();
    const subscribe = vi
      .spyOn(client, "subscribe")
      .mockImplementation((() => unsubscribe) as never);

    const onChange = vi.fn();
    const returned = subscribeToPayments(onChange);

    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(subscribe.mock.calls[0][0]).toEqual(PAYMENTS_CHANNELS);

    // Fire the callback Appwrite would invoke on a row event.
    const handler = subscribe.mock.calls[0][1] as (payload: unknown) => void;
    handler({ events: ["databases.*.tables.*.rows.*.create"], payload: {} });
    expect(onChange).toHaveBeenCalledTimes(1);

    expect(returned).toBe(unsubscribe);
  });
});

describe("getPayments", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Without a limit Appwrite returns 25 rows, so older payments vanished.
  it("follows the cursor until a short page and returns every row", async () => {
    const list = vi
      .spyOn(databases, "listDocuments")
      .mockResolvedValueOnce({ total: 230, documents: rows(1, 100) } as never)
      .mockResolvedValueOnce({ total: 230, documents: rows(101, 100) } as never)
      .mockResolvedValueOnce({ total: 230, documents: rows(201, 30) } as never);

    const result = await getPayments();

    expect(result).toHaveLength(230);
    expect(result[229].$id).toBe("p230");
    expect(list).toHaveBeenCalledTimes(3);
    expect(list.mock.calls[0][1]).toBe(COLLECTIONS.PAYMENTS);
    const queries = list.mock.calls.map((c) => JSON.stringify(c[2]));
    expect(queries[0]).toContain("limit");
    expect(queries[0]).toContain("orderDesc");
    expect(queries[0]).not.toContain("cursorAfter");
    expect(queries[1]).toContain("cursorAfter");
    expect(queries[1]).toContain("p100");
    expect(queries[2]).toContain("p200");
  });

  it("stops after one call when the first page is short", async () => {
    const list = vi
      .spyOn(databases, "listDocuments")
      .mockResolvedValueOnce({ total: 3, documents: rows(1, 3) } as never);
    expect(await getPayments()).toHaveLength(3);
    expect(list).toHaveBeenCalledTimes(1);
  });
});
