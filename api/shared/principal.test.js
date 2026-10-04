// @vitest-environment node
import { describe, it, expect } from "vitest";

const { rolesFor, readPrincipal, isAdmin } = await import("./principal.js");

const env = { ADMIN_GITHUB_LOGIN: "IllonaAddae", ADMIN_EMAIL: "Admin@Example.com" };

describe("rolesFor", () => {
  it("makes the configured GitHub login admin, ignoring case", () => {
    expect(rolesFor({ identityProvider: "github", userDetails: "illonaaddae" }, env)).toEqual([
      "admin",
    ]);
  });

  it("makes the configured email admin through Entra, from userDetails or a claim", () => {
    expect(rolesFor({ identityProvider: "entra", userDetails: "admin@example.com" }, env)).toEqual([
      "admin",
    ]);
    expect(
      rolesFor(
        {
          identityProvider: "entra",
          userDetails: "Admin",
          claims: [{ typ: "emails", val: "ADMIN@example.com" }],
        },
        env,
      ),
    ).toEqual(["admin"]);
  });

  it.each([
    [{ identityProvider: "github", userDetails: "someone-else" }],
    [{ identityProvider: "entra", userDetails: "someone@example.com" }],
    // The email only counts through Entra, which verifies it at sign-up.
    [{ identityProvider: "github", userDetails: "admin@example.com" }],
    // And the GitHub login only through GitHub.
    [{ identityProvider: "entra", userDetails: "illonaaddae" }],
    [{ identityProvider: "aad", userDetails: "admin@example.com" }],
    [{}],
    [null],
  ])("gives no role to %j", (payload) => {
    expect(rolesFor(payload, env)).toEqual([]);
  });

  it("fails closed when nothing is configured", () => {
    expect(rolesFor({ identityProvider: "github", userDetails: "" }, {})).toEqual([]);
    expect(rolesFor({ identityProvider: "entra", userDetails: "" }, {})).toEqual([]);
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
