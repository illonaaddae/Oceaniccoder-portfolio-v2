import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

const getPayments = vi.fn();
vi.mock("@/services/api/payments", () => ({
  getPayments: () => getPayments(),
}));

import { POLL_MS, usePaymentsFeed } from "./usePaymentsFeed";

let visibility: "visible" | "hidden" = "visible";

// Lets the awaited getPayments() promise and the state updates after it run.
const flush = () => act(async () => {});

beforeEach(() => {
  vi.useFakeTimers();
  getPayments.mockReset();
  getPayments.mockResolvedValue([]);
  visibility = "visible";
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("usePaymentsFeed", () => {
  it("loads once on mount and records when it updated", async () => {
    getPayments.mockResolvedValue([{ $id: "p1" }]);
    const { result } = renderHook(() => usePaymentsFeed());
    await flush();
    expect(getPayments).toHaveBeenCalledTimes(1);
    expect(result.current.payments).toEqual([{ $id: "p1" }]);
    expect(result.current.loading).toBe(false);
    expect(result.current.updatedAt).toBeInstanceOf(Date);
  });

  it("polls while visible, pauses while hidden and refetches on return", async () => {
    renderHook(() => usePaymentsFeed());
    await flush();
    await act(async () => {
      vi.advanceTimersByTime(POLL_MS);
    });
    expect(getPayments).toHaveBeenCalledTimes(2);

    visibility = "hidden";
    await act(async () => {
      vi.advanceTimersByTime(POLL_MS * 3);
    });
    expect(getPayments).toHaveBeenCalledTimes(2);

    visibility = "visible";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(getPayments).toHaveBeenCalledTimes(3);
  });

  it("drops an in-flight response that started before a local write", async () => {
    const { result } = renderHook(() => usePaymentsFeed());
    await flush();
    let answer: (rows: unknown[]) => void = () => {};
    getPayments.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          answer = resolve;
        }),
    );
    await act(async () => {
      vi.advanceTimersByTime(POLL_MS);
    });
    act(() => result.current.setPayments([{ $id: "p1", archivedAt: "now" } as never]));
    await act(async () => answer([{ $id: "p1", archivedAt: null }]));
    expect(result.current.payments).toEqual([{ $id: "p1", archivedAt: "now" }]);
  });

  it("re-runs a manual refresh that a local write superseded", async () => {
    const { result } = renderHook(() => usePaymentsFeed());
    await flush();
    let answer: (rows: unknown[]) => void = () => {};
    getPayments.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          answer = resolve;
        }),
    );
    act(() => result.current.refresh());
    expect(result.current.loading).toBe(true);
    act(() => result.current.setPayments([{ $id: "p1", archivedAt: "now" } as never]));
    let answerRerun: (rows: unknown[]) => void = () => {};
    getPayments.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          answerRerun = resolve;
        }),
    );
    await act(async () => answer([{ $id: "p1", archivedAt: null }]));
    // The re-run is in flight: the spinner stays on, no flicker.
    expect(result.current.loading).toBe(true);
    await act(async () => answerRerun([{ $id: "p1", archivedAt: "now" }, { $id: "p2" }]));
    await flush();
    // 1 mount + the superseded refresh + its re-run.
    expect(getPayments).toHaveBeenCalledTimes(3);
    expect(result.current.payments).toEqual([{ $id: "p1", archivedAt: "now" }, { $id: "p2" }]);
    expect(result.current.loading).toBe(false);
  });

  it("shows a background failure as an error until a load has succeeded", async () => {
    let answerFirst: (rows: unknown[]) => void = () => {};
    getPayments.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          answerFirst = resolve;
        }),
    );
    const { result } = renderHook(() => usePaymentsFeed());
    getPayments.mockImplementationOnce(async () => {
      throw new Error("Network down");
    });
    await act(async () => {
      vi.advanceTimersByTime(POLL_MS);
    });
    expect(result.current.error).toBe("Network down");
    expect(result.current.stale).toBe(false);
    // The superseded first load landing late changes nothing.
    await act(async () => answerFirst([{ $id: "late" }]));
    expect(result.current.payments).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("stops polling on unmount", async () => {
    const { unmount } = renderHook(() => usePaymentsFeed());
    await flush();
    unmount();
    await act(async () => {
      vi.advanceTimersByTime(POLL_MS * 2);
    });
    expect(getPayments).toHaveBeenCalledTimes(1);
  });

  it("shows a failed first load as an error", async () => {
    getPayments.mockImplementationOnce(async () => {
      throw new Error("Network down");
    });
    const { result } = renderHook(() => usePaymentsFeed());
    await flush();
    expect(result.current.error).toBe("Network down");
  });

  it("flags a failed background refresh after a good load as stale, not an error", async () => {
    getPayments.mockResolvedValueOnce([{ $id: "p1" }]);
    const { result } = renderHook(() => usePaymentsFeed());
    await flush();
    getPayments.mockImplementationOnce(async () => {
      throw new Error("blip");
    });
    await act(async () => {
      vi.advanceTimersByTime(POLL_MS);
    });
    expect(result.current.stale).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.payments).toEqual([{ $id: "p1" }]);
  });
});
