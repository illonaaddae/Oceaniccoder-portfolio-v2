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
  clock = { ms: Date.parse("2026-10-20T09:00:00Z") },
  storeVisitorImage = vi.fn(),
} = {}) {
  const verifyTurnstile = vi.fn(async () => turnstile);
  const run = createHandler({
    getDatabase: () => database.db,
    verifyTurnstile,
    storeVisitorImage,
    sendEmail,
    now: () => clock.ms,
  });
  const call = async (collection, body, headers = {}) => {
    const context = {
      bindingData: { collection },
      res: null,
      log: Object.assign(vi.fn(), { error: vi.fn(), warn: vi.fn() }),
    };
    await run(context, { headers, body });
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

  it("never shows the visitor the database's own error text", async () => {
    // Cosmos SDK errors carry the HTTP status in `code`.
    const cosmosError = Object.assign(new Error('Message: {"Errors":["partition key mismatch"]}'), {
      code: 400,
    });
    const database = fakeDatabase({ create: () => Promise.reject(cosmosError) });
    const { call } = setup({ database });

    const { status, body, context } = await call("messages", { ...MESSAGE, turnstileToken: "t" });

    expect(status).toBe(500);
    expect(body.error).toBe("Couldn't save that. Please try again.");
    expect(context.log.error).toHaveBeenCalledWith("submit/messages failed:", cosmosError.message);
  });

  it("never shows the visitor other server errors marked 400", async () => {
    const internal = Object.assign(new Error("Invalid blob name"), { status: 400 });
    const database = fakeDatabase({ create: () => Promise.reject(internal) });
    const { call } = setup({ database });

    const { status, body } = await call("messages", { ...MESSAGE, turnstileToken: "t" });

    expect(status).toBe(500);
    expect(body.error).toBe("Couldn't save that. Please try again.");
  });

  it("still shows the visitor why their photo was refused", async () => {
    const storeVisitorImage = vi
      .fn()
      .mockImplementation(() =>
        Promise.reject(
          Object.assign(new Error("The photo is too large (max 5 MB)."), { status: 400 }),
        ),
      );
    const { call, database } = setup({ storeVisitorImage });

    const { status, body } = await call("testimonials", {
      name: "Ama",
      role: "Founder",
      content: "Great work.",
      imageData: "data:image/png;base64,AAAA",
      turnstileToken: "t",
    });

    expect(status).toBe(400);
    expect(body.error).toBe("The photo is too large (max 5 MB).");
    expect(database.created).toHaveLength(0);
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

  it.each(["ama,boss@example.com", "ama;x@example.com", "<ama>@example.com", 'a"b@example.com'])(
    "leaves out reply-to and says so when the address is %s",
    async (email) => {
      const { call, sendEmail } = setup();

      const { status } = await call("messages", { ...MESSAGE, email, turnstileToken: "t" });

      expect(status).toBe(201);
      const mail = sendEmail.mock.calls[0][0];
      expect(mail).not.toHaveProperty("replyTo");
      expect(mail.html).toContain("looked malformed");
      expect(mail.html).not.toContain("Reply to this email");
      expect(mail.text).toContain("looked malformed");
    },
  );

  it("does not mention a malformed address when it is fine", async () => {
    const { call, sendEmail } = setup();

    await call("messages", { ...MESSAGE, turnstileToken: "t" });

    expect(sendEmail.mock.calls[0][0].html).not.toContain("malformed");
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

describe("admin alert caps", () => {
  const from = (ip) => ({ "x-forwarded-for": ip });
  const HOUR_MS = 60 * 60 * 1000;

  beforeEach(() => {
    process.env.RESEND_TO_EMAIL = "admin@example.com";
  });
  afterEach(() => {
    delete process.env.RESEND_TO_EMAIL;
  });

  it("stops emailing after 3 messages an hour from one IP but still saves them", async () => {
    const clock = { ms: Date.parse("2026-10-20T09:00:00Z") };
    const { call, sendEmail, database } = setup({ clock });
    const send = () => call("messages", { ...MESSAGE, turnstileToken: "t" }, from("203.0.113.7"));

    for (let i = 0; i < 3; i += 1) await send();
    const fourth = await send();
    const fifth = await send();

    expect(fourth.status).toBe(201);
    expect(fifth.status).toBe(201);
    expect(database.created).toHaveLength(5);
    expect(sendEmail).toHaveBeenCalledTimes(3);
    expect(fourth.context.log.warn).toHaveBeenCalledWith(
      "submit/messages: alert email cap of 3 an hour from one IP reached; saving without emailing",
    );
    expect(fifth.context.log.warn).not.toHaveBeenCalled();

    // Another IP still gets through, and the first one does again an hour later.
    await call("messages", { ...MESSAGE, turnstileToken: "t" }, from("198.51.100.4"));
    expect(sendEmail).toHaveBeenCalledTimes(4);
    clock.ms += HOUR_MS;
    await send();
    expect(sendEmail).toHaveBeenCalledTimes(5);
  });

  it("stops emailing after 50 messages a day in total", async () => {
    const { call, sendEmail, database } = setup();
    const sendFrom = (i) =>
      call("messages", { ...MESSAGE, turnstileToken: "t" }, from(`203.0.113.${i}`));

    for (let i = 1; i <= 50; i += 1) await sendFrom(i);
    const over = await sendFrom(51);

    expect(over.status).toBe(201);
    expect(database.created).toHaveLength(51);
    expect(sendEmail).toHaveBeenCalledTimes(50);
    expect(over.context.log.warn).toHaveBeenCalledWith(
      "submit/messages: alert email cap of 50 a day reached; saving without emailing",
    );
  });
});
