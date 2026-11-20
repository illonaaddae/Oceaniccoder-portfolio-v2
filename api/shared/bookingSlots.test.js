// @vitest-environment node
import { describe, it, expect } from "vitest";

const { canonicalTime, isBookableDate, bookingIdFor, TIME_SLOTS } =
  await import("./bookingSlots.js");

const NOW = Date.parse("2026-10-20T09:00:00Z");

describe("canonicalTime", () => {
  it("maps any spelling of an offered time to its label", () => {
    for (const text of ["10:00 AM", "10:00 am", "10:00am", " 10:00 a.m. ", "10:00"]) {
      expect(canonicalTime(text)).toBe("10:00 AM");
    }
    expect(canonicalTime("1:00 pm")).toBe("01:00 PM");
    expect(canonicalTime("13:00")).toBe("01:00 PM");
    expect(canonicalTime("12:00 pm")).toBe("12:00 PM");
  });

  it("keeps every offered label as it is", () => {
    for (const label of TIME_SLOTS) expect(canonicalTime(label)).toBe(label);
  });

  it("rejects times the form doesn't offer", () => {
    for (const text of ["08:00 AM", "10:30 AM", "12:00 AM", "25:00", "10:60", "noon", "", "10"]) {
      expect(canonicalTime(text)).toBeNull();
    }
  });
});

describe("isBookableDate", () => {
  it("accepts today up to 90 days ahead (UTC)", () => {
    expect(isBookableDate("2026-10-20", NOW)).toBe(true);
    expect(isBookableDate("2027-01-18", NOW)).toBe(true);
  });

  it("rejects past dates, dates past the window and impossible dates", () => {
    expect(isBookableDate("2026-10-19", NOW)).toBe(false);
    expect(isBookableDate("2027-01-19", NOW)).toBe(false);
    expect(isBookableDate("2026-02-30", NOW)).toBe(false);
    expect(isBookableDate("2026-10-2", NOW)).toBe(false);
  });
});

describe("bookingIdFor", () => {
  it("gives one id per date and time, whatever the spelling", () => {
    const id = bookingIdFor("2026-10-22", "10:00 AM");
    expect(id).toMatch(/^bk_[0-9a-f]{40}$/);
    expect(bookingIdFor("2026-10-22", canonicalTime("10:00 am"))).toBe(id);
    expect(bookingIdFor("2026-10-22", "11:00 AM")).not.toBe(id);
    expect(bookingIdFor("2026-10-23", "10:00 AM")).not.toBe(id);
  });
});
