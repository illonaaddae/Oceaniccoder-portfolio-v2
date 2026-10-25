// @vitest-environment node
// Golden outputs of shared/quotes/access.js, recorded from origin/main before
// the access rules moved into shared/access/core.js. Every value here is
// already out in the world: cookies in client browsers, #k= link codes in sent
// emails, lock rows in Cosmos. If one of these changes, clients are signed
// out, sent links stop opening, or used link codes can be claimed again.
// Don't update a snapshot here to make a test pass; find what changed instead.
import { createRequire } from "module";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const require = createRequire(import.meta.url);
const crypto = require("crypto");
const { Buffer } = require("buffer");
const A = await import("./access.js");
const { createFakeLocks, createFakeRepo } = await import("./fakes.js");

const SECRET = "golden-secret-".padEnd(48, "x");
const NOW = Date.parse("2026-10-20T09:00:30.000Z");
const DAY = 24 * 3600 * 1000;
const QUOTE = {
  id: "q-golden",
  revision: 3,
  clientEmail: "  Kofi.Mensah@Example.com ",
  tokenHash: "b".repeat(64),
  quoteNumber: "Q-2026-0042",
};

// Every lock call in order, so a renamed key or a changed order shows up.
function recordingLocks(now = () => NOW) {
  const inner = createFakeLocks({ now });
  const ops = [];
  const wrap =
    (name) =>
    async (...args) => {
      const result = await inner[name](...args);
      ops.push(`${name} ${args[0]} -> ${JSON.stringify(result)}`);
      return result;
    };
  return {
    ops,
    held: inner.held,
    take: wrap("take"),
    has: wrap("has"),
    release: wrap("release"),
    listBefore: (...args) => inner.listBefore(...args),
  };
}

// randomBytes feeds challenge ids and link-code nonces; a fixed fill makes
// them, and everything signed over them, reproducible.
let fill;
beforeEach(() => {
  fill = 0;
  vi.spyOn(crypto, "randomBytes").mockImplementation((size) => {
    fill += 1;
    return Buffer.alloc(size, fill);
  });
});
afterEach(() => vi.restoreAllMocks());

const caught = async (fn) => {
  try {
    await fn();
  } catch (err) {
    return {
      name: err.constructor.name,
      status: err.status,
      message: err.message,
      extra: err.extra,
    };
  }
  return "no error";
};

describe("golden: exports and limits", () => {
  it("exports the same names and constants", () => {
    expect(Object.keys(A).sort()).toMatchInlineSnapshot(`
      [
        "CODE_TTL_MS",
        "LINK_CODE_TTL_MS",
        "MAX_MISSES",
        "MAX_TRIES",
        "accessSecret",
        "adminCheck",
        "bumpEpoch",
        "checkChallenge",
        "checkLinkCode",
        "claimLinkCode",
        "codeFor",
        "codeMatches",
        "currentEpoch",
        "default",
        "gateEnabled",
        "hasAccess",
        "issueChallenge",
        "maskEmail",
        "mintLinkCode",
        "normalEmail",
        "pruneAccessLocks",
        "recordMiss",
        "requireAccess",
        "sendsBlocked",
        "sessionCookie",
        "sessionCookieName",
        "takeSendSlots",
        "takeTry",
        "takeUse",
      ]
    `);
    expect({
      CODE_TTL_MS: A.CODE_TTL_MS,
      MAX_TRIES: A.MAX_TRIES,
      MAX_MISSES: A.MAX_MISSES,
      LINK_CODE_TTL_MS: A.LINK_CODE_TTL_MS,
    }).toMatchInlineSnapshot(`
      {
        "CODE_TTL_MS": 600000,
        "LINK_CODE_TTL_MS": 3888000000,
        "MAX_MISSES": 15,
        "MAX_TRIES": 5,
      }
    `);
  });
});

