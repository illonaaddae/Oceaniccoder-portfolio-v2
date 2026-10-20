// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const crypto = await import("crypto");
const A = await import("./access.js");
const { createFakeLocks } = await import("./fakes.js");

const SECRET = "s".repeat(32);
const NOW = Date.parse("2026-10-20T09:00:30.000Z");
const QUOTE = { id: "q1", revision: 2, clientEmail: "Kofi@Example.com", tokenHash: "a".repeat(64) };

const cookieFor = (header) => ({ headers: { cookie: header.split(";")[0] } });

function tamper(token, index) {
  const parts = token.split(".");
  const chars = parts[index].split("");
  chars[2] = chars[2] === "A" ? "B" : "A";
  parts[index] = chars.join("");
  return parts.join(".");
}

describe("gateEnabled (QUOTE_ACCESS_GATE)", () => {
  it.each([undefined, "", "on"])("is on for %j", (value) => {
    expect(A.gateEnabled({ QUOTE_ACCESS_GATE: value })).toBe(true);
  });
  it("is off only for off", () => {
    expect(A.gateEnabled({ QUOTE_ACCESS_GATE: "off" })).toBe(false);
  });
  it("answers 503 for any other value instead of guessing, and logs it once", () => {
    const log = vi.fn();
    for (const value of ["OFF", "0", "false", "no"]) {
      let caught;
      try {
        A.gateEnabled({ QUOTE_ACCESS_GATE: value }, log);
      } catch (err) {
        caught = err;
      }
      expect(caught).toMatchObject({ status: 503 });
    }
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).toContain("QUOTE_ACCESS_GATE");
  });
});

describe("accessSecret (QUOTE_ACCESS_SECRET)", () => {
  it("returns a secret of 32 or more characters", () => {
    expect(A.accessSecret({ QUOTE_ACCESS_SECRET: SECRET })).toBe(SECRET);
  });
  it("answers 503 when missing or short, and logs it once", () => {
    const log = vi.fn();
    for (const env of [{}, { QUOTE_ACCESS_SECRET: "s".repeat(31) }]) {
      let caught;
      try {
        A.accessSecret(env, log);
      } catch (err) {
        caught = err;
      }
      expect(caught).toMatchObject({ status: 503 });
    }
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).not.toContain("s".repeat(31));
  });
});

describe("maskEmail", () => {
  it.each([
    ["peter.mensah@hotmail.com", "p•••••@hotmail.com"],
    ["  Ama@Gmail.com ", "a•••••@gmail.com"],
    ["x@y.co", "x•••••@y.co"],
  ])("masks %j as %j", (email, masked) => {
    expect(A.maskEmail(email)).toBe(masked);
  });
  it.each(["", null, undefined, "no-at-sign", "@domain.com", "name@"])("gives null for %j", (v) => {
    expect(A.maskEmail(v)).toBeNull();
  });
});

describe("codes", () => {
  it("derives a 6-digit code from the challenge id and the secret", () => {
    const code = A.codeFor(SECRET, "cid-1");
    expect(code).toMatch(/^\d{6}$/);
    expect(A.codeFor(SECRET, "cid-1")).toBe(code);
    expect(A.codeFor("t".repeat(32), "cid-1")).not.toBe(code);
  });
  it("matches only the right code", () => {
    const code = A.codeFor(SECRET, "cid-1");
    expect(A.codeMatches(SECRET, "cid-1", code)).toBe(true);
    const wrong = String((Number(code) + 1) % 1000000).padStart(6, "0");
    expect(A.codeMatches(SECRET, "cid-1", wrong)).toBe(false);
    expect(A.codeMatches(SECRET, "cid-1", "12345")).toBe(false);
  });
  it("puts only a keyed email tag in challenge and session payloads", () => {
    const plain = crypto.createHash("sha256").update("qa-mail:kofi@example.com").digest("hex");
    const { challenge } = A.issueChallenge(SECRET, QUOTE, 0, NOW);
    const session = A.sessionCookie(SECRET, QUOTE, 0, NOW).split(";")[0].split("=")[1];
    const tags = [challenge, session].map(
      (t) => JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).m,
    );
    expect(tags[0]).toBe(tags[1]);
    for (const tag of tags) {
      expect(tag).toMatch(/^[\w-]{22}$/);
      expect(plain).not.toContain(tag);
      expect(tag).not.toMatch(/kofi|example/i);
    }
    const tagOf = (t) => JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).m;
    const otherSecret = A.issueChallenge("t".repeat(32), QUOTE, 0, NOW).challenge;
    expect(tagOf(otherSecret)).not.toBe(tags[0]);
    // Same client on another quote: a different tag, so tokens don't link quotes.
    const otherQuote = A.issueChallenge(SECRET, { ...QUOTE, id: "q9" }, 0, NOW).challenge;
    expect(tagOf(otherQuote)).not.toBe(tags[0]);
  });

  it("keeps the code out of the challenge token", () => {
    const { challenge, code } = A.issueChallenge(SECRET, QUOTE, 0, NOW);
    const body = Buffer.from(challenge.split(".")[1], "base64url").toString();
    expect(body).not.toContain(code);
    expect(body).not.toContain("kofi");
  });
});

