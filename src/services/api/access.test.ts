import { describe, it, expect, vi, afterEach } from "vitest";
import { docAccessTarget, quoteAccessTarget } from "./access";
import { QuoteApiError } from "./quotes";

type FetchInit = Parameters<typeof fetch>[1] & object;

const answer = (body: unknown, status = 200) =>
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body }),
  );

function sent() {
  const calls = (fetch as unknown as { mock: { calls: [string, FetchInit][] } }).mock.calls;
  return calls.map(([url, init]) => ({
    url,
    method: init.method,
    body: JSON.parse(init.body as string) as unknown,
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("docAccessTarget", () => {
  it("posts every invoice action to doc-access with the locator", async () => {
    answer({ ok: true });
    const target = docAccessTarget({ kind: "invoice", number: "INV-2026-0007", s: "sig" });
    expect(target).toMatchObject({ kind: "invoice", key: "INV-2026-0007" });
    await target.status();
    await target.send();
    await target.verify("v1.c.sig", "123456");
    await target.claim("nonce.minted.mac");
    const locator = { kind: "invoice", number: "INV-2026-0007", s: "sig" };
    expect(sent()).toEqual([
      { url: "/api/doc-access", method: "POST", body: { ...locator, action: "status" } },
      { url: "/api/doc-access", method: "POST", body: { ...locator, action: "send" } },
      {
        url: "/api/doc-access",
        method: "POST",
        body: { ...locator, action: "verify", challenge: "v1.c.sig", code: "123456" },
      },
      {
        url: "/api/doc-access",
        method: "POST",
        body: { ...locator, action: "claim", linkCode: "nonce.minted.mac" },
      },
    ]);
  });

  it("keys a receipt by its reference and sends its signature", async () => {
    answer({ locked: true, canUnlock: true, maskedEmail: "k•••@e•••.com" });
    const target = docAccessTarget({ kind: "receipt", reference: "ref_1", s: "sig" });
    expect(target).toMatchObject({ kind: "receipt", key: "ref_1" });
    await expect(target.status()).resolves.toMatchObject({ locked: true });
    expect(sent()[0].body).toEqual({
      kind: "receipt",
      reference: "ref_1",
      s: "sig",
      action: "status",
    });
  });

  it("throws the access details of a refusal", async () => {
    answer({ error: "Too many wrong codes.", blocked: true, triesLeft: 0 }, 403);
    const err = await docAccessTarget({ kind: "invoice", number: "INV-1", s: "sig" })
      .verify("c", "123456")
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(QuoteApiError);
    expect(err).toMatchObject({ status: 403, access: { blocked: true, triesLeft: 0 } });
  });
});

describe("quoteAccessTarget", () => {
  it("keeps the quote's own endpoint and body", async () => {
    answer({ ok: true });
    const target = quoteAccessTarget("tok");
    expect(target).toMatchObject({ kind: "quote", key: "tok" });
    await target.status();
    await target.send();
    await target.verify("v1.c.sig", "123456");
    await target.claim("nonce.minted.mac");
    expect(sent()).toEqual([
      { url: "/api/quote-access", method: "POST", body: { action: "status", token: "tok" } },
      { url: "/api/quote-access", method: "POST", body: { action: "send", token: "tok" } },
      {
        url: "/api/quote-access",
        method: "POST",
        body: { action: "verify", token: "tok", challenge: "v1.c.sig", code: "123456" },
      },
      {
        url: "/api/quote-access",
        method: "POST",
        body: { action: "claim", token: "tok", linkCode: "nonce.minted.mac" },
      },
    ]);
  });
});