describe("golden: switches and errors", () => {
  it("gate and secret errors, and their log lines", async () => {
    const logs = [];
    const log = (m) => logs.push(m);
    expect(await caught(() => A.gateEnabled({ QUOTE_ACCESS_GATE: "OFF" }, log)))
      .toMatchInlineSnapshot(`
      {
        "extra": {},
        "message": "Quote links are unavailable right now. Please try again later.",
        "name": "HttpError",
        "status": 503,
      }
    `);
    expect(await caught(() => A.accessSecret({ QUOTE_ACCESS_SECRET: "short" }, log)))
      .toMatchInlineSnapshot(`
      {
        "extra": {},
        "message": "Quote links are unavailable right now. Please try again later.",
        "name": "HttpError",
        "status": 503,
      }
    `);
    expect(logs).toMatchInlineSnapshot(`
      [
        "quote-access: QUOTE_ACCESS_GATE must be "on" or "off"",
        "quote-access: QUOTE_ACCESS_SECRET is missing or shorter than 32 characters",
      ]
    `);
    expect(A.gateEnabled({ QUOTE_ACCESS_GATE: "off" })).toBe(false);
    expect(A.gateEnabled({})).toBe(true);
    expect(A.accessSecret({ QUOTE_ACCESS_SECRET: SECRET })).toBe(SECRET);
  });

  it("requireAccess answers 401 locked with nothing from the quote", async () => {
    const locks = recordingLocks();
    const env = { QUOTE_ACCESS_SECRET: SECRET };
    const req = { headers: {} };
    expect(await caught(() => A.requireAccess({ env, locks, req, quote: QUOTE, nowMs: NOW })))
      .toMatchInlineSnapshot(`
      {
        "extra": {
          "locked": true,
        },
        "message": "Enter the code we email you to open this quote.",
        "name": "HttpError",
        "status": 401,
      }
    `);
    expect(
      await A.requireAccess({
        env: { QUOTE_ACCESS_GATE: "off" },
        locks,
        req,
        quote: QUOTE,
        nowMs: NOW,
      }),
    ).toBe("off");
    expect(
      await A.requireAccess({
        env,
        locks,
        req,
        quote: QUOTE,
        nowMs: NOW,
        isAdmin: async () => true,
      }),
    ).toBe("admin");
    expect(locks.ops).toMatchInlineSnapshot(`[]`);
  });

  it("adminCheck runs requireAdmin only for admin=1", async () => {
    expect(A.adminCheck(async () => ({ user: {} }), {}, {}, "0")).toBeNull();
    expect(await A.adminCheck(async () => ({ user: {} }), {}, {}, "1")()).toBe(true);
    expect(await A.adminCheck(async () => null, {}, {}, "1")()).toBe(false);
  });

  it("masks emails", () => {
    expect(
      ["  Kofi.Mensah@Example.com ", "ama@gmail.com", "x@gmx.de", "x@localhost", "nope", ""].map(
        A.maskEmail,
      ),
    ).toMatchInlineSnapshot(`
      [
        "k•••••@e•••••.com",
        "a•••••@gmail.com",
        "x•••••@gmx.de",
        "x•••••@l•••••",
        null,
        null,
      ]
    `);
    expect(A.normalEmail(QUOTE.clientEmail)).toBe("kofi.mensah@example.com");
  });
});

