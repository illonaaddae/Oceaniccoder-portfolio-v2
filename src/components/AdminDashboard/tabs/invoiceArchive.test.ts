import { describe, it, expect } from "vitest";
import { isArchivedInvoice } from "./invoiceArchive";

describe("isArchivedInvoice", () => {
  it("is true only for an unpaid invoice with archivedAt set", () => {
    const at = "2026-10-11T00:00:00Z";
    expect(isArchivedInvoice({ status: "sent", archivedAt: at })).toBe(true);
    expect(isArchivedInvoice({ status: "draft", archivedAt: at })).toBe(true);
    expect(isArchivedInvoice({ status: "sent", archivedAt: null })).toBe(false);
    expect(isArchivedInvoice({ status: "sent" })).toBe(false);
    expect(isArchivedInvoice({ status: "paid", archivedAt: at })).toBe(false);
  });
});
