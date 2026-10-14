import { describe, it, expect } from "vitest";
import { addedLast30Days, latestCertification } from "./statChanges";

const NOW = Date.parse("2026-10-13T12:00:00Z");

describe("addedLast30Days", () => {
  it("counts rows created in the last 30 days only", () => {
    const rows = [
      { $createdAt: "2026-10-12T00:00:00Z" },
      { $createdAt: "2026-09-14T12:00:00Z" }, // exactly 29 days ago
      { $createdAt: "2026-09-13T11:59:59Z" }, // just over 30 days ago
      { $createdAt: undefined },
    ];
    expect(addedLast30Days(rows, NOW)).toBe("+2 in 30 days");
  });

  it("says none when nothing is recent", () => {
    expect(addedLast30Days([{ $createdAt: "2025-01-01T00:00:00Z" }], NOW)).toBe("None in 30 days");
    expect(addedLast30Days([], NOW)).toBe("None in 30 days");
  });
});

describe("latestCertification", () => {
  it("names the most recently added certification", () => {
    expect(
      latestCertification([
        { title: "Azure Fundamentals", $createdAt: "2026-02-01T00:00:00Z" },
        { title: "Google UX", $createdAt: "2026-08-01T00:00:00Z" },
        { title: "No date" },
      ]),
    ).toBe("Latest: Google UX");
  });

  it("says none yet when there are no dated certifications", () => {
    expect(latestCertification([])).toBe("None yet");
    expect(latestCertification([{ title: "No date" }])).toBe("None yet");
  });
});
