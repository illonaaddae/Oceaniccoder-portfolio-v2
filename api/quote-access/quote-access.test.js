// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { createHandler } = await import("./index.js");
const { createFakeRepo, createFakeLocks } = await import("../shared/quotes/fakes.js");
const { hashToken, newToken } = await import("../shared/tokens.js");
const A = await import("../shared/quotes/access.js");

const SECRET = "q".repeat(40);
const TOKEN = newToken();
const IP = "203.0.113.7";
const START = Date.parse("2026-10-20T09:00:00.000Z");
const base = {
  id: "q1",
  quoteNumber: "Q-2026-0004",
  revision: 1,
  status: "sent",
  title: "Store",
  clientName: "Kofi Mensah",
  clientEmail: "kofi.mensah@hotmail.com",
  tokenHash: hashToken(TOKEN),
};
const ENV = { QUOTE_ACCESS_SECRET: SECRET, RESEND_TO_EMAIL: "owner@oceaniccoder.dev" };

function setup({
  quotes = [base],
  env = ENV,
  locks = createFakeLocks(),
  mailOk = true,
  sendImpl,
  alertWaitMs,
} = {}) {
  const repo = createFakeRepo({ quotes });
  const clock = { ms: START };
  const mails = [];
  const logs = [];
  const sendMail = async (mail) => {
    mails.push(mail);
    if (sendImpl) return sendImpl(mail);
    return mailOk ? { ok: true } : { ok: false, error: `Resend refused ${mail.to}` };
  };
  const handler = createHandler({
    env,
    send: sendMail,
    alertWaitMs,
    services: () => ({ repo, locks, now: () => new Date(clock.ms) }),
  });
  const record =
    (level) =>
    (...args) =>
      logs.push(`${level}: ${args.join(" ")}`);
  const call = async (body, { ip = IP, cookie } = {}) => {
    const log = Object.assign(record("info"), { error: record("error"), warn: record("warn") });
    const context = { log };
    const headers = { "x-forwarded-for": `${ip}:51234` };
    if (cookie) headers.cookie = cookie;
    await handler(context, { method: "POST", body, headers });
    return {
      status: context.res.status,
      body: JSON.parse(context.res.body),
      cookie: context.res.headers["Set-Cookie"],
    };
  };
  const codeOf = (mail) => mail.subject.match(/^(\d{6}) is your code/)[1];
  const sendCode = async (token = TOKEN, opts) => {
    const r = await call({ action: "send", token }, opts);
    return { ...r, code: r.status === 200 ? codeOf(mails[mails.length - 1]) : null };
  };
  return { repo, locks, clock, mails, logs, call, sendCode, codeOf };
}

const wrongCode = (code) => String((Number(code) + 1) % 1000000).padStart(6, "0");

