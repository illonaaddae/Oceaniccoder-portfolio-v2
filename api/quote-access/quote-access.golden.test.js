// @vitest-environment node
// Golden transcripts of POST /api/quote-access, recorded from origin/main
// before the handler body moved into shared/access/endpoint.js. Each one
// pins the status, body, Set-Cookie, emails, log lines and lock-row calls of a
// run of requests, with a fixed secret, clock and randomBytes. The quote page
// and every client browser depend on these. Don't update a snapshot here to
// make a test pass; find what changed instead.
import { createRequire } from "module";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const require = createRequire(import.meta.url);
const crypto = require("crypto");
const { Buffer } = require("buffer");
const { createHandler } = await import("./index.js");
const { createFakeRepo, createFakeLocks } = await import("../shared/quotes/fakes.js");
const { hashToken } = await import("../shared/tokens.js");
const A = await import("../shared/quotes/access.js");

const SECRET = "golden-secret-".padEnd(48, "x");
const TOKEN = "T".repeat(43);
const START = Date.parse("2026-10-20T09:00:00.000Z");
const QUOTE = {
  id: "q-golden",
  quoteNumber: "Q-2026-0042",
  revision: 2,
  status: "sent",
  title: "Store",
  clientName: "Kofi Mensah",
  clientEmail: "kofi.mensah@hotmail.com",
  tokenHash: hashToken(TOKEN),
};
const ENV = { QUOTE_ACCESS_SECRET: SECRET, RESEND_TO_EMAIL: "owner@oceaniccoder.dev" };

let fill;
beforeEach(() => {
  fill = 0;
  vi.spyOn(crypto, "randomBytes").mockImplementation((size) => {
    fill += 1;
    return Buffer.alloc(size, fill);
  });
});
afterEach(() => vi.restoreAllMocks());

const digest = (text) => crypto.createHash("sha256").update(String(text)).digest("hex");

function setup({ quotes = [QUOTE], env = ENV, mailOk = true, locksImpl } = {}) {
  const repo = createFakeRepo({ quotes });
  const clock = { ms: START };
  const inner = locksImpl || createFakeLocks({ now: () => clock.ms });
  const transcript = [];
  const wrap =
    (name) =>
    async (...args) => {
      const result = await inner[name](...args);
      transcript.push(`lock ${name} ${args[0]} -> ${JSON.stringify(result)}`);
      return result;
    };
  const locks = { take: wrap("take"), has: wrap("has"), release: wrap("release") };
  const mails = [];
  const handler = createHandler({
    env,
    alertWaitMs: 50,
    send: async (mail) => {
      mails.push(mail);
      transcript.push({
        mail: {
          to: mail.to,
          subject: mail.subject,
          html: digest(mail.html),
          text: digest(mail.text),
        },
      });
      return mailOk ? { ok: true } : { ok: false, error: `Resend refused ${mail.to}` };
    },
    services: () => ({ repo, locks, now: () => new Date(clock.ms) }),
  });
  const call = async (body, { ip = "203.0.113.7", cookie, method = "POST" } = {}) => {
    const log = (...args) => transcript.push(`log info: ${args.join(" ")}`);
    log.error = (...args) => transcript.push(`log error: ${args.join(" ")}`);
    log.warn = (...args) => transcript.push(`log warn: ${args.join(" ")}`);
    const context = { log };
    const headers = { "x-forwarded-for": `${ip}:51234` };
    if (cookie) headers.cookie = cookie;
    await handler(context, { method, body, headers });
    const res = {
      status: context.res.status,
      headers: context.res.headers,
      body: JSON.parse(context.res.body),
    };
    transcript.push({ res });
    return res;
  };
  const lastCode = () => mails[mails.length - 1].subject.match(/^(\d{6}) is your code/)[1];
  return { repo, clock, inner, mails, transcript, call, lastCode };
}

const wrongCode = (code) => String((Number(code) + 1) % 1000000).padStart(6, "0");

