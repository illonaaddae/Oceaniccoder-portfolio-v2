// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";

// vi.mock does not reach CommonJS require, so the handler takes its
// dependencies as arguments.
const require = createRequire(import.meta.url);
const { createHandler } = require("./index.js");

const MESSAGE = {
  name: "Ama Owusu",
  email: "ama@example.com",
  subject: "A new website",
  message: "Hello,\nI need a site for my bakery.",
};

// One fake container per collection. `query` answers the conflict checks.
function fakeDatabase({ create, existing = [] } = {}) {
  const created = [];
  const container = {
    items: {
      create: vi.fn(
        create ||
          (async (doc) => {
            created.push(doc);
            return { resource: doc };
          }),
      ),
      query: () => ({ fetchAll: async () => ({ resources: existing }) }),
    },
  };
  return { created, container, db: { container: () => container } };
}

function setup({
  turnstile = { ok: true },
  database = fakeDatabase(),
  sendEmail = vi.fn(async () => ({ ok: true, id: "e1" })),
} = {}) {
  const verifyTurnstile = vi.fn(async () => turnstile);
  const run = createHandler({
    getDatabase: () => database.db,
    verifyTurnstile,
    storeVisitorImage: vi.fn(),
    sendEmail,
  });
  const call = async (collection, body) => {
    const context = {
      bindingData: { collection },
      res: null,
      log: Object.assign(vi.fn(), { error: vi.fn(), warn: vi.fn() }),
    };
    await run(context, { headers: {}, body });
    return { status: context.res.status, body: JSON.parse(context.res.body), context };
  };
  return { call, verifyTurnstile, database, sendEmail };
}

describe("POST /api/submit/{collection}", () => {
  it("saves a valid message and answers 201 with the row", async () => {
    const { call, database } = setup();

    const { status, body } = await call("messages", { ...MESSAGE, turnstileToken: "t" });

    expect(status).toBe(201);
    expect(database.created).toHaveLength(1);
    expect(body).toMatchObject({ ...MESSAGE, status: "new" });
    expect(body.$id).toBeTruthy();
  });

  it("rejects invalid fields before spending the Turnstile token", async () => {
    const { call, verifyTurnstile, database } = setup();

    const { status } = await call("messages", { ...MESSAGE, email: "nope", turnstileToken: "t" });

    expect(status).toBe(400);
    expect(verifyTurnstile).not.toHaveBeenCalled();
    expect(database.created).toHaveLength(0);
  });

  it("refuses the submission when Turnstile fails", async () => {
    const { call, database } = setup({
      turnstile: { ok: false, status: 403, error: "The spam check failed. Please try again." },
    });

    const { status, body } = await call("messages", { ...MESSAGE, turnstileToken: "t" });

    expect(status).toBe(403);
    expect(body.error).toMatch(/spam check/);
    expect(database.created).toHaveLength(0);
  });

  it("answers 500 and logs when the save fails", async () => {
    const database = fakeDatabase({
      create: () => Promise.reject(new Error("Cosmos unavailable")),
    });
    const { call } = setup({ database });

    const { status, context } = await call("messages", { ...MESSAGE, turnstileToken: "t" });

    expect(status).toBe(500);
    expect(context.log.error).toHaveBeenCalledWith("submit/messages failed:", "Cosmos unavailable");
  });

  it("answers 409 when the booking slot is already taken", async () => {
    const { call, database } = setup({ database: fakeDatabase({ existing: [{ id: "b1" }] }) });

    const { status } = await call("bookings", {
      name: "Ama",
      email: "ama@example.com",
      meetingType: "Discovery call",
      preferredDate: "2026-10-22",
      preferredTime: "10:00",
      timezone: "Africa/Accra",
      turnstileToken: "t",
    });

    expect(status).toBe(409);
    expect(database.created).toHaveLength(0);
  });
});

describe("admin alert for a new contact message", () => {
  beforeEach(() => {
    process.env.RESEND_TO_EMAIL = "admin@example.com";
  });
  afterEach(() => {
    delete process.env.RESEND_TO_EMAIL;
  });

  it("emails the admin once, after the row is saved, with the visitor's text escaped", async () => {
    const { call, database, sendEmail } = setup();

    const { status, body } = await call("messages", {
      name: "<b>Ama</b> & Co",
      email: "ama@example.com",
      subject: "<img src=x onerror=alert(1)>",
      message: "<script>alert(1)</script>\nSecond line",
      turnstileToken: "t",
    });

    expect(status).toBe(201);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(database.container.items.create.mock.invocationCallOrder[0]).toBeLessThan(
      sendEmail.mock.invocationCallOrder[0],
    );
    const mail = sendEmail.mock.calls[0][0];
    expect(mail.to).toBe("admin@example.com");
    expect(mail.replyTo).toBe("ama@example.com");
    expect(mail.subject).toBe("New Contact: <img src=x onerror=alert(1)>");
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).not.toContain("<img src=x");
    expect(mail.html).not.toContain("<b>Ama</b>");
    expect(mail.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;<br>Second line");
    expect(mail.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(mail.html).toContain("&lt;b&gt;Ama&lt;/b&gt; &amp; Co");
    expect(mail.html).toContain("ama@example.com");
    expect(mail.text).toContain("<script>alert(1)</script>\nSecond line");
    expect(body.$id).toBeTruthy();
  });

  it("puts the subject on one line", async () => {
    const { call, sendEmail } = setup();

    await call("messages", { ...MESSAGE, subject: "Two\r\nlines", turnstileToken: "t" });

    expect(sendEmail.mock.calls[0][0].subject).toBe("New Contact: Two lines");
  });

  it("sends nothing when validation fails", async () => {
    const { call, sendEmail } = setup();

    await call("messages", { ...MESSAGE, message: "", turnstileToken: "t" });

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends nothing when Turnstile fails", async () => {
    const { call, sendEmail } = setup({
      turnstile: { ok: false, status: 403, error: "The spam check failed. Please try again." },
    });

    await call("messages", { ...MESSAGE, turnstileToken: "t" });

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends nothing when the save fails", async () => {
    const { call, sendEmail } = setup({
      database: fakeDatabase({ create: () => Promise.reject(new Error("Cosmos unavailable")) }),
    });

    await call("messages", { ...MESSAGE, turnstileToken: "t" });

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends nothing for other forms", async () => {
    const { call, sendEmail } = setup();

    const { status } = await call("testimonials", {
      name: "Ama",
      role: "Founder",
      content: "Great work.",
      turnstileToken: "t",
    });

    expect(status).toBe(201);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("still answers 201 and logs an error when the send throws", async () => {
    const sendEmail = vi.fn().mockImplementation(() => Promise.reject(new Error("socket hang up")));
    const { call } = setup({ sendEmail });

    const { status, body, context } = await call("messages", { ...MESSAGE, turnstileToken: "t" });

    expect(status).toBe(201);
    expect(context.log.error).toHaveBeenCalledWith(
      `submit/messages: alert email for ${body.$id} failed:`,
      "socket hang up",
    );
  });

  it("still answers 201 and logs an error when Resend refuses the email", async () => {
    const sendEmail = vi.fn(async () => ({ ok: false, error: "no recipient" }));
    const { call } = setup({ sendEmail });

    const { status, body, context } = await call("messages", { ...MESSAGE, turnstileToken: "t" });

    expect(status).toBe(201);
    expect(context.log.error).toHaveBeenCalledWith(
      `submit/messages: alert email for ${body.$id} failed:`,
      "no recipient",
    );
  });
});