describe("checkChallenge", () => {
  const check = (locks, challenge, overrides = {}) =>
    A.checkChallenge({
      secret: SECRET,
      locks,
      quote: { ...QUOTE, ...overrides.quote },
      challenge,
      nowMs: overrides.nowMs ?? NOW,
    });

  it("accepts a fresh challenge for the same quote, revision, epoch and email", async () => {
    const locks = createFakeLocks();
    const { challenge, challengeId } = A.issueChallenge(SECRET, QUOTE, 0, NOW);
    expect(await check(locks, challenge)).toEqual({ ok: true, challengeId, epoch: 0 });
  });

  it("refuses a tampered body or signature, and a token signed with another secret", async () => {
    const locks = createFakeLocks();
    const { challenge } = A.issueChallenge(SECRET, QUOTE, 0, NOW);
    const other = A.issueChallenge("t".repeat(32), QUOTE, 0, NOW).challenge;
    for (const bad of [tamper(challenge, 1), tamper(challenge, 2), other, "v1.x.y", "", null]) {
      expect(await check(locks, bad)).toEqual({ ok: false, reason: "invalid" });
    }
  });

  it("refuses a session cookie value presented as a challenge", async () => {
    const value = A.sessionCookie(SECRET, QUOTE, 0, NOW).split(";")[0].split("=")[1];
    expect(await check(createFakeLocks(), value)).toEqual({ ok: false, reason: "invalid" });
  });

  it("refuses it after 10 minutes", async () => {
    const { challenge } = A.issueChallenge(SECRET, QUOTE, 0, NOW);
    const late = await check(createFakeLocks(), challenge, { nowMs: NOW + A.CODE_TTL_MS });
    expect(late).toEqual({ ok: false, reason: "expired" });
    const justIn = await check(createFakeLocks(), challenge, { nowMs: NOW + A.CODE_TTL_MS - 1 });
    expect(justIn.ok).toBe(true);
  });

  it("refuses it for another quote, a new revision or a changed client email", async () => {
    const { challenge } = A.issueChallenge(SECRET, QUOTE, 0, NOW);
    const locks = createFakeLocks();
    for (const quote of [{ id: "q2" }, { revision: 3 }, { clientEmail: "new@example.com" }]) {
      expect(await check(locks, challenge, { quote })).toEqual({ ok: false, reason: "stale" });
    }
    expect(
      (await check(locks, challenge, { quote: { clientEmail: " kofi@example.COM" } })).ok,
    ).toBe(true);
  });

  it("refuses it after a rotate but not after a new token alone", async () => {
    const locks = createFakeLocks();
    const { challenge } = A.issueChallenge(SECRET, QUOTE, 0, NOW);
    expect((await check(locks, challenge, { quote: { tokenHash: "b".repeat(64) } })).ok).toBe(true);
    await A.bumpEpoch(locks, QUOTE);
    expect(await check(locks, challenge)).toEqual({ ok: false, reason: "stale" });
  });
});

describe("tries and single use", () => {
  it("gives out five try slots per challenge, then none", async () => {
    const locks = createFakeLocks();
    const got = [];
    for (let i = 0; i < 6; i += 1) got.push(await A.takeTry(locks, "cid"));
    expect(got).toEqual([1, 2, 3, 4, 5, 0]);
    expect(await A.takeTry(locks, "other")).toBe(1);
  });

  it("lets at most five of many parallel verifies through", async () => {
    const locks = createFakeLocks();
    const got = await Promise.all(Array.from({ length: 10 }, () => A.takeTry(locks, "cid")));
    expect(got.filter(Boolean).sort()).toEqual([1, 2, 3, 4, 5]);
    expect(got.filter((n) => n === 0)).toHaveLength(5);
  });

  it("uses a challenge once", async () => {
    const locks = createFakeLocks();
    expect(await A.takeUse(locks, "cid")).toBe(true);
    expect(await A.takeUse(locks, "cid")).toBe(false);
  });
});

