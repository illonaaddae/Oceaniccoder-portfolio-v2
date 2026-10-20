// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";

const { withDeadline, TimeoutError } = await import("./deadline.js");

describe("withDeadline", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves with the call's result and passes it a live signal", async () => {
    let seen;
    const result = await withDeadline(1000, async (signal) => {
      seen = signal;
      return "ok";
    });
    expect(result).toBe("ok");
    expect(seen.aborted).toBe(false);
  });

  it("passes the call's own error through", async () => {
    await expect(
      withDeadline(1000, () => {
        throw new Error("Request rate is large");
      }),
    ).rejects.toThrow("Request rate is large");
  });

  it("rejects with 'timed out' and aborts the signal when the call never settles", async () => {
    vi.useFakeTimers();
    let seen;
    const pending = withDeadline(5000, (signal) => {
      seen = signal;
      return new Promise(() => {});
    });
    const outcome = pending.catch((e) => e);

    await vi.advanceTimersByTimeAsync(4999);
    expect(seen.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    const err = await outcome;
    expect(err).toBeInstanceOf(TimeoutError);
    expect(err.message).toBe("timed out");
    expect(seen.aborted).toBe(true);
  });

  // The SDK rejects with its own AbortError when the signal fires; the caller
  // should still see the timeout.
  it("reports the timeout, not the abort, when the call rejects on abort", async () => {
    vi.useFakeTimers();
    const pending = withDeadline(
      5000,
      (signal) =>
        new Promise((_, reject) => {
          signal.addEventListener("abort", () => reject(new Error("The operation was aborted.")));
        }),
    );
    const outcome = pending.catch((e) => e);
    await vi.advanceTimersByTimeAsync(5000);
    expect((await outcome).message).toBe("timed out");
  });

  it("leaves no timer behind once the call settles", async () => {
    vi.useFakeTimers();
    await withDeadline(5000, async () => "ok");
    expect(vi.getTimerCount()).toBe(0);
  });
});
