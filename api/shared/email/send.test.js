// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { sendEmail } = await import("./send.js");

describe("sendEmail", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM_EMAIL = "quotes@send.oceaniccoder.dev";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
  });

  it("posts to Resend with from, reply-to, html and text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "e1" }) }),
    );
    const r = await sendEmail({ to: "a@b.co", subject: "S", html: "<p>h</p>", text: "t" });
    expect(r).toEqual({ ok: true, id: "e1" });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(JSON.parse(init.body)).toMatchObject({
      from: "OceanicCoder <quotes@send.oceaniccoder.dev>",
      to: ["a@b.co"],
      reply_to: "hello@oceaniccoder.dev",
      subject: "S",
      html: "<p>h</p>",
      text: "t",
    });
  });

  it("returns an error instead of throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({ message: "bad" }) }),
    );
    expect(await sendEmail({ to: "a@b.co", subject: "S", html: "h", text: "t" })).toEqual({
      ok: false,
      error: "bad",
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await sendEmail({ to: "a@b.co", subject: "S", html: "h", text: "t" })).toEqual({
      ok: false,
      error: "offline",
    });
  });

  it("skips without an API key or recipient", async () => {
    delete process.env.RESEND_API_KEY;
    vi.stubGlobal("fetch", vi.fn());
    expect((await sendEmail({ to: "a@b.co", subject: "S", html: "h", text: "t" })).ok).toBe(false);
    process.env.RESEND_API_KEY = "re_test";
    expect((await sendEmail({ to: "", subject: "S", html: "h", text: "t" })).ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("gives the Resend request a timeout signal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "e1" }) }),
    );
    await sendEmail({ to: "a@b.co", subject: "S", html: "<p>h</p>", text: "t" });
    expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
});