describe("golden: quote-access request checks", () => {
  it("method, action, token shape, gate and secret", async () => {
    const t = setup();
    await t.call({ action: "status", token: TOKEN }, { method: "GET" });
    await t.call({ action: "nope", token: TOKEN });
    await t.call({ action: "toString", token: TOKEN });
    await t.call({ action: "status", token: "short" });
    await t.call({ action: "status", token: "U".repeat(43) });
    const off = setup({ env: { ...ENV, QUOTE_ACCESS_GATE: "off" } });
    await off.call({ action: "status", token: TOKEN });
    await off.call({ action: "send", token: TOKEN });
    const bad = setup({ env: { ...ENV, QUOTE_ACCESS_GATE: "maybe" } });
    await bad.call({ action: "status", token: TOKEN });
    const noSecret = setup({ env: { RESEND_TO_EMAIL: "owner@oceaniccoder.dev" } });
    await noSecret.call({ action: "status", token: TOKEN });
    const draft = setup({ quotes: [{ ...QUOTE, status: "draft" }] });
    await draft.call({ action: "status", token: TOKEN });
    expect([t.transcript, off.transcript, bad.transcript, noSecret.transcript, draft.transcript])
      .toMatchInlineSnapshot(`
        [
          [
            {
              "res": {
                "body": {
                  "error": "Use POST.",
                },
                "headers": {
                  "Cache-Control": "no-store",
                  "Content-Type": "application/json",
                },
                "status": 405,
              },
            },
            {
              "res": {
                "body": {
                  "error": "Unknown action.",
                },
                "headers": {
                  "Cache-Control": "no-store",
                  "Content-Type": "application/json",
                },
                "status": 400,
              },
            },
            {
              "res": {
                "body": {
                  "error": "Unknown action.",
                },
                "headers": {
                  "Cache-Control": "no-store",
                  "Content-Type": "application/json",
                },
                "status": 400,
              },
            },
            {
              "res": {
                "body": {
                  "error": "This link is no longer active.",
                  "inactive": true,
                },
                "headers": {
                  "Cache-Control": "no-store",
                  "Content-Type": "application/json",
                },
                "status": 404,
              },
            },
            {
              "res": {
                "body": {
                  "error": "This link is no longer active.",
                  "inactive": true,
                },
                "headers": {
                  "Cache-Control": "no-store",
                  "Content-Type": "application/json",
                },
                "status": 404,
              },
            },
          ],
          [
            {
              "res": {
                "body": {
                  "gateOff": true,
                  "locked": false,
                },
                "headers": {
                  "Cache-Control": "no-store",
                  "Content-Type": "application/json",
                },
                "status": 200,
              },
            },
            {
              "res": {
                "body": {
                  "error": "This quote opens without a code right now.",
                  "gateOff": true,
                },
                "headers": {
                  "Cache-Control": "no-store",
                  "Content-Type": "application/json",
                },
                "status": 409,
              },
            },
          ],
          [
            "log error: quote-access: QUOTE_ACCESS_GATE must be "on" or "off"",
            {
              "res": {
                "body": {
                  "error": "Quote links are unavailable right now. Please try again later.",
                },
                "headers": {
                  "Cache-Control": "no-store",
                  "Content-Type": "application/json",
                },
                "status": 503,
              },
            },
          ],
          [
            "log error: quote-access: QUOTE_ACCESS_SECRET is missing or shorter than 32 characters",
            {
              "res": {
                "body": {
                  "error": "Quote links are unavailable right now. Please try again later.",
                },
                "headers": {
                  "Cache-Control": "no-store",
                  "Content-Type": "application/json",
                },
                "status": 503,
              },
            },
          ],
          [
            {
              "res": {
                "body": {
                  "error": "This link is no longer active.",
                  "inactive": true,
                },
                "headers": {
                  "Cache-Control": "no-store",
                  "Content-Type": "application/json",
                },
                "status": 404,
              },
            },
          ],
        ]
      `);
  });

  it("answers 500 without detail when the lock store fails", async () => {
    const failing = {
      take: async () => true,
      release: async () => true,
      has: async () => {
        throw new Error("cosmos down for kofi.mensah@hotmail.com");
      },
    };
    const t = setup({ locksImpl: failing });
    await t.call({ action: "status", token: TOKEN });
    expect(t.transcript.map((x) => (typeof x === "string" ? x.split("\n")[0] : x)))
      .toMatchInlineSnapshot(`
        [
          "log error: quote-access: Error: cosmos down for kofi.mensah@hotmail.com",
          {
            "res": {
              "body": {
                "error": "Something went wrong on our side. Please try again.",
              },
              "headers": {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
              "status": 500,
            },
          },
        ]
      `);
  });
});