describe("quote-access send", () => {
  it("emails a 6-digit code to the client and returns a challenge", async () => {
    const t = setup();
    const r = await t.sendCode();
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      maskedEmail: "k•••••@hotmail.com",
      expiresInSeconds: 600,
      retryAfterSeconds: 90,
    });
    expect(r.body.challenge).toMatch(/^v1\./);
    expect(t.mails).toHaveLength(1);
    expect(t.mails[0].to).toBe("kofi.mensah@hotmail.com");
    expect(t.mails[0].subject).toBe(`${r.code} is your code for quote Q-2026-0004`);
    expect(JSON.stringify(r.body)).not.toContain(r.code);
  });

  it("sends one code a minute per quote, across instances", async () => {
    const locks = createFakeLocks();
    const a = setup({ locks });
    const b = setup({ locks });
    expect((await a.sendCode()).status).toBe(200);
    const again = await b.sendCode(TOKEN, { ip: "198.51.100.9" });
    expect(again.status).toBe(429);
    expect(again.body.retryAfterSeconds).toBe(90);
    expect(b.mails).toHaveLength(0);
    a.clock.ms += 90 * 1000;
    b.clock.ms += 90 * 1000;
    expect((await b.sendCode(TOKEN, { ip: "198.51.100.9" })).status).toBe(200);
  });

  it("caps one quote at five codes an hour and ten a day", async () => {
    const t = setup();
    const statuses = [];
    for (let i = 0; i < 6; i += 1) {
      statuses.push((await t.sendCode(TOKEN, { ip: `198.51.100.${i + 1}` })).status);
      t.clock.ms += 90 * 1000;
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    t.clock.ms = START + 3600 * 1000;
    for (let i = 0; i < 5; i += 1) {
      expect((await t.sendCode(TOKEN, { ip: `198.51.101.${i + 1}` })).status).toBe(200);
      t.clock.ms += 90 * 1000;
    }
    t.clock.ms = START + 2 * 3600 * 1000;
    const day = await t.sendCode(TOKEN, { ip: "198.51.102.1" });
    expect(day.status).toBe(429);
    expect(t.mails).toHaveLength(10);
  });

  it("caps one IP at ten code emails an hour", async () => {
    const quotes = Array.from({ length: 11 }, (_, i) => ({
      ...base,
      id: `q${i}`,
      tokenHash: hashToken(`${TOKEN.slice(0, 40)}${String(i).padStart(3, "0")}`),
    }));
    const t = setup({ quotes });
    const token = (i) => `${TOKEN.slice(0, 40)}${String(i).padStart(3, "0")}`;
    for (let i = 0; i < 10; i += 1) expect((await t.sendCode(token(i))).status).toBe(200);
    expect((await t.sendCode(token(10))).status).toBe(429);
    expect((await t.sendCode(token(10), { ip: "198.51.100.1" })).status).toBe(200);
  });

  it("answers 502 when the email fails and lets the client try again", async () => {
    const locks = createFakeLocks();
    const failing = setup({ locks, mailOk: false });
    const r = await failing.call({ action: "send", token: TOKEN });
    expect(r.status).toBe(502);
    expect(failing.logs.join("\n")).not.toContain("kofi");
    const working = setup({ locks });
    expect((await working.sendCode()).status).toBe(200);
  });

  it("refuses a quote with no client email and points to the contact address", async () => {
    const t = setup({ quotes: [{ ...base, clientEmail: "" }] });
    const r = await t.call({ action: "send", token: TOKEN });
    expect(r.status).toBe(409);
    expect(r.body).toMatchObject({ noEmail: true });
    expect(r.body.error).toContain("hello@oceaniccoder.dev");
    expect(t.mails).toHaveLength(0);
  });

  it.each([
    ["an unknown token", { token: newToken() }, [base]],
    ["a malformed token", { token: "nope" }, [base]],
    ["a draft", { token: TOKEN }, [{ ...base, status: "draft" }]],
    ["a cancelled quote", { token: TOKEN }, [{ ...base, status: "cancelled" }]],
  ])("treats %s as inactive", async (_label, body, quotes) => {
    const r = await setup({ quotes }).call({ action: "send", ...body });
    expect(r).toMatchObject({ status: 404, body: { inactive: true } });
  });

  it("rejects unknown actions", async () => {
    expect((await setup().call({ action: "toString", token: TOKEN })).status).toBe(400);
  });
});

