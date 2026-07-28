import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { saveDraft, loadDraft, clearDraft } from "./formDraft";

const KEY = "test-draft";
const VERSION = 1;
const NOW = 1_700_000_000_000;

describe("formDraft", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("round-trips a draft", () => {
    saveDraft(KEY, VERSION, { name: "Ada", step: 3 }, NOW);
    expect(loadDraft(KEY, VERSION, NOW)).toEqual({ name: "Ada", step: 3 });
  });

  it("returns null when nothing is stored", () => {
    expect(loadDraft(KEY, VERSION, NOW)).toBeNull();
  });

  // A shape change must not restore into fields that no longer exist.
  it("ignores a draft saved under a different version", () => {
    saveDraft(KEY, 1, { name: "Ada" }, NOW);
    expect(loadDraft(KEY, 2, NOW)).toBeNull();
  });

  it("ignores a draft older than 24 hours", () => {
    saveDraft(KEY, VERSION, { name: "Ada" }, NOW);
    const twentyFiveHoursLater = NOW + 25 * 60 * 60 * 1000;
    expect(loadDraft(KEY, VERSION, twentyFiveHoursLater)).toBeNull();
  });

  it("keeps a draft just under the age limit", () => {
    saveDraft(KEY, VERSION, { name: "Ada" }, NOW);
    const twentyThreeHoursLater = NOW + 23 * 60 * 60 * 1000;
    expect(loadDraft(KEY, VERSION, twentyThreeHoursLater)).toEqual({ name: "Ada" });
  });

  it("returns null for corrupt JSON rather than throwing", () => {
    sessionStorage.setItem(KEY, "{not json");
    expect(() => loadDraft(KEY, VERSION, NOW)).not.toThrow();
    expect(loadDraft(KEY, VERSION, NOW)).toBeNull();
  });

  it("returns null when the stored payload is not an object", () => {
    sessionStorage.setItem(KEY, JSON.stringify({ version: VERSION, savedAt: NOW, data: "nope" }));
    expect(loadDraft(KEY, VERSION, NOW)).toBeNull();
  });

  it("clears a draft", () => {
    saveDraft(KEY, VERSION, { name: "Ada" }, NOW);
    clearDraft(KEY);
    expect(loadDraft(KEY, VERSION, NOW)).toBeNull();
  });

  // Private browsing throws on storage access. Losing persistence is fine;
  // breaking the form is not.
  it("does not throw when sessionStorage is unavailable", () => {
    // Must patch the prototype — jsdom's Storage methods live there, so an
    // instance spy on sessionStorage does not intercept the call at all.
    const proto = window.Storage.prototype;
    vi.spyOn(proto, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    vi.spyOn(proto, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(proto, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => saveDraft(KEY, VERSION, { name: "Ada" }, NOW)).not.toThrow();
    expect(loadDraft(KEY, VERSION, NOW)).toBeNull();
    expect(() => clearDraft(KEY)).not.toThrow();
  });
});