describe("golden: quote-access send and verify", () => {
  it("status, send, wrong codes to a lockout, then a right code", async () => {
    const t = setup();
    await t.call({ action: "status", token: TOKEN });
    const sent = await t.call({ action: "send", token: TOKEN });
    await t.call({ action: "send", token: TOKEN });
    const code = t.lastCode();
    const verify = (c, challenge = sent.body.challenge) =>
      t.call({ action: "verify", token: TOKEN, challenge, code: c });
    await verify("12-34");
    await verify(code, "v1.bad.sig");
    for (let i = 0; i < 6; i += 1) await verify(wrongCode(code));
    t.clock.ms += 90 * 1000;
    const again = await t.call({ action: "send", token: TOKEN });
    const ok = await verify(
      ` ${t.lastCode().slice(0, 3)}-${t.lastCode().slice(3)} `,
      again.body.challenge,
    );
    await verify(t.lastCode(), again.body.challenge);
    const cookie = ok.headers["Set-Cookie"].split(";")[0];
    await t.call({ action: "status", token: TOKEN }, { cookie });
    expect(t.transcript).toMatchInlineSnapshot(`
      [
        "lock has qa:epoch:q-golden:2:1 -> false",
        "lock has qa:miss:q-golden:2:0:15 -> false",
        {
          "res": {
            "body": {
              "blocked": false,
              "canUnlock": true,
              "locked": true,
              "maskedEmail": "k•••••@hotmail.com",
            },
            "headers": {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
            "status": 200,
          },
        },
        "lock has qa:epoch:q-golden:2:1 -> false",
        "lock has qa:miss:q-golden:2:0:15 -> false",
        "lock take qa:send:q-golden:2:0:g:59749560 -> true",
        "lock take qa:send:q-golden:2:0:g:59749561 -> true",
        "lock take qa:send:q-golden:2:0:g:59749562 -> true",
        "lock take qa:send:q-golden:2:0:h:497913:1 -> true",
        "lock take qa:send:q-golden:2:0:d:20746:1 -> true",
        {
          "mail": {
            "html": "4e8f2f3186fea2a527c4eab7e3b7ce098c28d5a7198f34e2c9f909bef0eb8be5",
            "subject": "169255 is your code for quote Q-2026-0042",
            "text": "0d1560575bff7347e447c954c15fb2f7d4191c36f2940a7eb56bad71816dc156",
            "to": "kofi.mensah@hotmail.com",
          },
        },
        "log info: quote-access send quote=Q-2026-0042",
        {
          "res": {
            "body": {
              "challenge": "v1.eyJjIjoiQVFFQkFRRUJBUUVCQVFFQkFRRUJBUSIsInEiOiJxLWdvbGRlbiIsInIiOjIsImUiOjAsIm0iOiJCamx4S1dRaWpIN0d2ZGs5SjI5c1BxIiwieCI6MTc5MjQ4NzQwMDAwMH0.1dKkuwPkIiF5xbjNp56G10Pw2h5RtsW3kG_Wqu9yu2U",
              "expiresInSeconds": 600,
              "maskedEmail": "k•••••@hotmail.com",
              "retryAfterSeconds": 90,
            },
            "headers": {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
            "status": 200,
          },
        },
        "lock has qa:epoch:q-golden:2:1 -> false",
        "lock has qa:miss:q-golden:2:0:15 -> false",
        "lock take qa:send:q-golden:2:0:g:59749560 -> false",
        "lock has qa:send:q-golden:2:0:g:59749560 -> true",
        "lock has qa:send:q-golden:2:0:g:59749561 -> true",
        "lock has qa:send:q-golden:2:0:g:59749562 -> true",
        "log info: quote-access limit quote=Q-2026-0042",
        {
          "res": {
            "body": {
              "error": "A code was sent recently. Check your inbox, or wait to ask again.",
              "retryAfterSeconds": 90,
            },
            "headers": {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
            "status": 429,
          },
        },
        {
          "res": {
            "body": {
              "error": "Enter the 6-digit code from the email.",
            },
            "headers": {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
            "status": 400,
          },
        },
        {
          "res": {
            "body": {
              "error": "That code isn't valid any more. Ask for a new one.",
              "newCodeNeeded": true,
            },
            "headers": {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
            "status": 400,
          },
        },
        "lock has qa:epoch:q-golden:2:1 -> false",
        "lock has qa:miss:q-golden:2:0:15 -> false",
        "lock take qa:try:AQEBAQEBAQEBAQEBAQEBAQ:1 -> true",
        "lock take qa:miss:q-golden:2:0:1 -> true",
        "log info: quote-access verify quote=Q-2026-0042 triesLeft=4 misses=1",
        {
          "res": {
            "body": {
              "error": "That code isn't right. Check the email and try again.",
              "triesLeft": 4,
            },
            "headers": {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
            "status": 400,
          },
        },
        "lock has qa:epoch:q-golden:2:1 -> false",
        "lock has qa:miss:q-golden:2:0:15 -> false",
        "lock take qa:try:AQEBAQEBAQEBAQEBAQEBAQ:1 -> false",
        "lock take qa:try:AQEBAQEBAQEBAQEBAQEBAQ:2 -> true",
        "lock take qa:miss:q-golden:2:0:1 -> false",
        "lock take qa:miss:q-golden:2:0:2 -> true",
        "log info: quote-access verify quote=Q-2026-0042 triesLeft=3 misses=2",
        {
          "res": {
            "body": {
              "error": "That code isn't right. Check the email and try again.",
              "triesLeft": 3,
            },
            "headers": {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
            "status": 400,
          },
        },
        "lock has qa:epoch:q-golden:2:1 -> false",
        "lock has qa:miss:q-golden:2:0:15 -> false",
        "lock take qa:try:AQEBAQEBAQEBAQEBAQEBAQ:1 -> false",
        "lock take qa:try:AQEBAQEBAQEBAQEBAQEBAQ:2 -> false",
        "lock take qa:try:AQEBAQEBAQEBAQEBAQEBAQ:3 -> true",
        "lock take qa:miss:q-golden:2:0:1 -> false",
        "lock take qa:miss:q-golden:2:0:2 -> false",
        "lock take qa:miss:q-golden:2:0:3 -> true",
        "log info: quote-access verify quote=Q-2026-0042 triesLeft=2 misses=3",
        {
          "res": {
            "body": {
              "error": "That code isn't right. Check the email and try again.",
              "triesLeft": 2,
            },
            "headers": {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
            "status": 400,
          },
        },
        "lock has qa:epoch:q-golden:2:1 -> false",
        "lock has qa:miss:q-golden:2:0:15 -> false",
        "lock take qa:try:AQEBAQEBAQEBAQEBAQEBAQ:1 -> false",
        "lock take qa:try:AQEBAQEBAQEBAQEBAQEBAQ:2 -> false",
        "lock take qa:try:AQEBAQEBAQEBAQEBAQEBAQ:3 -> false",
        "lock take qa:try:AQEBAQEBAQEBAQEBAQEBAQ:4 -> true",
        "lock take qa:miss:q-golden:2:0:1 -> false",
        "lock take qa:miss:q-golden:2:0:2 -> false",
        "lock take qa:miss:q-golden:2:0:3 -> false",
        "lock take qa:miss:q-golden:2:0:4 -> true",
        "log info: quote-access verify quote=Q-2026-0042 triesLeft=1 misses=4",
        {
          "res": {
            "body": {
              "error": "That code isn't right. Check the email and try again.",
              "triesLeft": 1,
            },
            "headers": {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
            "status": 400,
          },
        },
        "lock has qa:epoch:q-golden:2:1 -> false",
        "lock has qa:miss:q-golden:2:0:15 -> false",
        "lock take qa:try:AQEBAQEBAQEBAQEBAQEBAQ:1 -> false",
        "lock take qa:try:AQEBAQEBAQEBAQEBAQEBAQ:2 -> false",
        "lock take qa:try:AQEBAQEBAQEBAQEBAQEBAQ:3 -> false",
        "lock take qa:try:AQEBAQEBAQEBAQEBAQEBAQ:4 -> false",
        "lock take qa:try:AQEBAQEBAQEBAQEBAQEBAQ:5 -> true",
        "lock take qa:miss:q-golden:2:0:1 -> false",
        "lock take qa:miss:q-golden:2:0:2 -> false",
        "lock take qa:miss:q-golden:2:0:3 -> false",
        "lock take qa:miss:q-golden:2:0:4 -> false",
        "lock take qa:miss:q-golden:2:0:5 -> true",
        "log info: quote-access verify quote=Q-2026-0042 triesLeft=0 misses=5",
        "log warn: quote-access lock quote=Q-2026-0042",
        {
          "mail": {
            "html": "d97ed54da4fa7abe4a304b68f34890b2abdb032ef225bb70e20adf81c3823557",
            "subject": "Code locked after 5 wrong tries on Q-2026-0042",
            "text": "8aef286c9057f3ecd81ce18d96bf727c4b3140b218520e834d5474044e72309e",
            "to": "owner@oceaniccoder.dev",
          },
        },
        {
          "res": {
            "body": {
              "error": "Too many tries. Ask for a new code.",
              "newCodeNeeded": true,
              "triesLeft": 0,
            },
            "headers": {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
            "status": 429,
          },
        },
        "lock has qa:epoch:q-golden:2:1 -> false",
        "lock has qa:miss:q-golden:2:0:15 -> false",
        "lock take qa:try:AQEBAQEBAQEBAQEBAQEBAQ:1 -> false",
        "lock take qa:try:AQEBAQEBAQEBAQEBAQEBAQ:2 -> false",
        "lock take qa:try:AQEBAQEBAQEBAQEBAQEBAQ:3 -> false",
        "lock take qa:try:AQEBAQEBAQEBAQEBAQEBAQ:4 -> false",
        "lock take qa:try:AQEBAQEBAQEBAQEBAQEBAQ:5 -> false",
        {
          "res": {
            "body": {
              "error": "Too many tries. Ask for a new code.",
              "newCodeNeeded": true,
              "triesLeft": 0,
            },
            "headers": {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
            "status": 429,
          },
        },
        "lock has qa:epoch:q-golden:2:1 -> false",
        "lock has qa:miss:q-golden:2:0:15 -> false",
        "lock take qa:send:q-golden:2:0:g:59749563 -> true",
        "lock take qa:send:q-golden:2:0:g:59749564 -> true",
        "lock take qa:send:q-golden:2:0:g:59749565 -> true",
        "lock take qa:send:q-golden:2:0:h:497913:1 -> false",
        "lock take qa:send:q-golden:2:0:h:497913:2 -> true",
        "lock take qa:send:q-golden:2:0:d:20746:1 -> false",
        "lock take qa:send:q-golden:2:0:d:20746:2 -> true",
        {
          "mail": {
            "html": "66b63dbc6bc37205776632f5258bbd3ae5582eb096700455fd0d9f3868f0d11c",
            "subject": "678851 is your code for quote Q-2026-0042",
            "text": "c822950fa0cb06592cf7d27fff69eaa5bb1872d400d5b5b29b7aaddaa75c901b",
            "to": "kofi.mensah@hotmail.com",
          },
        },
        "log info: quote-access send quote=Q-2026-0042",
        {
          "res": {
            "body": {
              "challenge": "v1.eyJjIjoiQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZyIsInEiOiJxLWdvbGRlbiIsInIiOjIsImUiOjAsIm0iOiJCamx4S1dRaWpIN0d2ZGs5SjI5c1BxIiwieCI6MTc5MjQ4NzQ5MDAwMH0.4owK0Y7nrtlqjuzHQ7TOm0_TxZiuCUER6VlwcBv86ys",
              "expiresInSeconds": 600,
              "maskedEmail": "k•••••@hotmail.com",
              "retryAfterSeconds": 90,
            },
            "headers": {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
            "status": 200,
          },
        },
        "lock has qa:epoch:q-golden:2:1 -> false",
        "lock has qa:miss:q-golden:2:0:15 -> false",
        "lock take qa:try:AgICAgICAgICAgICAgICAg:1 -> true",
        "lock take qa:used:AgICAgICAgICAgICAgICAg -> true",
        "log info: quote-access verify ok quote=Q-2026-0042",
        {
          "res": {
            "body": {
              "ok": true,
            },
            "headers": {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
              "Set-Cookie": "__Secure-oc_qa_6160bcf209b6da75=v1.eyJxIjoicS1nb2xkZW4iLCJyIjoyLCJlIjowLCJtIjoiQmpseEtXUWlqSDdHdmRrOUoyOXNQcSIsIngiOjE3OTUwNzg4OTAwMDB9.0hEs79PhBhuq0XA4i8UcMXOpdAeq5icrY6sENHoWFUE; Max-Age=2592000; Path=/api; HttpOnly; Secure; SameSite=Strict",
            },
            "status": 200,
          },
        },
        "lock has qa:epoch:q-golden:2:1 -> false",
        "lock has qa:miss:q-golden:2:0:15 -> false",
        "lock take qa:try:AgICAgICAgICAgICAgICAg:1 -> false",
        "lock take qa:try:AgICAgICAgICAgICAgICAg:2 -> true",
        "lock take qa:used:AgICAgICAgICAgICAgICAg -> false",
        {
          "res": {
            "body": {
              "error": "That code has already been used. Ask for a new one.",
              "newCodeNeeded": true,
            },
            "headers": {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
            "status": 409,
          },
        },
        "lock has qa:epoch:q-golden:2:1 -> false",
        {
          "res": {
            "body": {
              "blocked": false,
              "canUnlock": true,
              "locked": false,
              "maskedEmail": "k•••••@hotmail.com",
            },
            "headers": {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
            "status": 200,
          },
        },
      ]
    `);
  });

  it("blocks after fifteen wrong codes and alerts once", async () => {
    const t = setup();
    for (let round = 0; round < 3; round += 1) {
      const sent = await t.call({ action: "send", token: TOKEN }, { ip: `198.51.100.${round}` });
      const code = t.lastCode();
      for (let i = 0; i < 5; i += 1)
        await t.call(
          { action: "verify", token: TOKEN, challenge: sent.body.challenge, code: wrongCode(code) },
          { ip: `198.51.100.${round}` },
        );
      t.clock.ms += 90 * 1000;
    }
    await t.call({ action: "send", token: TOKEN });
    await t.call({ action: "status", token: TOKEN });
    expect(t.transcript.filter((x) => typeof x !== "string" || !x.startsWith("lock ")))
      .toMatchInlineSnapshot(`
        [
          {
            "mail": {
              "html": "4e8f2f3186fea2a527c4eab7e3b7ce098c28d5a7198f34e2c9f909bef0eb8be5",
              "subject": "169255 is your code for quote Q-2026-0042",
              "text": "0d1560575bff7347e447c954c15fb2f7d4191c36f2940a7eb56bad71816dc156",
              "to": "kofi.mensah@hotmail.com",
            },
          },
          "log info: quote-access send quote=Q-2026-0042",
          {
            "res": {
              "body": {
                "challenge": "v1.eyJjIjoiQVFFQkFRRUJBUUVCQVFFQkFRRUJBUSIsInEiOiJxLWdvbGRlbiIsInIiOjIsImUiOjAsIm0iOiJCamx4S1dRaWpIN0d2ZGs5SjI5c1BxIiwieCI6MTc5MjQ4NzQwMDAwMH0.1dKkuwPkIiF5xbjNp56G10Pw2h5RtsW3kG_Wqu9yu2U",
                "expiresInSeconds": 600,
                "maskedEmail": "k•••••@hotmail.com",
                "retryAfterSeconds": 90,
              },
              "headers": {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
              "status": 200,
            },
          },
          "log info: quote-access verify quote=Q-2026-0042 triesLeft=4 misses=1",
          {
            "res": {
              "body": {
                "error": "That code isn't right. Check the email and try again.",
                "triesLeft": 4,
              },
              "headers": {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
              "status": 400,
            },
          },
          "log info: quote-access verify quote=Q-2026-0042 triesLeft=3 misses=2",
          {
            "res": {
              "body": {
                "error": "That code isn't right. Check the email and try again.",
                "triesLeft": 3,
              },
              "headers": {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
              "status": 400,
            },
          },
          "log info: quote-access verify quote=Q-2026-0042 triesLeft=2 misses=3",
          {
            "res": {
              "body": {
                "error": "That code isn't right. Check the email and try again.",
                "triesLeft": 2,
              },
              "headers": {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
              "status": 400,
            },
          },
          "log info: quote-access verify quote=Q-2026-0042 triesLeft=1 misses=4",
          {
            "res": {
              "body": {
                "error": "That code isn't right. Check the email and try again.",
                "triesLeft": 1,
              },
              "headers": {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
              "status": 400,
            },
          },
          "log info: quote-access verify quote=Q-2026-0042 triesLeft=0 misses=5",
          "log warn: quote-access lock quote=Q-2026-0042",
          {
            "mail": {
              "html": "d97ed54da4fa7abe4a304b68f34890b2abdb032ef225bb70e20adf81c3823557",
              "subject": "Code locked after 5 wrong tries on Q-2026-0042",
              "text": "8aef286c9057f3ecd81ce18d96bf727c4b3140b218520e834d5474044e72309e",
              "to": "owner@oceaniccoder.dev",
            },
          },
          {
            "res": {
              "body": {
                "error": "Too many tries. Ask for a new code.",
                "newCodeNeeded": true,
                "triesLeft": 0,
              },
              "headers": {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
              "status": 429,
            },
          },
          {
            "mail": {
              "html": "66b63dbc6bc37205776632f5258bbd3ae5582eb096700455fd0d9f3868f0d11c",
              "subject": "678851 is your code for quote Q-2026-0042",
              "text": "c822950fa0cb06592cf7d27fff69eaa5bb1872d400d5b5b29b7aaddaa75c901b",
              "to": "kofi.mensah@hotmail.com",
            },
          },
          "log info: quote-access send quote=Q-2026-0042",
          {
            "res": {
              "body": {
                "challenge": "v1.eyJjIjoiQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZyIsInEiOiJxLWdvbGRlbiIsInIiOjIsImUiOjAsIm0iOiJCamx4S1dRaWpIN0d2ZGs5SjI5c1BxIiwieCI6MTc5MjQ4NzQ5MDAwMH0.4owK0Y7nrtlqjuzHQ7TOm0_TxZiuCUER6VlwcBv86ys",
                "expiresInSeconds": 600,
                "maskedEmail": "k•••••@hotmail.com",
                "retryAfterSeconds": 90,
              },
              "headers": {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
              "status": 200,
            },
          },
          "log info: quote-access verify quote=Q-2026-0042 triesLeft=4 misses=6",
          {
            "res": {
              "body": {
                "error": "That code isn't right. Check the email and try again.",
                "triesLeft": 4,
              },
              "headers": {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
              "status": 400,
            },
          },
          "log info: quote-access verify quote=Q-2026-0042 triesLeft=3 misses=7",
          {
            "res": {
              "body": {
                "error": "That code isn't right. Check the email and try again.",
                "triesLeft": 3,
              },
              "headers": {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
              "status": 400,
            },
          },
          "log info: quote-access verify quote=Q-2026-0042 triesLeft=2 misses=8",
          {
            "res": {
              "body": {
                "error": "That code isn't right. Check the email and try again.",
                "triesLeft": 2,
              },
              "headers": {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
              "status": 400,
            },
          },
          "log info: quote-access verify quote=Q-2026-0042 triesLeft=1 misses=9",
          {
            "res": {
              "body": {
                "error": "That code isn't right. Check the email and try again.",
                "triesLeft": 1,
              },
              "headers": {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
              "status": 400,
            },
          },
          "log info: quote-access verify quote=Q-2026-0042 triesLeft=0 misses=10",
          "log warn: quote-access lock quote=Q-2026-0042",
          {
            "mail": {
              "html": "d97ed54da4fa7abe4a304b68f34890b2abdb032ef225bb70e20adf81c3823557",
              "subject": "Code locked after 5 wrong tries on Q-2026-0042",
              "text": "8aef286c9057f3ecd81ce18d96bf727c4b3140b218520e834d5474044e72309e",
              "to": "owner@oceaniccoder.dev",
            },
          },
          {
            "res": {
              "body": {
                "error": "Too many tries. Ask for a new code.",
                "newCodeNeeded": true,
                "triesLeft": 0,
              },
              "headers": {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
              "status": 429,
            },
          },
          {
            "mail": {
              "html": "509d5e2f3765835faf491d8ed88899687a97a72e4c4baf6b4ef5c19486d315c5",
              "subject": "680180 is your code for quote Q-2026-0042",
              "text": "b80e5cbd448ea343a8d9c3fc7f95c36f57b1c1627053c0a3c4c3a01749dc30be",
              "to": "kofi.mensah@hotmail.com",
            },
          },
          "log info: quote-access send quote=Q-2026-0042",
          {
            "res": {
              "body": {
                "challenge": "v1.eyJjIjoiQXdNREF3TURBd01EQXdNREF3TURBdyIsInEiOiJxLWdvbGRlbiIsInIiOjIsImUiOjAsIm0iOiJCamx4S1dRaWpIN0d2ZGs5SjI5c1BxIiwieCI6MTc5MjQ4NzU4MDAwMH0._J6JlAbxF7fuWCGkzJHI3lvSfbZwiyUlpSr9BoyrD_8",
                "expiresInSeconds": 600,
                "maskedEmail": "k•••••@hotmail.com",
                "retryAfterSeconds": 90,
              },
              "headers": {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
              "status": 200,
            },
          },
          "log info: quote-access verify quote=Q-2026-0042 triesLeft=4 misses=11",
          {
            "res": {
              "body": {
                "error": "That code isn't right. Check the email and try again.",
                "triesLeft": 4,
              },
              "headers": {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
              "status": 400,
            },
          },
          "log info: quote-access verify quote=Q-2026-0042 triesLeft=3 misses=12",
          {
            "res": {
              "body": {
                "error": "That code isn't right. Check the email and try again.",
                "triesLeft": 3,
              },
              "headers": {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
              "status": 400,
            },
          },
          "log info: quote-access verify quote=Q-2026-0042 triesLeft=2 misses=13",
          {
            "res": {
              "body": {
                "error": "That code isn't right. Check the email and try again.",
                "triesLeft": 2,
              },
              "headers": {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
              "status": 400,
            },
          },
          "log info: quote-access verify quote=Q-2026-0042 triesLeft=1 misses=14",
          {
            "res": {
              "body": {
                "error": "That code isn't right. Check the email and try again.",
                "triesLeft": 1,
              },
              "headers": {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
              "status": 400,
            },
          },
          "log info: quote-access verify quote=Q-2026-0042 triesLeft=0 misses=15",
          "log warn: quote-access blocked quote=Q-2026-0042",
          {
            "mail": {
              "html": "0d8c42744347bdb7da467d2e7b9e3dd837fd3f465faf1adb8f6430f4cd424057",
              "subject": "Codes blocked after 15 wrong tries on Q-2026-0042",
              "text": "01f7cdedebaf71bbaf46925752c52a3381d0d9fc0d83bb97e0306ffada951472",
              "to": "owner@oceaniccoder.dev",
            },
          },
          {
            "res": {
              "body": {
                "blocked": true,
                "error": "Too many wrong codes were entered on this link, so no more codes will be sent. Contact hello@oceaniccoder.dev for a new link.",
                "triesLeft": 0,
              },
              "headers": {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
              "status": 403,
            },
          },
          "log info: quote-access blocked quote=Q-2026-0042",
          {
            "res": {
              "body": {
                "blocked": true,
                "error": "Too many wrong codes were entered on this link, so no more codes will be sent. Contact hello@oceaniccoder.dev for a new link.",
              },
              "headers": {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
              "status": 403,
            },
          },
          {
            "res": {
              "body": {
                "blocked": true,
                "canUnlock": false,
                "locked": true,
                "maskedEmail": "k•••••@hotmail.com",
              },
              "headers": {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
              "status": 200,
            },
          },
        ]
      `);
  });

  it("hands the gap back when the email fails, without logging the address", async () => {
    const t = setup({ mailOk: false });
    await t.call({ action: "send", token: TOKEN });
    expect(t.transcript).toMatchInlineSnapshot(`
      [
        "lock has qa:epoch:q-golden:2:1 -> false",
        "lock has qa:miss:q-golden:2:0:15 -> false",
        "lock take qa:send:q-golden:2:0:g:59749560 -> true",
        "lock take qa:send:q-golden:2:0:g:59749561 -> true",
        "lock take qa:send:q-golden:2:0:g:59749562 -> true",
        "lock take qa:send:q-golden:2:0:h:497913:1 -> true",
        "lock take qa:send:q-golden:2:0:d:20746:1 -> true",
        {
          "mail": {
            "html": "4e8f2f3186fea2a527c4eab7e3b7ce098c28d5a7198f34e2c9f909bef0eb8be5",
            "subject": "169255 is your code for quote Q-2026-0042",
            "text": "0d1560575bff7347e447c954c15fb2f7d4191c36f2940a7eb56bad71816dc156",
            "to": "kofi.mensah@hotmail.com",
          },
        },
        "lock release qa:send:q-golden:2:0:g:59749560 -> true",
        "lock release qa:send:q-golden:2:0:g:59749561 -> true",
        "lock release qa:send:q-golden:2:0:g:59749562 -> true",
        "log error: quote-access send failed quote=Q-2026-0042: Resend refused [email]",
        {
          "res": {
            "body": {
              "error": "We couldn't send the code. Please try again in a minute.",
            },
            "headers": {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
            "status": 502,
          },
        },
      ]
    `);
  });

  it("refuses to send without a client email", async () => {
    const t = setup({ quotes: [{ ...QUOTE, clientEmail: "" }] });
    await t.call({ action: "status", token: TOKEN });
    await t.call({ action: "send", token: TOKEN });
    expect(t.transcript).toMatchInlineSnapshot(`
      [
        {
          "res": {
            "body": {
              "blocked": false,
              "canUnlock": false,
              "locked": true,
              "maskedEmail": null,
            },
            "headers": {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
            "status": 200,
          },
        },
        {
          "res": {
            "body": {
              "error": "This quote can't be opened with a code. Contact hello@oceaniccoder.dev to open it.",
              "noEmail": true,
            },
            "headers": {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
            "status": 409,
          },
        },
      ]
    `);
  });
});

