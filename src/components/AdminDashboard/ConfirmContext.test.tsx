import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { ConfirmProvider, useConfirm } from "./ConfirmContext";

describe("useConfirm", () => {
  it("throws outside a ConfirmProvider instead of silently cancelling", () => {
    // React logs the render error before rethrowing it; keep the output clean.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useConfirm())).toThrow(
      "useConfirm must be used within a ConfirmProvider",
    );
    consoleError.mockRestore();
  });

  it("returns the provider's confirm function inside a ConfirmProvider", () => {
    const { result } = renderHook(() => useConfirm(), { wrapper: ConfirmProvider });
    expect(result.current).toBeTypeOf("function");
  });
});