describe("golden: codes and challenges", () => {
  it("derives the same 6-digit codes", () => {
    expect(["abc", "AQEBAQEBAQEBAQEBAQEBAQ", ""].map((c) => A.codeFor(SECRET, c)))
      .toMatchInlineSnapshot(`
      [
        "239787",
        "169255",
        "826491",
      ]
    `);
  });

  it("issues the same challenge", () => {
    expect(A.issueChallenge(SECRET, QUOTE, 2, NOW)).toMatchInlineSnapshot(`
      {
        "challenge": "v1.eyJjIjoiQVFFQkFRRUJBUUVCQVFFQkFRRUJBUSIsInEiOiJxLWdvbGRlbiIsInIiOjMsImUiOjIsIm0iOiJ3MmYzcjM1OTJybmVpcXhPN0JpWTcwIiwieCI6MTc5MjQ4NzQzMDAwMH0.yEIgVhzT_cyOe93rFsULP8AryqM5jUDTrJnI6O7BDdU",
        "challengeId": "AQEBAQEBAQEBAQEBAQEBAQ",
        "code": "169255",
      }
    `);
  });

  it("checks a challenge main issued", async () => {
    const { challenge } = A.issueChallenge(SECRET, QUOTE, 2, NOW);
    const locks = recordingLocks();
    await locks.take(`qa:epoch:${QUOTE.id}:${QUOTE.revision}:1`);
    await locks.take(`qa:epoch:${QUOTE.id}:${QUOTE.revision}:2`);
    const check = (over = {}) =>
      A.checkChallenge({ secret: SECRET, locks, quote: QUOTE, challenge, nowMs: NOW, ...over });
    expect({
      ok: await check(),
      expired: await check({ nowMs: NOW + A.CODE_TTL_MS }),
      otherRevision: await check({ quote: { ...QUOTE, revision: 4 } }),
      otherEmail: await check({ quote: { ...QUOTE, clientEmail: "other@example.com" } }),
      otherSecret: await check({ secret: "y".repeat(40) }),
      garbage: await check({ challenge: "v1.e30.AAAA" }),
    }).toMatchInlineSnapshot(`
      {
        "expired": {
          "ok": false,
          "reason": "expired",
        },
        "garbage": {
          "ok": false,
          "reason": "invalid",
        },
        "ok": {
          "challengeId": "AQEBAQEBAQEBAQEBAQEBAQ",
          "epoch": 2,
          "ok": true,
        },
        "otherEmail": {
          "ok": false,
          "reason": "stale",
        },
        "otherRevision": {
          "ok": false,
          "reason": "stale",
        },
        "otherSecret": {
          "ok": false,
          "reason": "invalid",
        },
      }
    `);
    await locks.take(`qa:epoch:${QUOTE.id}:${QUOTE.revision}:3`);
    expect(await check()).toMatchInlineSnapshot(`
      {
        "ok": false,
        "reason": "stale",
      }
    `);
    expect(locks.ops).toMatchInlineSnapshot(`
      [
        "take qa:epoch:q-golden:3:1 -> true",
        "take qa:epoch:q-golden:3:2 -> true",
        "has qa:epoch:q-golden:3:3 -> false",
        "take qa:epoch:q-golden:3:3 -> true",
        "has qa:epoch:q-golden:3:3 -> true",
      ]
    `);
    const id = "AQEBAQEBAQEBAQEBAQEBAQ";
    const right = A.codeFor(SECRET, id);
    const wrong = String((Number(right) + 1) % 1000000).padStart(6, "0");
    expect([A.codeMatches(SECRET, id, right), A.codeMatches(SECRET, id, wrong)]).toEqual([
      true,
      false,
    ]);
  });
});

