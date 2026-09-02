import { describe, it, expect } from "vitest";
import { formatCredentialId, isOpaqueCredentialId } from "./formatCredentialId";

describe("isOpaqueCredentialId", () => {
  it("treats a UUID as opaque", () => {
    expect(isOpaqueCredentialId("2234490f-2d2d-4fea-90a9-575e6990781f")).toBe(true);
  });

  it("treats a human label as not opaque", () => {
    expect(isOpaqueCredentialId("Professional Certificate")).toBe(false);
  });

  it("treats a short code as not opaque", () => {
    expect(isOpaqueCredentialId("ABC123XYZ")).toBe(false);
  });
});

describe("formatCredentialId", () => {
  it("middle-truncates a UUID keeping both ends", () => {
    expect(formatCredentialId("2234490f-2d2d-4fea-90a9-575e6990781f")).toBe("2234490f…90781f");
  });

  it("leaves human labels untouched", () => {
    expect(formatCredentialId("Professional Certificate")).toBe("Professional Certificate");
  });

  it("leaves short ids untouched", () => {
    expect(formatCredentialId("ABC123XYZ")).toBe("ABC123XYZ");
  });

  it("trims surrounding whitespace", () => {
    expect(formatCredentialId("  ABC123XYZ  ")).toBe("ABC123XYZ");
  });
});
