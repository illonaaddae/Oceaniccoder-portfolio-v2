import { describe, it, expect } from "vitest";
import { getDownloadAction, getPreviewHref, getVerifyHref } from "./certActions";
import type { Certification } from "../../types";

const cert = (extra: Partial<Certification> = {}): Certification =>
  ({
    $id: "1",
    title: "Learn Linux",
    issuer: "Boot.dev",
    date: "September 2026",
    platform: "Boot.dev",
    ...extra,
  }) as Certification;

describe("getDownloadAction", () => {
  it("prefers the uploaded certificate file", () => {
    const action = getDownloadAction(
      cert({ image: "https://cdn/cert.pdf", downloadLink: "https://drive/x" }),
    );
    expect(action).toEqual({ href: "https://cdn/cert.pdf", download: true });
  });

  it("falls back to the pasted download link", () => {
    expect(getDownloadAction(cert({ downloadLink: "https://drive/x" }))).toEqual({
      href: "https://drive/x",
      download: true,
    });
  });

  it("returns null when there is nothing to download", () => {
    expect(getDownloadAction(cert())).toBeNull();
  });

  it("treats a blank field as absent", () => {
    expect(getDownloadAction(cert({ image: "   ", downloadLink: "  " }))).toBeNull();
  });
});

describe("getPreviewHref", () => {
  it("returns the uploaded file", () => {
    expect(getPreviewHref(cert({ image: "https://cdn/cert.png" }))).toBe("https://cdn/cert.png");
  });

  it("does not fall back to the download link", () => {
    expect(getPreviewHref(cert({ downloadLink: "https://drive/x" }))).toBeNull();
  });
});

describe("getVerifyHref", () => {
  it("returns the verify link when set", () => {
    expect(getVerifyHref(cert({ verifyLink: "https://credly/x" }))).toBe("https://credly/x");
  });

  it("returns null when unset", () => {
    expect(getVerifyHref(cert())).toBeNull();
  });
});