describe("golden: lock rows", () => {
  it("epochs", async () => {
    const locks = recordingLocks();
    expect(await A.currentEpoch(locks, QUOTE)).toBe(0);
    expect(await A.bumpEpoch(locks, QUOTE)).toBe(1);
    expect(await A.bumpEpoch(locks, QUOTE)).toBe(2);
    expect(await A.currentEpoch(locks, QUOTE)).toBe(2);
    expect(locks.ops).toMatchInlineSnapshot(`
      [
        "has qa:epoch:q-golden:3:1 -> false",
        "has qa:epoch:q-golden:3:1 -> false",
        "take qa:epoch:q-golden:3:1 -> true",
        "has qa:epoch:q-golden:3:1 -> true",
        "has qa:epoch:q-golden:3:2 -> false",
        "take qa:epoch:q-golden:3:2 -> true",
        "has qa:epoch:q-golden:3:1 -> true",
        "has qa:epoch:q-golden:3:2 -> true",
        "has qa:epoch:q-golden:3:3 -> false",
      ]
    `);
  });

  it("tries, single use, misses and the block", async () => {
    const locks = recordingLocks();
    const tries = [];
    for (let i = 0; i < 6; i += 1) tries.push(await A.takeTry(locks, "cid"));
    expect(tries).toEqual([1, 2, 3, 4, 5, 0]);
    expect([await A.takeUse(locks, "cid"), await A.takeUse(locks, "cid")]).toEqual([true, false]);
    expect(await A.recordMiss(locks, QUOTE, 1)).toBe(1);
    expect(await A.sendsBlocked(locks, QUOTE, 1)).toBe(false);
    expect(locks.ops).toMatchInlineSnapshot(`
      [
        "take qa:try:cid:1 -> true",
        "take qa:try:cid:1 -> false",
        "take qa:try:cid:2 -> true",
        "take qa:try:cid:1 -> false",
        "take qa:try:cid:2 -> false",
        "take qa:try:cid:3 -> true",
        "take qa:try:cid:1 -> false",
        "take qa:try:cid:2 -> false",
        "take qa:try:cid:3 -> false",
        "take qa:try:cid:4 -> true",
        "take qa:try:cid:1 -> false",
        "take qa:try:cid:2 -> false",
        "take qa:try:cid:3 -> false",
        "take qa:try:cid:4 -> false",
        "take qa:try:cid:5 -> true",
        "take qa:try:cid:1 -> false",
        "take qa:try:cid:2 -> false",
        "take qa:try:cid:3 -> false",
        "take qa:try:cid:4 -> false",
        "take qa:try:cid:5 -> false",
        "take qa:used:cid -> true",
        "take qa:used:cid -> false",
        "take qa:miss:q-golden:3:1:1 -> true",
        "has qa:miss:q-golden:3:1:15 -> false",
      ]
    `);
    const misses = [];
    for (let i = 1; i < A.MAX_MISSES + 1; i += 1) misses.push(await A.recordMiss(locks, QUOTE, 1));
    expect(misses.slice(-2)).toEqual([15, 0]);
    expect(await A.sendsBlocked(locks, QUOTE, 1)).toBe(true);
    expect([...locks.held].filter((k) => k.startsWith("qa:miss:")).slice(-1))
      .toMatchInlineSnapshot(`
      [
        "qa:miss:q-golden:3:1:15",
      ]
    `);
  });

  it("send quotas: gap, hour and day", async () => {
    const clock = { ms: NOW };
    const locks = recordingLocks(() => clock.ms);
    const results = [];
    const take = async () => {
      const r = await A.takeSendSlots(locks, QUOTE, 2, clock.ms);
      results.push({ ok: r.ok, retryAfterSeconds: r.retryAfterSeconds });
      return r;
    };
    await take();
    await take();
    expect(locks.ops).toMatchInlineSnapshot(`
      [
        "take qa:send:q-golden:3:2:g:59749561 -> true",
        "take qa:send:q-golden:3:2:g:59749562 -> true",
        "take qa:send:q-golden:3:2:g:59749563 -> true",
        "take qa:send:q-golden:3:2:h:497913:1 -> true",
        "take qa:send:q-golden:3:2:d:20746:1 -> true",
        "take qa:send:q-golden:3:2:g:59749561 -> false",
        "has qa:send:q-golden:3:2:g:59749561 -> true",
        "has qa:send:q-golden:3:2:g:59749562 -> true",
        "has qa:send:q-golden:3:2:g:59749563 -> true",
      ]
    `);
    locks.ops.length = 0;
    const third = await (async () => {
      clock.ms += 90 * 1000;
      return take();
    })();
    await third.releaseGap();
    expect(locks.ops).toMatchInlineSnapshot(`
      [
        "take qa:send:q-golden:3:2:g:59749564 -> true",
        "take qa:send:q-golden:3:2:g:59749565 -> true",
        "take qa:send:q-golden:3:2:g:59749566 -> true",
        "take qa:send:q-golden:3:2:h:497913:1 -> false",
        "take qa:send:q-golden:3:2:h:497913:2 -> true",
        "take qa:send:q-golden:3:2:d:20746:1 -> false",
        "take qa:send:q-golden:3:2:d:20746:2 -> true",
        "release qa:send:q-golden:3:2:g:59749564 -> true",
        "release qa:send:q-golden:3:2:g:59749565 -> true",
        "release qa:send:q-golden:3:2:g:59749566 -> true",
      ]
    `);
    for (let i = 0; i < 4; i += 1) {
      clock.ms += 90 * 1000;
      await take();
    }
    clock.ms = NOW + 3600 * 1000;
    for (let i = 0; i < 6; i += 1) {
      await take();
      clock.ms += 90 * 1000;
    }
    expect(results).toMatchInlineSnapshot(`
      [
        {
          "ok": true,
          "retryAfterSeconds": 90,
        },
        {
          "ok": false,
          "retryAfterSeconds": 90,
        },
        {
          "ok": true,
          "retryAfterSeconds": 90,
        },
        {
          "ok": true,
          "retryAfterSeconds": 90,
        },
        {
          "ok": true,
          "retryAfterSeconds": 90,
        },
        {
          "ok": true,
          "retryAfterSeconds": 90,
        },
        {
          "ok": false,
          "retryAfterSeconds": 3120,
        },
        {
          "ok": true,
          "retryAfterSeconds": 90,
        },
        {
          "ok": true,
          "retryAfterSeconds": 90,
        },
        {
          "ok": true,
          "retryAfterSeconds": 90,
        },
        {
          "ok": true,
          "retryAfterSeconds": 90,
        },
        {
          "ok": true,
          "retryAfterSeconds": 90,
        },
        {
          "ok": false,
          "retryAfterSeconds": 3120,
        },
      ]
    `);
    expect([...locks.held].sort()).toMatchInlineSnapshot(`
      [
        "qa:send:q-golden:3:2:d:20746:1",
        "qa:send:q-golden:3:2:d:20746:10",
        "qa:send:q-golden:3:2:d:20746:2",
        "qa:send:q-golden:3:2:d:20746:3",
        "qa:send:q-golden:3:2:d:20746:4",
        "qa:send:q-golden:3:2:d:20746:5",
        "qa:send:q-golden:3:2:d:20746:6",
        "qa:send:q-golden:3:2:d:20746:7",
        "qa:send:q-golden:3:2:d:20746:8",
        "qa:send:q-golden:3:2:d:20746:9",
        "qa:send:q-golden:3:2:g:59749561",
        "qa:send:q-golden:3:2:g:59749562",
        "qa:send:q-golden:3:2:g:59749563",
        "qa:send:q-golden:3:2:g:59749567",
        "qa:send:q-golden:3:2:g:59749568",
        "qa:send:q-golden:3:2:g:59749569",
        "qa:send:q-golden:3:2:g:59749570",
        "qa:send:q-golden:3:2:g:59749571",
        "qa:send:q-golden:3:2:g:59749572",
        "qa:send:q-golden:3:2:g:59749573",
        "qa:send:q-golden:3:2:g:59749574",
        "qa:send:q-golden:3:2:g:59749575",
        "qa:send:q-golden:3:2:g:59749681",
        "qa:send:q-golden:3:2:g:59749682",
        "qa:send:q-golden:3:2:g:59749683",
        "qa:send:q-golden:3:2:g:59749684",
        "qa:send:q-golden:3:2:g:59749685",
        "qa:send:q-golden:3:2:g:59749686",
        "qa:send:q-golden:3:2:g:59749687",
        "qa:send:q-golden:3:2:g:59749688",
        "qa:send:q-golden:3:2:g:59749689",
        "qa:send:q-golden:3:2:g:59749690",
        "qa:send:q-golden:3:2:g:59749691",
        "qa:send:q-golden:3:2:g:59749692",
        "qa:send:q-golden:3:2:g:59749693",
        "qa:send:q-golden:3:2:g:59749694",
        "qa:send:q-golden:3:2:g:59749695",
        "qa:send:q-golden:3:2:h:497913:1",
        "qa:send:q-golden:3:2:h:497913:2",
        "qa:send:q-golden:3:2:h:497913:3",
        "qa:send:q-golden:3:2:h:497913:4",
        "qa:send:q-golden:3:2:h:497913:5",
        "qa:send:q-golden:3:2:h:497914:1",
        "qa:send:q-golden:3:2:h:497914:2",
        "qa:send:q-golden:3:2:h:497914:3",
        "qa:send:q-golden:3:2:h:497914:4",
        "qa:send:q-golden:3:2:h:497914:5",
      ]
    `);
  });
});

