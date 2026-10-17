// @vitest-environment node
import { describe, it, expect } from "vitest";

const { rolesFor, readPrincipal, isAdmin } = await import("./principal.js");

const env = { ADMIN_USER_IDS: "gh-123, gh-456" };

describe("rolesFor", () => {
  it("makes each configured SWA user id admin", () => {
    expect(rolesFor({ identityProvider: "github", userId: "gh-123" }, env)).toEqual(["admin"]);
    expect(rolesFor({ identityProvider: "github", userId: "gh-456" }, env)).toEqual(["admin"]);
  });

  it.each([
    // A name or email that looks like the admin's counts for nothing.
    [{ identityProvider: "github", userId: "x", userDetails: "admin@example.com" }],
    [
      {
        identityProvider: "github",
        userId: "x",
        claims: [{ typ: "emails", val: "admin@example.com" }],
      },
    ],
    [{ identityProvider: "github", userId: "x", userDetails: "illonaaddae" }],
    // A right id through a provider we don't use.
    [{ identityProvider: "aad", userId: "gh-123" }],
    [{ identityProvider: "entra", userId: "gh-123" }],
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

  const admin = { identityProvider: "github", userId: "gh-123" };

  it("decodes the SWA header and checks the admin role", () => {
    const principal = readPrincipal(header({ ...admin, userRoles: ["anonymous", "admin"] }));
    expect(isAdmin(principal, env)).toBe(true);
    expect(isAdmin(readPrincipal(header({ ...admin, userRoles: ["authenticated"] })), env)).toBe(
      false,
    );
  });

  it.each([
    [{ identityProvider: "github", userId: "someone-else", userRoles: ["admin"] }],
    [{ identityProvider: "aad", userId: "gh-123", userRoles: ["admin"] }],
    [{ userId: "gh-123", userRoles: ["admin"] }],
  ])("refuses a header that claims the role without the admin's id: %j", (p) => {
    expect(isAdmin(readPrincipal(header(p)), env)).toBe(false);
  });

  it("refuses everyone when ADMIN_USER_IDS is unset", () => {
    expect(isAdmin({ ...admin, userRoles: ["admin"] }, {})).toBe(false);
  });

  it("treats a missing or garbled header as signed out", () => {
    expect(readPrincipal({ headers: {} })).toBeNull();
    expect(readPrincipal({ headers: { "x-ms-client-principal": "%%%" } })).toBeNull();
    expect(isAdmin(null)).toBe(false);
  });
});