describe("quote-access verify", () => {
  const verify = (t, challenge, code, opts) =>
    t.call({ action: "verify", token: TOKEN, challenge, code }, opts);

  it("sets the unlock cookie for the right code, and the cookie opens the quote", async () => {
    const t = setup();
    const { body, code } = await t.sendCode();
    const r = await verify(t, body.challenge, ` ${code.slice(0, 3)}-${code.slice(3)} `);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true });
    expect(r.cookie).toMatch(
      /^__Secure-oc_qa_[0-9a-f]{16}=v1\..+; HttpOnly; Secure; SameSite=Strict$/,
    );
    const status = await t.call(
      { action: "status", token: TOKEN },
      { cookie: r.cookie.split(";")[0] },
    );
    expect(status.body).toMatchObject({ locked: false });
    const quote = await t.repo.get("q1");
    const req = { headers: { cookie: r.cookie.split(";")[0] } };
    const nowMs = t.clock.ms;
    expect(await A.hasAccess({ secret: SECRET, locks: t.locks, req, quote, nowMs })).toBe(true);
  });

  it("refuses a used code", async () => {
    const t = setup();
    const { body, code } = await t.sendCode();
    expect((await verify(t, body.challenge, code)).status).toBe(200);
    const again = await verify(t, body.challenge, code);
    expect(again.status).toBe(409);
    expect(again.cookie).toBeUndefined();
  });

  it("locks after five wrong codes, emails the owner once, and refuses the sixth", async () => {
    const t = setup();
    const { body, code } = await t.sendCode();
    const wrong = wrongCode(code);
    const left = [];
    for (let i = 0; i < 4; i += 1) {
      const r = await verify(t, body.challenge, wrong);
      expect(r.status).toBe(400);
      left.push(r.body.triesLeft);
    }
    expect(left).toEqual([4, 3, 2, 1]);
    const fifth = await verify(t, body.challenge, wrong);
    expect(fifth).toMatchObject({ status: 429, body: { triesLeft: 0, newCodeNeeded: true } });
    const sixth = await verify(t, body.challenge, code);
    expect(sixth.status).toBe(429);
    expect(sixth.cookie).toBeUndefined();

    const alerts = t.mails.filter((m) => m.to === "owner@oceaniccoder.dev");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].subject).toBe("Code locked after 5 wrong tries on Q-2026-0004");
    expect(alerts[0].html).not.toContain(code);
  });

  it("evaluates at most five of ten parallel guesses (four wrong, the fifth locks)", async () => {
    const t = setup();
    const { body, code } = await t.sendCode();
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        verify(t, body.challenge, wrongCode(code), { ip: `198.51.100.${i + 1}` }),
      ),
    );
    expect(results.filter((r) => r.status === 400)).toHaveLength(4);
    expect(results.filter((r) => r.status === 429)).toHaveLength(6);
    expect(t.mails.filter((m) => m.to === "owner@oceaniccoder.dev")).toHaveLength(1);
  });

  it("refuses a code after 10 minutes", async () => {
    const t = setup();
    const { body, code } = await t.sendCode();
    t.clock.ms += 10 * 60 * 1000;
    const r = await verify(t, body.challenge, code);
    expect(r).toMatchObject({ status: 400, body: { newCodeNeeded: true } });
    expect(r.body.error).toMatch(/expired/);
  });

  it("refuses a tampered challenge without spending a try", async () => {
    const t = setup();
    const { body, code } = await t.sendCode();
    const [v, payload, sig] = body.challenge.split(".");
    const forged = JSON.parse(Buffer.from(payload, "base64url").toString());
    forged.x += 3600 * 1000;
    const tampered = `${v}.${Buffer.from(JSON.stringify(forged)).toString("base64url")}.${sig}`;
    expect((await verify(t, tampered, code)).status).toBe(400);
    expect((await verify(t, `${body.challenge}x`, code)).status).toBe(400);
    expect((await verify(t, body.challenge, code)).status).toBe(200);
  });

  it("refuses a code sent before the admin issued a new link", async () => {
    const t = setup();
    const { body, code } = await t.sendCode();
    await A.bumpEpoch(t.locks, base);
    const r = await verify(t, body.challenge, code);
    expect(r).toMatchObject({ status: 400, body: { newCodeNeeded: true } });
  });

  it("gives no working cookie when the admin issues a new link mid-verify", async () => {
    const t = setup();
    const { body, code } = await t.sendCode();
    const take = t.locks.take.bind(t.locks);
    t.locks.take = async (key) => {
      if (key.startsWith("qa:used:")) await A.bumpEpoch({ ...t.locks, take }, base);
      return take(key);
    };
    const r = await verify(t, body.challenge, code);
    const req = { headers: { cookie: r.cookie.split(";")[0] } };
    const quote = await t.repo.get("q1");
    const nowMs = t.clock.ms;
    expect(await A.hasAccess({ secret: SECRET, locks: t.locks, req, quote, nowMs })).toBe(false);
  });

  it("asks for six digits before spending a try", async () => {
    const t = setup();
    const { body, code } = await t.sendCode();
    for (const bad of ["12345", "abcdef", "1234567", "", null]) {
      expect((await verify(t, body.challenge, bad)).status).toBe(400);
    }
    for (let i = 0; i < 4; i += 1) await verify(t, body.challenge, wrongCode(code));
    expect((await verify(t, body.challenge, code)).status).toBe(200);
  });

  it("caps one IP at thirty verifies in ten minutes", async () => {
    const t = setup();
    const statuses = [];
    for (let i = 0; i < 31; i += 1) statuses.push((await verify(t, "v1.x.y", "123456")).status);
    expect(statuses.slice(0, 30).every((s) => s === 400)).toBe(true);
    expect(statuses[30]).toBe(429);
  });
});

