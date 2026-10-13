import { describe, it, expect } from "vitest";
import {
  ABANDON_AFTER_MS,
  canArchive,
  displayStatus,
  isArchived,
  paidStageKeys,
  type DisplayStatus,
} from "./paymentStatus";
import type { Payment } from "@/services/api/payments";

const NOW = Date.parse("2026-10-12T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

const row = (over: Partial<Payment> = {}) =>
  ({
    $id: "p1",
    $createdAt: ago(60 * 1000),
    status: "pending",
    quoteNumber: "Q-2026-0001",
    stageId: "deposit",
    ...over,
  }) as Payment;

const none = new Set<string>();

describe("displayStatus", () => {
  it.each<[Payment["status"], DisplayStatus]>([
    ["success", "paid"],
    [undefined, "paid"],
    ["failed", "failed"],
    ["abandoned", "abandoned"],
    ["duplicate", "duplicate"],
    ["refunded", "refunded"],
  ])("maps stored %s to %s", (status, shown) => {
    expect(displayStatus(row({ status }), none, NOW)).toBe(shown);
  });

  it("shows an unknown stored status as failed, never paid", () => {
    expect(displayStatus(row({ status: "weird" as never }), none, NOW)).toBe("failed");
  });

  it("keeps a fresh pending row pending", () => {
    expect(displayStatus(row(), none, NOW)).toBe("pending");
  });

  it("keeps a pending row pending at exactly 30 minutes", () => {
    expect(displayStatus(row({ $createdAt: ago(ABANDON_AFTER_MS) }), none, NOW)).toBe("pending");
  });

  it("marks a pending row abandoned just past 30 minutes", () => {
    expect(displayStatus(row({ $createdAt: ago(ABANDON_AFTER_MS + 1) }), none, NOW)).toBe(
      "abandoned",
    );
  });

  it("keeps a pending row with an unreadable date pending", () => {
    expect(displayStatus(row({ $createdAt: "not a date" }), none, NOW)).toBe("pending");
  });

  it("marks a fresh pending row abandoned when the same stage was paid elsewhere", () => {
    const paid = row({ $id: "p2", status: "success" });
    const keys = paidStageKeys([row(), paid]);
    expect(displayStatus(row(), keys, NOW)).toBe("abandoned");
  });

  it("does not treat another stage or another quote as paid elsewhere", () => {
    const keys = paidStageKeys([
      row({ status: "success", stageId: "balance" }),
      row({ status: "success", quoteNumber: "Q-2026-0002" }),
    ]);
    expect(displayStatus(row(), keys, NOW)).toBe("pending");
  });

  it("ignores rows without a quote stage when matching paid stages", () => {
    const keys = paidStageKeys([row({ status: "success", quoteNumber: undefined })]);
    expect(keys.size).toBe(0);
    expect(displayStatus(row({ quoteNumber: undefined }), keys, NOW)).toBe("pending");
  });
});

describe("isArchived", () => {
  it("is true for an archived attempt and false without the flag", () => {
    expect(isArchived(row({ archivedAt: ago(1000) }))).toBe(true);
    expect(isArchived(row({ archivedAt: null }))).toBe(false);
    expect(isArchived(row())).toBe(false);
  });

  it("never treats a row holding money as archived, even with a stray flag", () => {
    const at = ago(1000);
    expect(isArchived(row({ status: "success", archivedAt: at }))).toBe(false);
    expect(isArchived(row({ status: undefined, archivedAt: at }))).toBe(false);
    expect(isArchived(row({ status: "duplicate", paystackId: "9", archivedAt: at }))).toBe(false);
    expect(
      isArchived(row({ status: "failed", paystackId: "9", note: "underpaid", archivedAt: at })),
    ).toBe(false);
  });
});

describe("canArchive", () => {
  it("allows only attempts where no money was taken", () => {
    expect(canArchive(row({ status: "pending" }))).toBe(true);
    expect(canArchive(row({ status: "abandoned" }))).toBe(true);
    expect(canArchive(row({ status: "failed", note: "initialize: down" }))).toBe(true);
    expect(canArchive(row({ status: "failed", paystackId: "9", note: "Paystack: Declined" }))).toBe(
      true,
    );
    expect(canArchive(row({ status: "success" }))).toBe(false);
    expect(canArchive(row({ status: "duplicate" }))).toBe(false);
    expect(canArchive(row({ status: "refunded" }))).toBe(false);
    expect(canArchive(row({ status: "failed", paystackId: "9", note: "currency-mismatch" }))).toBe(
      false,
    );
  });
});
