import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("./adminHeaders", () => ({
  adminHeaders: vi
    .fn()
    .mockResolvedValue({ "Content-Type": "application/json", Authorization: "Bearer jwt" }),
}));

import { fetchClientQuote, quoteAdmin, QuoteApiError, checkStagePayment } from "./quotes";

type FetchInit = Parameters<typeof fetch>[1] & object;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("quote services", () => {
  it("throws QuoteApiError with the status and server message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: "This link is no longer active.", inactive: true }),
      }),
    );
    const err = await fetchClientQuote("tok").catch((e) => e);
    expect(err).toBeInstanceOf(QuoteApiError);
    expect(err).toMatchObject({
      status: 404,
      message: "This link is no longer active.",
      inactive: true,
    });
  });

  it("encodes the token and reference", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ state: "pending", receiptPath: null }),
      }),
    );
    await checkStagePayment("a/b", "R 1");
    expect(fetch).toHaveBeenCalledWith("/api/quote-pay?token=a%2Fb&reference=R%201", undefined);
  });

  it("sends admin actions with the admin headers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ quotes: [] }) }),
    );
    await quoteAdmin("list");
    const [url, init] = (fetch as unknown as { mock: { calls: [string, FetchInit][] } }).mock
      .calls[0];
    expect(url).toBe("/api/quote-admin");
    expect(JSON.parse(init.body as string)).toEqual({ action: "list" });
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer jwt");
  });

  it("passes field errors through", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: "Fix the highlighted fields.",
          fields: { title: "Required" },
        }),
      }),
    );
    const err = (await quoteAdmin("create", { draft: {} }).catch((e) => e)) as QuoteApiError;
    expect(err.fields).toEqual({ title: "Required" });
  });

  it("rejects an ok response that is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("bad json");
        },
      }),
    );
    const err = await fetchClientQuote("tok").catch((e) => e);
    expect(err).toBeInstanceOf(QuoteApiError);
    expect(err).toMatchObject({ status: 200, message: "Unexpected response from the server." });
  });
});
