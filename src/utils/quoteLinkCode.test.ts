import { describe, it, expect, vi } from "vitest";
import { captureLinkCode, takeLinkCode } from "./quoteLinkCode";

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
    expect(takeLinkCode("tok123")).toBe(CODE);
  });

  it("hands the code out once", () => {
    const b = browser(`/q/once#k=${CODE}`);
    captureLinkCode(b.location, b.history);
    expect(takeLinkCode("once")).toBe(CODE);
    expect(takeLinkCode("once")).toBeNull();
  });

  it("gives nothing to another link", () => {
    const b = browser(`/q/mine#k=${CODE}`);
    captureLinkCode(b.location, b.history);
    expect(takeLinkCode("theirs")).toBeNull();
    expect(takeLinkCode("mine")).toBe(CODE);
  });

  it("drops a malformed code from the URL but keeps nothing", () => {
    const b = browser(`/q/tokbad#k=${encodeURIComponent("<script>alert(1)</script>")}`);
    captureLinkCode(b.location, b.history);
    expect(b.history.replaceState).toHaveBeenCalledWith(expect.anything(), "", "/q/tokbad");
    expect(takeLinkCode("tokbad")).toBeNull();
  });

  it("drops a code found outside a quote link and keeps nothing", () => {
    const b = browser(`/about#k=${CODE}`);
    captureLinkCode(b.location, b.history);
    expect(b.history.replaceState).toHaveBeenCalledWith(expect.anything(), "", "/about");
    expect(takeLinkCode("about")).toBeNull();
  });

  it("leaves a URL without a code alone", () => {
    const b = browser("/q/tok#section");
    captureLinkCode(b.location, b.history);
    expect(b.history.replaceState).not.toHaveBeenCalled();
    expect(takeLinkCode("tok")).toBeNull();
  });
});
