// @vitest-environment node
import { describe, it, expect } from "vitest";

const { errorReason } = await import("./errors.js");

describe("errorReason", () => {
  it("uses the message when there is one", () => {
    expect(errorReason(Object.assign(new Error("Request rate is large"), { code: 429 }))).toBe(
      "Request rate is large",
    );
  });

  // How @azure/cosmos reports a refused connection.
  it("falls back to the code when the message is empty", () => {
    const err = Object.assign(new Error(""), { name: "RestError", code: "ECONNREFUSED" });
    expect(errorReason(err)).toBe("ECONNREFUSED");
  });

  it("falls back to the name when there is no message or code", () => {
    expect(errorReason(Object.assign(new Error(""), { name: "RestError" }))).toBe("RestError");
  });

  it("stringifies values that are not errors", () => {
    expect(errorReason("socket closed")).toBe("socket closed");
    expect(errorReason(undefined)).toBe("undefined");
    expect(errorReason({ code: 503 })).toBe("503");
  });
});