describe("quote-access status", () => {
  it("reports a locked quote with the masked email", async () => {
    const r = await setup().call({ action: "status", token: TOKEN });
    expect(r).toMatchObject({
      status: 200,
      body: { locked: true, canUnlock: true, maskedEmail: "k•••••@hotmail.com" },
    });
    expect(JSON.stringify(r.body)).not.toContain("Kofi");
  });

  it("says a quote with no client email can't be unlocked", async () => {
    const r = await setup({ quotes: [{ ...base, clientEmail: "" }] }).call({
      action: "status",
      token: TOKEN,
    });
    expect(r.body).toEqual({ locked: true, canUnlock: false, blocked: false, maskedEmail: null });
  });
});

describe("quote-access switches", () => {
  it("with QUOTE_ACCESS_GATE=off, needs no secret, reports unlocked and sends nothing", async () => {
    const t = setup({ env: { QUOTE_ACCESS_GATE: "off" } });
    expect(await t.call({ action: "status", token: TOKEN })).toMatchObject({
      status: 200,
      body: { locked: false, gateOff: true },
    });
    const sendR = await t.call({ action: "send", token: TOKEN });
    expect(sendR).toMatchObject({ status: 409, body: { gateOff: true } });
    expect(t.mails).toHaveLength(0);
  });

  it.each([{}, { QUOTE_ACCESS_SECRET: "short" }])(
    "answers 503 for every action when the secret is %j",
    async (env) => {
      const t = setup({ env });
      for (const action of ["status", "send", "verify"]) {
        expect((await t.call({ action, token: TOKEN })).status).toBe(503);
      }
      expect(t.mails).toHaveLength(0);
    },
  );

  it("answers 503 for a QUOTE_ACCESS_GATE value it doesn't know, naming the variable in the log", async () => {
    const t = setup({ env: { ...ENV, QUOTE_ACCESS_GATE: "false" } });
    for (const action of ["status", "send", "verify"]) {
      expect((await t.call({ action, token: TOKEN })).status).toBe(503);
    }
    expect(t.mails).toHaveLength(0);
    expect(t.logs.join("\n")).toContain("QUOTE_ACCESS_GATE");
  });
});

describe("quote-access lifetime cap and quota reset", () => {
  const GAP = 90 * 1000;

  async function lockOut(t) {
    const { body, code } = await t.sendCode(TOKEN, { ip: `198.51.100.${t.mails.length + 1}` });
    let last;
    for (let i = 0; i < 5; i += 1)
      last = await t.call(
        { action: "verify", token: TOKEN, challenge: body.challenge, code: wrongCode(code) },
        { ip: `198.51.100.${t.mails.length + 1}` },
      );
    t.clock.ms += GAP;
    return last;
  }

  it("stops sending codes after three locked-out codes until the admin issues a new link", async () => {
    const t = setup();
    expect((await lockOut(t)).status).toBe(429);
    expect((await lockOut(t)).status).toBe(429);
    const third = await lockOut(t);
    expect(third).toMatchObject({ status: 403, body: { blocked: true } });
    expect(third.body.error).toContain("hello@oceaniccoder.dev");

    const alerts = t.mails.filter((m) => m.to === "owner@oceaniccoder.dev");
    expect(alerts).toHaveLength(3);
    expect(alerts[2].text).toContain("no more codes will be sent");
    expect(alerts[1].text).not.toContain("no more codes will be sent");

    const sent = t.mails.length;
    const refused = await t.call({ action: "send", token: TOKEN }, { ip: "192.0.2.50" });
    expect(refused).toMatchObject({ status: 403, body: { blocked: true } });
    expect(t.mails).toHaveLength(sent);
    const status = await t.call({ action: "status", token: TOKEN });
    expect(status.body).toMatchObject({ locked: true, canUnlock: false, blocked: true });

    await A.bumpEpoch(t.locks, base);
    expect((await t.sendCode(TOKEN, { ip: "192.0.2.51" })).status).toBe(200);
  });

  it("refuses a challenge fetched before the block, even with the right code", async () => {
    const t = setup();
    const early = await t.sendCode(TOKEN, { ip: "192.0.2.80" });
    t.clock.ms += GAP;
    for (let i = 0; i < 3; i += 1) await lockOut(t);
    const tries = t.locks.held.size;
    const r = await t.call(
      { action: "verify", token: TOKEN, challenge: early.body.challenge, code: early.code },
      { ip: "192.0.2.81" },
    );
    expect(r).toMatchObject({ status: 403, body: { blocked: true } });
    expect(r.cookie).toBeUndefined();
    expect(t.locks.held.size).toBe(tries);
  });

  it("gives the client back a used-up hourly quota after a new link", async () => {
    const t = setup();
    for (let i = 0; i < 5; i += 1) {
      expect((await t.sendCode(TOKEN, { ip: `192.0.2.${i + 1}` })).status).toBe(200);
      t.clock.ms += GAP;
    }
    expect((await t.sendCode(TOKEN, { ip: "192.0.2.9" })).status).toBe(429);
    await A.bumpEpoch(t.locks, base);
    expect((await t.sendCode(TOKEN, { ip: "192.0.2.10" })).status).toBe(200);
  });
});

