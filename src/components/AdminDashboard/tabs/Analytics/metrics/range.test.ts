import { describe, it, expect } from "vitest";
import {
  RANGE_STORAGE_KEY,
  bucketFor,
  bucketsFor,
  customRangeError,
  dayOf,
  delta,
  inRange,
  loadRangeChoice,
  previousRange,
  rangeDays,
  resolveRange,
  saveRangeChoice,
  shiftSpan,
} from "./range";

const NOW = new Date("2026-10-13T15:30:00Z");

describe("resolveRange", () => {
  it("ends presets today and counts today as one of the days", () => {
    expect(resolveRange({ preset: "7d" }, NOW)).toEqual({ from: "2026-10-07", to: "2026-10-13" });
    expect(resolveRange({ preset: "30d" }, NOW)).toEqual({ from: "2026-09-14", to: "2026-10-13" });
    expect(rangeDays(resolveRange({ preset: "90d" }, NOW))).toBe(90);
    expect(rangeDays(resolveRange({ preset: "12m" }, NOW))).toBe(365);
  });

  it("uses custom dates as given, and 30 days when they are missing", () => {
    expect(resolveRange({ preset: "custom", from: "2026-01-01", to: "2026-01-31" }, NOW)).toEqual({
      from: "2026-01-01",
      to: "2026-01-31",
    });
    expect(rangeDays(resolveRange({ preset: "custom" }, NOW))).toBe(30);
  });
});

describe("previousRange", () => {
  it("is the same length and ends the day before", () => {
    expect(previousRange({ from: "2026-10-07", to: "2026-10-13" })).toEqual({
      from: "2026-09-30",
      to: "2026-10-06",
    });
    // Across a leap day.
    expect(previousRange({ from: "2028-03-01", to: "2028-03-02" })).toEqual({
      from: "2028-02-28",
      to: "2028-02-29",
    });
  });
});

describe("customRangeError", () => {
  it("accepts a valid range and explains each invalid one", () => {
    expect(customRangeError("2026-01-01", "2026-10-13", NOW)).toBeNull();
    expect(customRangeError("", "2026-10-13", NOW)).toMatch(/start and an end/);
    expect(customRangeError("2026-10-10", "2026-10-01", NOW)).toMatch(/after the end/);
    expect(customRangeError("2026-10-01", "2026-10-14", NOW)).toMatch(/future/);
    expect(customRangeError("2025-09-08", "2026-10-13", NOW)).toMatch(/400 days or fewer/);
    expect(customRangeError("2025-09-09", "2026-10-13", NOW)).toBeNull(); // exactly 400
  });
});

describe("dayOf and inRange", () => {
  it("reads timestamps as UTC days and keeps plain dates", () => {
    expect(dayOf("2026-10-13T23:59:59.999Z")).toBe("2026-10-13");
    expect(dayOf("2026-10-13T00:30:00.000+01:00")).toBe("2026-10-12");
    expect(dayOf("2026-10-13")).toBe("2026-10-13");
    expect(dayOf("not a date")).toBeNull();
    expect(dayOf(undefined)).toBeNull();
  });

  it("includes both ends", () => {
    const r = { from: "2026-10-01", to: "2026-10-31" };
    expect(inRange("2026-10-01", r)).toBe(true);
    expect(inRange("2026-10-31", r)).toBe(true);
    expect(inRange("2026-11-01", r)).toBe(false);
    expect(inRange(null, r)).toBe(false);
  });
});

