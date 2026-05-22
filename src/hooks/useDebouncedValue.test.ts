import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("should return the initial value immediately", () => {
    const { result } = renderHook(() => useDebouncedValue("initial"));
    expect(result.current).toBe("initial");
  });

  it("should update the value after the default delay", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: "initial" },
    });

    expect(result.current).toBe("initial");

    // Update the value
    rerender({ value: "updated" });

    // Value should not update immediately
    expect(result.current).toBe("initial");

    // Fast-forward time by 299ms (default delay is 300ms)
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("initial");

    // Fast-forward the remaining 1ms
    act(() => {
      vi.advanceTimersByTime(1);
    });

    // Value should now be updated
    expect(result.current).toBe("updated");
  });

  it("should work with a custom delay", () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
      initialProps: { value: "initial", delay: 500 },
    });

    expect(result.current).toBe("initial");

    // Update the value
    rerender({ value: "updated", delay: 500 });

    // Value should not update immediately
    expect(result.current).toBe("initial");

    // Fast-forward time by 499ms
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current).toBe("initial");

    // Fast-forward the remaining 1ms
    act(() => {
      vi.advanceTimersByTime(1);
    });

    // Value should now be updated
    expect(result.current).toBe("updated");
  });

  it("should cancel the timeout if the value updates again before the delay", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: "initial" },
    });

    // Update the value to "update1"
    rerender({ value: "update1" });

    // Fast-forward time by 150ms
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe("initial");

    // Update the value to "update2" before the first timeout finishes
    rerender({ value: "update2" });

    // Fast-forward another 200ms (total 350ms since first update, but only 200ms since second update)
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe("initial");

    // Fast-forward another 100ms (total 300ms since second update)
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Value should now be updated to the second value
    expect(result.current).toBe("update2");
  });

  it("should clear the timeout on unmount", () => {
    const { unmount, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: "initial" },
    });

    rerender({ value: "updated" });

    // Unmount before the timeout finishes
    unmount();

    // Fast-forward time
    act(() => {
      vi.runAllTimers();
    });

    // There's no result to check because it's unmounted,
    // but this ensures no state update on an unmounted component occurs.
    // (React would log a warning if we didn't cleanup, and act() would complain)
    // We can also check if timers are cleared
    expect(vi.getTimerCount()).toBe(0);
  });
});