describe("quote-access failure paths", () => {
  it("hands the gap back when building or sending the email throws", async () => {
    let fail = true;
    const t = setup({
      sendImpl: async () => {
        if (fail) throw new Error("socket hang up");
        return { ok: true };
      },
    });
    const r = await t.call({ action: "send", token: TOKEN });
    expect(r.status).toBe(500);
    fail = false;
    expect((await t.sendCode()).status).toBe(200);
  });

  it("still answers 502 and logs it when handing the gap back fails", async () => {
    const t = setup({ mailOk: false });
    t.locks.release = async () => {
      throw new Error("locks down");
    };
    const r = await t.call({ action: "send", token: TOKEN });
    expect(r.status).toBe(502);
    expect(t.logs.join("\n")).toContain("quote-access gap release failed quote=Q-2026-0004");
    expect(t.logs.join("\n")).not.toContain("kofi");
  });

  it("answers the lockout without waiting on a slow owner alert", async () => {
    let finish;
    const t = setup({
      alertWaitMs: 20,
      sendImpl: (mail) =>
        mail.to === "owner@oceaniccoder.dev"
          ? new Promise((resolve) => {
              finish = () => resolve({ ok: true });
            })
          : { ok: true },
    });
    const { body, code } = await t.sendCode();
    for (let i = 0; i < 4; i += 1)
      await t.call({
        action: "verify",
        token: TOKEN,
        challenge: body.challenge,
        code: wrongCode(code),
      });
    const started = Date.now();
    const fifth = await t.call({
      action: "verify",
      token: TOKEN,
      challenge: body.challenge,
      code: wrongCode(code),
    });
    expect(Date.now() - started).toBeLessThan(1000);
    expect(fifth.status).toBe(429);
    expect(t.logs.join("\n")).toContain("lock alert failed quote=Q-2026-0004: timed out");
    finish();
  });
});

describe("quote-access logs", () => {
  it("never log the code, challenge, cookie, token, email or IP", async () => {
    const t = setup();
    const { body, code } = await t.sendCode();
    await t.call({
      action: "verify",
      token: TOKEN,
      challenge: body.challenge,
      code: wrongCode(code),
    });
    for (let i = 0; i < 4; i += 1)
      await t.call({
        action: "verify",
        token: TOKEN,
        challenge: body.challenge,
        code: wrongCode(code),
      });
    t.clock.ms += 90 * 1000;
    const second = await t.sendCode();
    const ok = await t.call({
      action: "verify",
      token: TOKEN,
      challenge: second.body.challenge,
      code: second.code,
    });
    await t.sendCode();
    const failing = setup({ mailOk: false });
    await failing.call({ action: "send", token: TOKEN });

    const all = [...t.logs, ...failing.logs].join("\n");
    expect(all).toContain("quote-access send quote=Q-2026-0004");
    expect(all).toContain("quote-access lock quote=Q-2026-0004");
    for (const secret of [
      code,
      second.code,
      body.challenge,
      second.body.challenge,
      ok.cookie.split(";")[0].split("=")[1],
      TOKEN,
      base.tokenHash,
      base.clientEmail,
      "kofi",
      IP,
      SECRET,
    ]) {
      expect(all).not.toContain(secret);
    }
  });
});