describe("buckets", () => {
  it("chooses day, week or month by length", () => {
    expect(bucketFor({ from: "2026-10-01", to: "2026-10-31" })).toBe("day");
    expect(bucketFor({ from: "2026-09-30", to: "2026-10-31" })).toBe("week");
    expect(bucketFor({ from: "2026-01-01", to: "2026-06-29" })).toBe("week"); // 180 days
    expect(bucketFor({ from: "2026-01-01", to: "2026-06-30" })).toBe("month");
  });

  it("makes one bucket per day", () => {
    const spans = bucketsFor({ from: "2026-10-11", to: "2026-10-13" });
    expect(spans.map((s) => [s.key, s.label, s.from, s.to])).toEqual([
      ["2026-10-11", "11 Oct", "2026-10-11", "2026-10-11"],
      ["2026-10-12", "12 Oct", "2026-10-12", "2026-10-12"],
      ["2026-10-13", "13 Oct", "2026-10-13", "2026-10-13"],
    ]);
  });

  it("starts weeks on Monday and clips the ends to the range", () => {
    // 2026-10-01 is a Thursday; 2026-10-13 a Tuesday.
    const spans = bucketsFor({ from: "2026-10-01", to: "2026-10-13" }, "week");
    expect(spans.map((s) => [s.key, s.from, s.to])).toEqual([
      ["2026-09-28", "2026-10-01", "2026-10-04"],
      ["2026-10-05", "2026-10-05", "2026-10-11"],
      ["2026-10-12", "2026-10-12", "2026-10-13"],
    ]);
    expect(spans[0].label).toBe("w/c 28 Sep");
  });

  it("makes calendar months, partial at the ends", () => {
    const spans = bucketsFor({ from: "2025-12-15", to: "2026-02-10" }, "month");
    expect(spans.map((s) => [s.label, s.from, s.to])).toEqual([
      ["Dec 2025", "2025-12-15", "2025-12-31"],
      ["Jan 2026", "2026-01-01", "2026-01-31"],
      ["Feb 2026", "2026-02-01", "2026-02-10"],
    ]);
  });

  it("covers every day of the range exactly once", () => {
    const r = { from: "2025-10-14", to: "2026-10-13" };
    const spans = bucketsFor(r);
    expect(spans[0].from).toBe(r.from);
    expect(spans[spans.length - 1].to).toBe(r.to);
    const days = spans.reduce((n, s) => n + rangeDays(s), 0);
    expect(days).toBe(rangeDays(r));
  });

  it("shifts a bucket back to its previous-period twin", () => {
    expect(shiftSpan({ key: "k", label: "l", from: "2026-10-05", to: "2026-10-11" }, 30)).toEqual({
      from: "2026-09-05",
      to: "2026-09-11",
    });
  });
});

describe("delta", () => {
  it("is the change over the previous figure", () => {
    expect(delta(150, 100)).toEqual({ kind: "change", ratio: 0.5 });
    expect(delta(50, 100)).toEqual({ kind: "change", ratio: -0.5 });
  });

  it("says new when the previous period was zero, and none when both were", () => {
    expect(delta(10, 0)).toEqual({ kind: "new" });
    expect(delta(0, 0)).toEqual({ kind: "none" });
  });

  it("keeps the sign right when the previous figure was a loss", () => {
    expect(delta(50, -100)).toEqual({ kind: "change", ratio: 1.5 });
  });
});

describe("saved range", () => {
  const store = (value: string | null) => ({ getItem: () => value });

  it("reads a saved preset or valid custom range", () => {
    expect(loadRangeChoice(store('{"preset":"90d"}'), NOW)).toEqual({ preset: "90d" });
    expect(
      loadRangeChoice(store('{"preset":"custom","from":"2026-01-01","to":"2026-02-01"}'), NOW),
    ).toEqual({ preset: "custom", from: "2026-01-01", to: "2026-02-01" });
  });

  it("falls back to 30 days on anything unusable", () => {
    for (const raw of [
      null,
      "not json",
      '{"preset":"5y"}',
      '{"preset":"custom","from":"2026-02-01","to":"2026-01-01"}',
      '{"preset":"custom","from":"2020-01-01","to":"2026-01-01"}',
    ]) {
      expect(loadRangeChoice(store(raw), NOW)).toEqual({ preset: "30d" });
    }
    expect(loadRangeChoice(undefined, NOW)).toEqual({ preset: "30d" });
  });

  it("saves under its key and survives a storage that throws", () => {
    const saved: Record<string, string> = {};
    saveRangeChoice({ setItem: (k, v) => void (saved[k] = v) }, { preset: "7d" });
    expect(JSON.parse(saved[RANGE_STORAGE_KEY])).toEqual({ preset: "7d" });
    expect(() =>
      saveRangeChoice(
        {
          setItem: () => {
            throw new Error("quota");
          },
        },
        { preset: "7d" },
      ),
    ).not.toThrow();
  });
});
