/**
 * useDebouncedValue Hook Tests
 * @module hooks/useDebouncedValue.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebouncedValue("hello", 300));
    expect(result.current).toBe("hello");
  });

  it("returns the OLD value before the debounce delay elapses", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: "first" },
    });

    expect(result.current).toBe("first");

    rerender({ value: "second" });
    // Still showing old value immediately after change
    expect(result.current).toBe("first");

    // Advance, but not enough
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe("first");
  });

  it("returns the NEW value after the debounce delay elapses", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: "first" },
    });

    rerender({ value: "second" });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("second");
  });

  it("resets the timer on rapid successive updates", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: "a" },
    });

    rerender({ value: "b" });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // Update again before first debounce fires — should reset timer
    rerender({ value: "c" });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // Still showing original because timer was reset; total elapsed since "c" is 200ms
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(100);
    });
    // Now 300ms after "c"
    expect(result.current).toBe("c");
  });

  it("uses default delay of 300ms when not specified", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value),
      {
        initialProps: { value: "a" },
      },
    );

    rerender({ value: "b" });

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("b");
  });

  it("supports non-string types (numbers)", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 100), {
      initialProps: { value: 1 },
    });

    expect(result.current).toBe(1);

    rerender({ value: 42 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe(42);
  });
});
