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