describe("golden: link codes", () => {
  it("mints the same link code", () => {
    expect(A.mintLinkCode(SECRET, QUOTE, 2, NOW)).toMatchInlineSnapshot(
      `"AQEBAQEBAQEBAQEBAQEBAQ.mvggdltc.QhiK5q342SxYpWHVQo5utTrxcCyYh86Cv50Qln7_z04"`,
    );
  });

  it("checks and claims a link code main minted", async () => {
    const linkCode = A.mintLinkCode(SECRET, QUOTE, 2, NOW);
    const locks = recordingLocks();
    await locks.take(`qa:epoch:${QUOTE.id}:${QUOTE.revision}:1`);
    await locks.take(`qa:epoch:${QUOTE.id}:${QUOTE.revision}:2`);
    const check = (over = {}) =>
      A.checkLinkCode({ secret: SECRET, locks, quote: QUOTE, linkCode, nowMs: NOW, ...over });
    expect({
      ok: await check(),
      skewed: await check({ nowMs: NOW - 5 * 60 * 1000 }),
      tooEarly: await check({ nowMs: NOW - 5 * 60 * 1000 - 1 }),
      lastMs: await check({ nowMs: NOW + A.LINK_CODE_TTL_MS - 1 }),
      expired: await check({ nowMs: NOW + A.LINK_CODE_TTL_MS }),
      otherLink: await check({ quote: { ...QUOTE, tokenHash: "c".repeat(64) } }),
      otherEmail: await check({ quote: { ...QUOTE, clientEmail: "x@example.com" } }),
      bad: await check({ linkCode: "x.y.z" }),
    }).toMatchInlineSnapshot(`
      {
        "bad": {
          "ok": false,
          "reason": "invalid",
        },
        "expired": {
          "ok": false,
          "reason": "expired",
        },
        "lastMs": {
          "epoch": 2,
          "nonce": "AQEBAQEBAQEBAQEBAQEBAQ",
          "ok": true,
        },
        "ok": {
          "epoch": 2,
          "nonce": "AQEBAQEBAQEBAQEBAQEBAQ",
          "ok": true,
        },
        "otherEmail": {
          "ok": false,
          "reason": "invalid",
        },
        "otherLink": {
          "ok": false,
          "reason": "invalid",
        },
        "skewed": {
          "epoch": 2,
          "nonce": "AQEBAQEBAQEBAQEBAQEBAQ",
          "ok": true,
        },
        "tooEarly": {
          "ok": false,
          "reason": "expired",
        },
      }
    `);
    const { nonce } = await check();
    expect([await A.claimLinkCode(locks, nonce), await A.claimLinkCode(locks, nonce)]).toEqual([
      true,
      false,
    ]);
    expect(locks.ops.filter((op) => !op.startsWith("has"))).toMatchInlineSnapshot(`
      [
        "take qa:epoch:q-golden:3:1 -> true",
        "take qa:epoch:q-golden:3:2 -> true",
        "take qa:lk:AQEBAQEBAQEBAQEBAQEBAQ -> true",
        "take qa:lk:AQEBAQEBAQEBAQEBAQEBAQ -> false",
      ]
    `);
  });
});

