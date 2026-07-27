import { describe, it, expect, vi, afterEach } from "vitest";
import { PAYMENTS_CHANNEL, subscribeToPayments } from "./payments";
import { client, DATABASE_ID, COLLECTIONS } from "./client";

describe("payments realtime", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // A malformed channel string fails silently — Appwrite accepts the
  // subscription and simply never delivers an event, which looks identical to
  // "no payments happened". Pin the exact shape.
  it("builds the documents channel for the payments collection", () => {
    expect(PAYMENTS_CHANNEL).toBe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.PAYMENTS}.documents`,
    );
    expect(PAYMENTS_CHANNEL).toMatch(/^databases\..+\.collections\.payments\.documents$/);
  });

  it("subscribes on the payments channel and invokes the callback on an event", () => {
    const unsubscribe = vi.fn();
    const subscribe = vi
      .spyOn(client, "subscribe")
      .mockImplementation((() => unsubscribe) as never);

    const onChange = vi.fn();
    const returned = subscribeToPayments(onChange);

    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(subscribe.mock.calls[0][0]).toBe(PAYMENTS_CHANNEL);

    // Fire the callback Appwrite would invoke on a document event.
    const handler = subscribe.mock.calls[0][1] as (payload: unknown) => void;
    handler({ events: ["databases.*.documents.*.create"], payload: {} });
    expect(onChange).toHaveBeenCalledTimes(1);

    expect(returned).toBe(unsubscribe);
  });
});
