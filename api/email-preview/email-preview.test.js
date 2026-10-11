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
    fromEmail: () => "hello@send.oceaniccoder.dev",
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
  it("lists every email with its group, name, trigger and subject", async () => {
    const t = setup();
    const list = await t.call({ method: "GET", query: {} });
    expect(list.body.from).toBe("hello@send.oceaniccoder.dev");
    const quote = list.body.templates.find((x) => x.id === "quoteSent");
    expect(quote).toMatchObject({ group: "clients", name: "Quote ready" });
    expect(quote.when).toBeTruthy();
    expect(quote.subject).toBeTruthy();
    expect(list.body.templates.map((x) => x.id)).toEqual(
      expect.arrayContaining(["bookingConfirmation", "invoiceSent", "inquiryWon", "webhookFailed"]),
    );
    expect(list.body.templates.some((x) => x.group === "admin")).toBe(true);
  });
  it("renders one email", async () => {
    const t = setup();
    const one = await t.call({ method: "GET", query: { name: "invoiceSent" } });
    expect(one.status).toBe(200);
    expect(one.body).toMatchObject({ name: "invoiceSent", group: "clients" });
    expect(one.body.html).toContain("OceanicCoder");
    expect(one.body.text).toBeTruthy();
    expect((await t.call({ method: "GET", query: { name: "nope" } })).status).toBe(404);
    expect((await t.call({ method: "GET", query: { name: "constructor" } })).status).toBe(404);
  });
  it("sends a test to the admin address", async () => {
    const t = setup();
    const r = await t.call({ method: "POST", body: { name: "bookingHostNotice" } });
    expect(r.body).toEqual({ sent: true, to: "admin@oceaniccoder.dev" });
    expect(t.send.mock.calls[0][0].subject).toMatch(/^\[Test\] /);
  });
});