describe("golden: session cookie", () => {
  it("sets the same cookie", () => {
    expect(A.sessionCookieName(QUOTE.id)).toMatchInlineSnapshot(
      `"__Secure-oc_qa_6160bcf209b6da75"`,
    );
    expect(A.sessionCookie(SECRET, QUOTE, 2, NOW)).toMatchInlineSnapshot(
      `"__Secure-oc_qa_6160bcf209b6da75=v1.eyJxIjoicS1nb2xkZW4iLCJyIjozLCJlIjoyLCJtIjoidzJmM3IzNTkycm5laXF4TzdCaVk3MCIsIngiOjE3OTUwNzg4MzAwMDB9.2U37hT0kIOoiYmX5j4ornMqAOc6lpc2jZkFYArTzKd4; Max-Age=2592000; Path=/api; HttpOnly; Secure; SameSite=Strict"`,
    );
  });

  it("accepts the cookie main set, and only for its quote, revision, epoch and email", async () => {
    const cookie = A.sessionCookie(SECRET, QUOTE, 2, NOW).split(";")[0];
    const req = { headers: { cookie: `other=1; ${cookie}; more=2` } };
    const locks = recordingLocks();
    await locks.take(`qa:epoch:${QUOTE.id}:${QUOTE.revision}:1`);
    await locks.take(`qa:epoch:${QUOTE.id}:${QUOTE.revision}:2`);
    const has = (over = {}) =>
      A.hasAccess({ secret: SECRET, locks, req, quote: QUOTE, nowMs: NOW + 1000, ...over });
    expect({
      ok: await has(),
      expired: await has({ nowMs: NOW + 30 * DAY }),
      otherRevision: await has({ quote: { ...QUOTE, revision: 4 } }),
      otherEmail: await has({ quote: { ...QUOTE, clientEmail: "x@example.com" } }),
      otherQuote: await has({ quote: { ...QUOTE, id: "q-other" } }),
    }).toMatchInlineSnapshot(`
      {
        "expired": false,
        "ok": true,
        "otherEmail": false,
        "otherQuote": false,
        "otherRevision": false,
      }
    `);
    const env = { QUOTE_ACCESS_SECRET: SECRET };
    expect(await A.requireAccess({ env, locks, req, quote: QUOTE, nowMs: NOW + 1000 })).toBe(
      "session",
    );
    await locks.take(`qa:epoch:${QUOTE.id}:${QUOTE.revision}:3`);
    expect(await has()).toBe(false);
    expect(locks.ops).toMatchInlineSnapshot(`
      [
        "take qa:epoch:q-golden:3:1 -> true",
        "take qa:epoch:q-golden:3:2 -> true",
        "has qa:epoch:q-golden:3:3 -> false",
        "has qa:epoch:q-golden:3:3 -> false",
        "take qa:epoch:q-golden:3:3 -> true",
        "has qa:epoch:q-golden:3:3 -> true",
      ]
    `);
  });
});