describe("golden: quote-access claim", () => {
  it("claims a link code once, refuses a bad or used one", async () => {
    const t = setup();
    const linkCode = A.mintLinkCode(SECRET, QUOTE, 0, START);
    await t.call({ action: "claim", token: TOKEN, linkCode: "nope" });
    await t.call({ action: "claim", token: TOKEN, linkCode });
    await t.call({ action: "claim", token: TOKEN, linkCode });
    expect(t.transcript).toMatchInlineSnapshot(`
      [
        "log info: quote-access claim refused quote=Q-2026-0042 reason=invalid",
        {
          "res": {
            "body": {
              "codeNeeded": true,
              "error": "This link needs a code to open here. We'll email you one.",
            },
            "headers": {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
            "status": 400,
          },
        },
        "lock has qa:epoch:q-golden:2:1 -> false",
        "lock take qa:lk:AQEBAQEBAQEBAQEBAQEBAQ -> true",
        "log info: quote-access claim ok quote=Q-2026-0042",
        {
          "res": {
            "body": {
              "ok": true,
            },
            "headers": {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
              "Set-Cookie": "__Secure-oc_qa_6160bcf209b6da75=v1.eyJxIjoicS1nb2xkZW4iLCJyIjoyLCJlIjowLCJtIjoiQmpseEtXUWlqSDdHdmRrOUoyOXNQcSIsIngiOjE3OTUwNzg4MDAwMDB9.Vmdv_1mbDEkVFW9NKBbSvh0D2lxpbJNnWczYWfq3xRw; Max-Age=2592000; Path=/api; HttpOnly; Secure; SameSite=Strict",
            },
            "status": 200,
          },
        },
        "lock has qa:epoch:q-golden:2:1 -> false",
        "lock take qa:lk:AQEBAQEBAQEBAQEBAQEBAQ -> false",
        "log info: quote-access claim refused quote=Q-2026-0042 reason=used",
        {
          "res": {
            "body": {
              "codeNeeded": true,
              "error": "This link needs a code to open here. We'll email you one.",
            },
            "headers": {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
            "status": 409,
          },
        },
      ]
    `);
  });
});