describe("takeSendSlots", () => {
  const slots = (locks, nowMs, quote = QUOTE, epoch = 0) =>
    A.takeSendSlots(locks, quote, epoch, nowMs);

  it("keeps code emails at least 60 seconds apart, rolling rather than per clock minute", async () => {
    const locks = createFakeLocks();
    const start = Date.parse("2026-10-20T09:00:59.000Z");
    const first = await slots(locks, start);
    expect(first).toMatchObject({ ok: true, retryAfterSeconds: 61 });
    // Two seconds later, across the clock minute: still refused.
    expect(await slots(locks, start + 2000)).toEqual({ ok: false, retryAfterSeconds: 59 });
    expect((await slots(locks, start + 59 * 1000)).ok).toBe(false);
    expect((await slots(locks, start + 61 * 1000)).ok).toBe(true);
  });

  it("lets only one of two concurrent sends through", async () => {
    const locks = createFakeLocks();
    const both = await Promise.all([slots(locks, NOW), slots(locks, NOW + 15 * 1000)]);
    expect(both.filter((r) => r.ok)).toHaveLength(1);
  });

  it("counts per quote, revision and epoch, so revise and rotate give the quota back", async () => {
    const locks = createFakeLocks();
    expect((await slots(locks, NOW)).ok).toBe(true);
    expect((await slots(locks, NOW, { ...QUOTE, id: "q2" })).ok).toBe(true);
    expect((await slots(locks, NOW)).ok).toBe(false);
    expect((await slots(locks, NOW, { ...QUOTE, revision: 3 })).ok).toBe(true);
    expect((await slots(locks, NOW, QUOTE, 1)).ok).toBe(true);
  });

  it("allows five an hour and ten a UTC day", async () => {
    const locks = createFakeLocks();
    const gap = 90 * 1000;
    const start = Date.parse("2026-10-20T09:00:00.000Z");
    const results = [];
    for (let i = 0; i < 6; i += 1) results.push(await slots(locks, start + i * gap));
    expect(results.map((r) => r.ok)).toEqual([true, true, true, true, true, false]);
    expect(results[5].retryAfterSeconds).toBe(3600 - 450);

    for (let i = 0; i < 5; i += 1) await slots(locks, start + 3600000 + i * gap);
    const day = await slots(locks, start + 2 * 3600000);
    expect(day).toEqual({ ok: false, retryAfterSeconds: 13 * 3600 });
    expect((await slots(locks, Date.parse("2026-10-21T00:00:00.000Z"))).ok).toBe(true);
  });

  it("hands the gap back when the email fails, and a refused send keeps nothing", async () => {
    const locks = createFakeLocks();
    const first = await slots(locks, NOW);
    await first.releaseGap();
    expect((await slots(locks, NOW)).ok).toBe(true);
    const held = locks.held.size;
    await slots(locks, NOW + 1000);
    expect(locks.held.size).toBe(held);
  });
});

describe("lockouts", () => {
  it("blocks sends after three locked-out codes on one revision and epoch", async () => {
    const locks = createFakeLocks();
    expect(await A.sendsBlocked(locks, QUOTE, 0)).toBe(false);
    expect(await A.recordLockout(locks, QUOTE, 0)).toBe(1);
    expect(await A.recordLockout(locks, QUOTE, 0)).toBe(2);
    expect(await A.sendsBlocked(locks, QUOTE, 0)).toBe(false);
    expect(await A.recordLockout(locks, QUOTE, 0)).toBe(3);
    expect(await A.sendsBlocked(locks, QUOTE, 0)).toBe(true);
    expect(await A.recordLockout(locks, QUOTE, 0)).toBe(3);
  });

  it("starts again after a rotate or a revise", async () => {
    const locks = createFakeLocks();
    for (let i = 0; i < 3; i += 1) await A.recordLockout(locks, QUOTE, 0);
    expect(await A.sendsBlocked(locks, QUOTE, 1)).toBe(false);
    expect(await A.sendsBlocked(locks, { ...QUOTE, revision: 3 }, 0)).toBe(false);
  });
});