describe("golden: prune", () => {
  it("deletes and keeps the same rows", async () => {
    const clock = { ms: NOW };
    const locks = recordingLocks(() => clock.ms);
    const repo = createFakeRepo({ quotes: [{ ...QUOTE }] });
    const get = vi.spyOn(repo, "get");
    for (const key of [
      "qa:send:q-golden:3:0:g:1",
      "qa:try:cid:1",
      "qa:used:cid",
      "qa:lk:old",
      "qa:miss:q-golden:3:0:1",
      "qa:miss:q-golden:3:1:1",
      "qa:miss:q-golden:2:1:1",
      "qa:miss:gone:0:0:1",
      "qa:miss:with:colon:3:0:1",
      "qa:miss:broken",
      "qa:epoch:q-golden:3:1",
      "settle:REF-1",
    ])
      await locks.take(key);
    clock.ms += A.LINK_CODE_TTL_MS;
    await locks.take("qa:lk:young");
    await locks.take("qa:try:young:1");
    clock.ms += 5 * 60 * 1000 + DAY;
    locks.ops.length = 0;
    expect(await A.pruneAccessLocks({ locks, repo, nowMs: clock.ms })).toMatchInlineSnapshot(`
      {
        "deleted": 9,
        "kept": 4,
        "skipped": 1,
      }
    `);
    expect(get.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "q-golden",
        ],
        [
          "gone",
        ],
        [
          "with:colon",
        ],
      ]
    `);
    expect(locks.ops).toMatchInlineSnapshot(`
      [
        "release qa:send:q-golden:3:0:g:1 -> true",
        "release qa:try:cid:1 -> true",
        "release qa:used:cid -> true",
        "release qa:lk:old -> true",
        "has qa:epoch:q-golden:3:1 -> true",
        "has qa:epoch:q-golden:3:2 -> false",
        "release qa:miss:q-golden:3:0:1 -> true",
        "has qa:epoch:q-golden:3:1 -> true",
        "has qa:epoch:q-golden:3:2 -> false",
        "release qa:miss:q-golden:2:1:1 -> true",
        "release qa:miss:gone:0:0:1 -> true",
        "release qa:miss:with:colon:3:0:1 -> true",
        "release qa:try:young:1 -> true",
      ]
    `);
    expect([...locks.held].sort()).toMatchInlineSnapshot(`
      [
        "qa:epoch:q-golden:3:1",
        "qa:lk:young",
        "qa:miss:broken",
        "qa:miss:q-golden:3:1:1",
        "settle:REF-1",
      ]
    `);
  });
});
