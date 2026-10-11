// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { createHandler } = await import("./index.js");

function setup(admin = true) {
  const send = vi.fn().mockResolvedValue({ ok: true, id: "e1" });
  const handler = createHandler({
    requireAdmin: async () =>
      admin ? { user: { email: "a@b.co" } } : { status: 401, error: "Sign in" },
    send,
    adminEmail: () => "admin@oceaniccoder.dev",
  });
  const call = async (req) => {
    const context = { log: { error: vi.fn() } };
    await handler(context, { headers: {}, ...req });
    return { status: context.res.status, body: JSON.parse(context.res.body) };
  };
  return { send, call };
}

describe("email-preview", () => {
  it("is admin only", async () => {
    expect((await setup(false).call({ method: "GET", query: {} })).status).toBe(401);
  });
  it("lists and renders templates", async () => {
    const t = setup();
    const list = await t.call({ method: "GET", query: {} });
    expect(list.body.templates).toContain("quoteSent");
    const one = await t.call({ method: "GET", query: { name: "quoteSent" } });
    expect(one.body.html).toContain("OceanicCoder");
    expect((await t.call({ method: "GET", query: { name: "nope" } })).status).toBe(404);
  });
  it("sends a test to the admin address", async () => {
    const t = setup();
    const r = await t.call({ method: "POST", body: { name: "paymentReceipt" } });
    expect(r.body).toEqual({ sent: true, to: "admin@oceaniccoder.dev" });
    expect(t.send.mock.calls[0][0].subject).toMatch(/^\[Test\] /);
  });
});