describe("session cookie and hasAccess", () => {
  async function unlocked(locks = createFakeLocks()) {
    const epoch = await A.currentEpoch(locks, QUOTE);
    const header = A.sessionCookie(SECRET, QUOTE, epoch, NOW);
    return { locks, header, req: cookieFor(header) };
  }
  const access = (locks, req, quote = QUOTE, nowMs = NOW) =>
    A.hasAccess({ secret: SECRET, locks, req, quote, nowMs });

  it("sets an HttpOnly, Secure, SameSite=Strict cookie on /api for 30 days", async () => {
    const { header } = await unlocked();
    expect(header).toMatch(/^__Secure-oc_qa_[0-9a-f]{16}=v1\.[\w-]+\.[\w-]+; /);
    expect(header).toContain("; Max-Age=2592000; Path=/api; HttpOnly; Secure; SameSite=Strict");
    expect(header).not.toContain("kofi");
    expect(header).not.toContain(QUOTE.tokenHash);
  });

  it("names the cookie per quote", () => {
    expect(A.sessionCookieName("q1")).not.toBe(A.sessionCookieName("q2"));
    expect(A.sessionCookieName("q1")).toBe(A.sessionCookieName("q1"));
  });

  it("opens the quote it was issued for", async () => {
    const { locks, req } = await unlocked();
    expect(await access(locks, req)).toBe(true);
  });

  it("survives a payment request or email-again link (new tokenHash, same revision)", async () => {
    const { locks, req } = await unlocked();
    expect(await access(locks, req, { ...QUOTE, tokenHash: "c".repeat(64) })).toBe(true);
  });

  it("stops working after a rotate, for the old epoch only", async () => {
    const { locks, req } = await unlocked();
    expect(await A.bumpEpoch(locks, QUOTE)).toBe(1);
    expect(await access(locks, req)).toBe(false);
    const fresh = cookieFor(
      A.sessionCookie(SECRET, QUOTE, await A.currentEpoch(locks, QUOTE), NOW),
    );
    expect(await access(locks, fresh)).toBe(true);
    expect(await A.bumpEpoch(locks, QUOTE)).toBe(2);
    expect(await access(locks, fresh)).toBe(false);
  });

  it("stops working when the client email changes, but not for a case or space change", async () => {
    const { locks, req } = await unlocked();
    expect(await access(locks, req, { ...QUOTE, clientEmail: "new@example.com" })).toBe(false);
    expect(await access(locks, req, { ...QUOTE, clientEmail: " kofi@EXAMPLE.com " })).toBe(true);
  });

  it("stops working after a revise (new revision)", async () => {
    const { locks, req } = await unlocked();
    expect(await access(locks, req, { ...QUOTE, revision: 3 })).toBe(false);
  });

  it("counts epochs per revision", async () => {
    const locks = createFakeLocks();
    await A.bumpEpoch(locks, QUOTE);
    expect(await A.currentEpoch(locks, QUOTE)).toBe(1);
    expect(await A.currentEpoch(locks, { ...QUOTE, revision: 3 })).toBe(0);
  });

  it("expires 30 days after the code was entered", async () => {
    const { locks, req } = await unlocked();
    const thirtyDays = 30 * 24 * 3600 * 1000;
    expect(await access(locks, req, QUOTE, NOW + thirtyDays - 1)).toBe(true);
    expect(await access(locks, req, QUOTE, NOW + thirtyDays)).toBe(false);
  });

  it("refuses another quote's cookie, a tampered cookie, a challenge and no cookie", async () => {
    const { locks, header } = await unlocked();
    const [name, value] = header.split(";")[0].split("=");
    const otherQuote = { ...QUOTE, id: "q2" };
    const moved = { headers: { cookie: `${A.sessionCookieName("q2")}=${value}` } };
    expect(await access(locks, moved, otherQuote)).toBe(false);
    expect(await access(locks, { headers: { cookie: `${name}=${tamper(value, 1)}` } })).toBe(false);
    expect(await access(locks, { headers: { cookie: `${name}=${tamper(value, 2)}` } })).toBe(false);
    const { challenge } = A.issueChallenge(SECRET, QUOTE, 0, NOW);
    expect(await access(locks, { headers: { cookie: `${name}=${challenge}` } })).toBe(false);
    expect(await access(locks, { headers: {} })).toBe(false);
    expect(await access(locks, {})).toBe(false);
  });

  it("finds its cookie among others", async () => {
    const { locks, header } = await unlocked();
    const req = { headers: { cookie: `theme=dark; ${header.split(";")[0]}; other=1` } };
    expect(await access(locks, req)).toBe(true);
  });
});
