// @vitest-environment node
import { describe, it, expect } from "vitest";

const { rolesFor, readPrincipal, isAdmin } = await import("./principal.js");

const env = { ADMIN_USER_IDS: "gh-123, entra-456" };

describe("rolesFor", () => {
  it("makes the configured SWA user ids admin, for either provider", () => {
    expect(rolesFor({ identityProvider: "github", userId: "gh-123" }, env)).toEqual(["admin"]);
    expect(rolesFor({ identityProvider: "entra", userId: "entra-456" }, env)).toEqual(["admin"]);
  });

  it.each([
    // A name or email that looks like the admin's counts for nothing.
    [{ identityProvider: "entra", userId: "x", userDetails: "admin@example.com" }],
    [
      {
        identityProvider: "entra",
        userId: "x",
        claims: [{ typ: "emails", val: "admin@example.com" }],
      },
    ],
    [{ identityProvider: "github", userId: "x", userDetails: "illonaaddae" }],
    // A right id through a provider we don't use.
    [{ identityProvider: "aad", userId: "gh-123" }],
    [{ identityProvider: "github", userId: "" }],
    [{ identityProvider: "github", userId: ["gh-123"] }],
    [{}],
    [null],
  ])("gives no role to %j", (payload) => {
    expect(rolesFor(payload, env)).toEqual([]);
  });

  it("fails closed when ADMIN_USER_IDS is unset", () => {
    expect(rolesFor({ identityProvider: "github", userId: "gh-123" }, {})).toEqual([]);
  });
});

describe("readPrincipal / isAdmin", () => {
  const header = (p) => ({
    headers: { "x-ms-client-principal": Buffer.from(JSON.stringify(p)).toString("base64") },
  });

  it("decodes the SWA header and checks the admin role", () => {
    const principal = readPrincipal(header({ userId: "u1", userRoles: ["anonymous", "admin"] }));
    expect(isAdmin(principal)).toBe(true);
    expect(isAdmin(readPrincipal(header({ userId: "u1", userRoles: ["authenticated"] })))).toBe(
      false,
    );
  });

  it("treats a missing or garbled header as signed out", () => {
    expect(readPrincipal({ headers: {} })).toBeNull();
    expect(readPrincipal({ headers: { "x-ms-client-principal": "%%%" } })).toBeNull();
    expect(isAdmin(null)).toBe(false);
  });
});
