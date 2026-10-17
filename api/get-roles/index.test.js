// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

const { default: handler } = await import("./index.js");

async function rolesFor(body) {
  const context = {};
  await handler(context, { method: "POST", body });
  expect(context.res.status).toBe(200);
  return JSON.parse(context.res.body).roles;
}

describe("/api/get-roles", () => {
  let saved;
  beforeEach(() => {
    saved = process.env.ADMIN_USER_IDS;
    process.env.ADMIN_USER_IDS = "gh-123";
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.ADMIN_USER_IDS;
    else process.env.ADMIN_USER_IDS = saved;
  });

  it("grants the admin role to an id in ADMIN_USER_IDS", async () => {
    expect(await rolesFor({ identityProvider: "github", userId: "gh-123" })).toEqual(["admin"]);
  });

  it("grants nothing to any other account", async () => {
    expect(await rolesFor({ identityProvider: "github", userId: "gh-999" })).toEqual([]);
    expect(await rolesFor({ identityProvider: "aad", userId: "gh-123" })).toEqual([]);
    expect(await rolesFor(undefined)).toEqual([]);
  });

  it("grants nothing when ADMIN_USER_IDS is unset", async () => {
    delete process.env.ADMIN_USER_IDS;
    expect(await rolesFor({ identityProvider: "github", userId: "gh-123" })).toEqual([]);
  });
});
