// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
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

function setup({ turnstile = { ok: true }, database = fakeDatabase() } = {}) {
  const verifyTurnstile = vi.fn(async () => turnstile);
  const run = createHandler({
    getDatabase: () => database.db,
    verifyTurnstile,
    storeVisitorImage: vi.fn(),
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
  return { call, verifyTurnstile, database };
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
