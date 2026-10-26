import { describe, it, expect, vi } from "vitest";
import { captureLinkCode, takeLinkCode } from "./linkCode";

const CODE = "AbCdEfGhIjKlMnOpQrStUv.mfz3k2a1.0123456789abcdefghijklmnopqrstuvwxyzABCDEFG";

// A stand-in for window.location and window.history.
function browser(url: string, state: unknown = { idx: 3, key: "k1" }) {
  const u = new URL(url, "https://oceaniccoder.dev");
  const location = {
    pathname: u.pathname,
    search: u.search,
    hash: u.hash,
  } as typeof window.location;
  const history = { state, replaceState: vi.fn() } as unknown as typeof window.history;
  return { location, history };
}

describe("captureLinkCode", () => {
  it("keeps the code for its link and drops the fragment, keeping history state", () => {
    const b = browser(`/q/tok123/pay/deposit?x=1#k=${CODE}`);
    captureLinkCode(b.location, b.history);
    expect(b.history.replaceState).toHaveBeenCalledWith(
      { idx: 3, key: "k1" },
      "",
      "/q/tok123/pay/deposit?x=1",
    );
    expect(takeLinkCode("quote", "tok123")).toBe(CODE);
  });

  it("hands the code out once", () => {
    const b = browser(`/q/once#k=${CODE}`);
    captureLinkCode(b.location, b.history);
    expect(takeLinkCode("quote", "once")).toBe(CODE);
    expect(takeLinkCode("quote", "once")).toBeNull();
  });

  it("gives nothing to another link", () => {
    const b = browser(`/q/mine#k=${CODE}`);
    captureLinkCode(b.location, b.history);
    expect(takeLinkCode("quote", "theirs")).toBeNull();
    expect(takeLinkCode("quote", "mine")).toBe(CODE);
  });

  it("drops a malformed code from the URL but keeps nothing", () => {
    const b = browser(`/q/tokbad#k=${encodeURIComponent("<script>alert(1)</script>")}`);
    captureLinkCode(b.location, b.history);
    expect(b.history.replaceState).toHaveBeenCalledWith(expect.anything(), "", "/q/tokbad");
    expect(takeLinkCode("quote", "tokbad")).toBeNull();
  });

  it("drops a code found outside a document link and keeps nothing", () => {
    const b = browser(`/about#k=${CODE}`);
    captureLinkCode(b.location, b.history);
    expect(b.history.replaceState).toHaveBeenCalledWith(expect.anything(), "", "/about");
    expect(takeLinkCode("quote", "about")).toBeNull();
  });

  it("leaves a URL without a code alone", () => {
    const b = browser("/q/tok#section");
    captureLinkCode(b.location, b.history);
    expect(b.history.replaceState).not.toHaveBeenCalled();
    expect(takeLinkCode("quote", "tok")).toBeNull();
  });

  it("keeps an invoice link's code after the signature and drops only the fragment", () => {
    const b = browser(`/pay/INV-2026-0007?s=sig123#k=${CODE}`);
    captureLinkCode(b.location, b.history);
    expect(b.history.replaceState).toHaveBeenCalledWith(
      expect.anything(),
      "",
      "/pay/INV-2026-0007?s=sig123",
    );
    expect(takeLinkCode("invoice", "INV-2026-0007")).toBe(CODE);
  });

  it("keys a receipt link's code by its decoded reference", () => {
    const b = browser(`/receipt/ref%201?s=sig#k=${CODE}`);
    captureLinkCode(b.location, b.history);
    expect(b.history.replaceState).toHaveBeenCalledWith(
      expect.anything(),
      "",
      "/receipt/ref%201?s=sig",
    );
    expect(takeLinkCode("receipt", "ref%201")).toBeNull();
    expect(takeLinkCode("receipt", "ref 1")).toBe(CODE);
  });

  it("never hands one kind's code to another kind with the same key", () => {
    const b = browser(`/pay/same#k=${CODE}`);
    captureLinkCode(b.location, b.history);
    expect(takeLinkCode("quote", "same")).toBeNull();
    expect(takeLinkCode("receipt", "same")).toBeNull();
    expect(takeLinkCode("invoice", "same")).toBe(CODE);
  });

  it("drops a code whose path segment can't be decoded and keeps nothing", () => {
    const b = browser(`/pay/%E0%A4%A#k=${CODE}`);
    captureLinkCode(b.location, b.history);
    expect(b.history.replaceState).toHaveBeenCalledWith(expect.anything(), "", "/pay/%E0%A4%A");
    expect(takeLinkCode("invoice", "%E0%A4%A")).toBeNull();
  });

  it("forgets an earlier link's code when another link is opened", () => {
    captureLinkCode(browser(`/q/first#k=${CODE}`).location, browser("/").history);
    captureLinkCode(browser("/about#k=other").location, browser("/").history);
    expect(takeLinkCode("quote", "first")).toBeNull();
  });
});
