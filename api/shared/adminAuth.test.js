// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { requireAdmin } = await import("./adminAuth.js");

const principal = (p) => Buffer.from(JSON.stringify(p)).toString("base64");
const admin = principal({ identityProvider: "github", userId: "gh-123", userRoles: ["admin"] });
const context = { log: { error: vi.fn(), warn: vi.fn() } };

describe("requireAdmin with a Static Web Apps session", () => {
  let saved;
  beforeEach(() => {
    saved = process.env.ADMIN_USER_IDS;
    process.env.ADMIN_USER_IDS = "gh-123";
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.ADMIN_USER_IDS;
    else process.env.ADMIN_USER_IDS = saved;
  });

  const request = (method, headers = {}) => ({
    method,
    headers: { "x-ms-client-principal": admin, ...headers },
    body: {},
  });

  it("accepts the admin's same-site JSON POST and GET", async () => {
    const post = request("POST", {
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
    });
    expect((await requireAdmin(context, post)).user).toMatchObject({ provider: "github" });
    expect((await requireAdmin(context, request("GET"))).user).toBeTruthy();
  });

  it.each([
    ["text/plain", "same-origin"],
    ["application/x-www-form-urlencoded", undefined],
    ["multipart/form-data; boundary=x", undefined],
    [undefined, undefined],
  ])("refuses a POST sent as %s", async (type, site) => {
    const headers = {};
    if (type) headers["content-type"] = type;
    if (site) headers["sec-fetch-site"] = site;
    expect(await requireAdmin(context, request("POST", headers))).toMatchObject({ status: 403 });
  });

  it.each(["cross-site", "same-site"])(
    "refuses a %s request from another origin, even a JSON one",
    async (site) => {
      const req = request("POST", { "content-type": "application/json", "sec-fetch-site": site });
      expect(await requireAdmin(context, req)).toMatchObject({ status: 403 });
    },
  );

  it.each(["same-origin", "none"])("accepts Sec-Fetch-Site %s", async (site) => {
    const req = request("GET", { "sec-fetch-site": site });
    expect((await requireAdmin(context, req)).user).toBeTruthy();
  });
});

describe("requireAdmin refusals", () => {
  const NAMES = ["ADMIN_USER_IDS", "ADMIN_EMAIL", "VITE_ADMIN_EMAIL"];
  // ADMIN_EMAIL and VITE_ADMIN_EMAIL are cleared too: they used to open the
  // Appwrite sign-in path and must no longer count as an admin.
  let saved;
  beforeEach(() => {
    saved = Object.fromEntries(NAMES.map((name) => [name, process.env[name]]));
    for (const name of NAMES) delete process.env[name];
  });
  afterEach(() => {
    for (const name of NAMES) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  });

  const signedIn = (userId) => ({
    method: "GET",
    headers: {
      "x-ms-client-principal": principal({ identityProvider: "github", userId, userRoles: [] }),
    },
  });
  const anonymous = { method: "GET", headers: {} };

  it("tells a signed-in user who isn't the admin so (403)", async () => {
    process.env.ADMIN_USER_IDS = "gh-123";
    expect(await requireAdmin(context, signedIn("gh-999"))).toEqual({
      status: 403,
      error: "This account isn't the site admin.",
    });
  });

  it("answers 403, not 500, when only ADMIN_USER_IDS is set", async () => {
    process.env.ADMIN_USER_IDS = "gh-123";
    expect(await requireAdmin(context, signedIn("gh-999"))).toMatchObject({ status: 403 });
    expect(await requireAdmin(context, anonymous)).toMatchObject({ status: 401 });
  });

  it("answers 401 to a caller with no sign-in", async () => {
    process.env.ADMIN_USER_IDS = "gh-123";
    expect(await requireAdmin(context, anonymous)).toMatchObject({ status: 401 });
  });

  it("no longer accepts an Appwrite token in any transport", async () => {
    process.env.ADMIN_USER_IDS = "gh-123";
    process.env.ADMIN_EMAIL = "admin@example.com";
    const req = {
      method: "POST",
      headers: { "x-appwrite-jwt": "eyJ.fake.jwt", authorization: "Bearer eyJ.fake.jwt" },
      body: { jwt: "eyJ.fake.jwt" },
    };
    expect(await requireAdmin(context, req)).toMatchObject({ status: 401 });
  });

  it("answers 500 only when no admin is configured at all", async () => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.VITE_ADMIN_EMAIL = "admin@example.com";
    expect(await requireAdmin(context, anonymous)).toMatchObject({ status: 500 });
    expect(await requireAdmin(context, signedIn("gh-123"))).toMatchObject({ status: 500 });
  });
});
