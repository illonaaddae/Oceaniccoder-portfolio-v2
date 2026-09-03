import { describe, it, expect } from "vitest";
import { act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { certYear, useCertificationFilters } from "./useCertificationFilters";
import type { Certification } from "@/types";

const cert = (extra: Partial<Certification>): Certification =>
  ({
    $id: Math.random().toString(),
    title: "T",
    issuer: "I",
    platform: "P",
    date: "May 2025",
    ...extra,
  }) as Certification;

const certs = [
  cert({
    title: "Learn Linux",
    issuer: "Boot.dev",
    platform: "Boot.dev",
    date: "September 2026",
    certificationType: "Course Completion",
    skills: ["Bash"],
  }),
  cert({
    title: "Intermediate Python",
    issuer: "DataCamp",
    platform: "DataCamp",
    date: "July 2026",
    certificationType: "Professional Certificate",
  }),
  cert({
    title: "AWS Practitioner",
    issuer: "Amazon",
    platform: "AWS",
    date: "2022",
    certificationType: "Cloud Certification",
  }),
];

describe("certYear", () => {
  it("reads the year from a Month YYYY date", () => {
    expect(certYear("September 2026")).toBe("2026");
  });

  it("reads a bare year", () => {
    expect(certYear("2022")).toBe("2022");
  });

  it("returns empty for an unparseable date", () => {
    expect(certYear("someday")).toBe("");
    expect(certYear(undefined)).toBe("");
  });
});

describe("useCertificationFilters", () => {
  it("offers the platforms, types and years present in the data", () => {
    const { result } = renderHook(() => useCertificationFilters(certs));
    expect(result.current.platforms).toEqual(["AWS", "Boot.dev", "DataCamp"]);
    expect(result.current.types).toEqual([
      "Cloud Certification",
      "Course Completion",
      "Professional Certificate",
    ]);
    expect(result.current.years).toEqual(["2026", "2022"]);
  });

  it("searches title, issuer and skills", () => {
    const { result } = renderHook(() => useCertificationFilters(certs));

    act(() => result.current.setFilter({ search: "bash" }));
    expect(result.current.filtered.map((c) => c.title)).toEqual(["Learn Linux"]);

    act(() => result.current.setFilter({ search: "datacamp" }));
    expect(result.current.filtered.map((c) => c.title)).toEqual(["Intermediate Python"]);
  });

  it("filters by platform, type and year together", () => {
    const { result } = renderHook(() => useCertificationFilters(certs));

    act(() => result.current.setFilter({ year: "2026" }));
    expect(result.current.filtered).toHaveLength(2);

    act(() => result.current.setFilter({ type: "Course Completion" }));
    expect(result.current.filtered.map((c) => c.title)).toEqual(["Learn Linux"]);

    act(() => result.current.setFilter({ platform: "AWS" }));
    expect(result.current.filtered).toHaveLength(0);
  });

  it("reports and clears an active filter", () => {
    const { result } = renderHook(() => useCertificationFilters(certs));
    expect(result.current.isFiltered).toBe(false);

    act(() => result.current.setFilter({ platform: "AWS" }));
    expect(result.current.isFiltered).toBe(true);

    act(() => result.current.clearFilters());
    expect(result.current.isFiltered).toBe(false);
    expect(result.current.filtered).toHaveLength(3);
  });
});
