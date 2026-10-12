import { describe, it, expect } from "vitest";
import {
  emptyNeedsGroup,
  emptyNeedsRow,
  isNeedsBlank,
  legacyToNeedsTables,
  needsRowCount,
  parsePastedRows,
} from "./needsTables";
import { needsTemplate } from "@/components/AdminDashboard/tabs/Quotes/needsTemplate";

const cells = (rows: { item: string; detail: string; when: string }[]) =>
  rows.map((r) => [r.item, r.detail, r.when]);

describe("parsePastedRows", () => {
  it("splits TAB-separated rows and skips a leading Item header", () => {
    const rows = parsePastedRows(
      "Item\tUsed for\tWhen\r\nLogo\tWebsite\tWeek 1\nTIN\tFor the business\t\n",
    );
    expect(cells(rows)).toEqual([
      ["Logo", "Website", "Week 1"],
      ["TIN", "For the business", ""],
    ]);
  });

  it("splits on ' | ', keeps lines without separators as item-only rows, drops blanks", () => {
    const rows = parsePastedRows("Photos | Trip pages | Week 4\n\n- Testimonials\n  \n");
    expect(cells(rows)).toEqual([
      ["Photos", "Trip pages", "Week 4"],
      ["Testimonials", "", ""],
    ]);
  });

  it("only treats the first line as a header", () => {
    expect(cells(parsePastedRows("Logo\nItem\tA"))).toEqual([
      ["Logo", "", ""],
      ["Item", "A", ""],
    ]);
  });

  it("gives every row a unique, server-valid id", () => {
    const ids = parsePastedRows("a\nb\nc").map((r) => r.id);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{1,24}$/);
  });
});

describe("legacyToNeedsTables", () => {
  it("puts lines before any heading in 'Items' and starts a group per heading", () => {
    const t = legacyToNeedsTables(
      "- Business registration certificate (Registrar General's Department)\nAccess:\n* Domain settings\nEmpty:\n",
    );
    expect(t.groups.map((g) => g.title)).toEqual(["Items", "Access"]);
    expect(t.groups[0].detailLabel).toBe("Notes");
    expect(cells(t.groups[0].rows)).toEqual([
      ["Business registration certificate", "Registrar General's Department", ""],
    ]);
    expect(cells(t.groups[1].rows)).toEqual([["Domain settings", "", ""]]);
  });
});

describe("needs helpers", () => {
  it("counts only rows with an item", () => {
    const g = emptyNeedsGroup({
      rows: [emptyNeedsRow({ item: "Logo" }), emptyNeedsRow({ detail: "x" })],
    });
    expect(needsRowCount({ intro: "", groups: [g] })).toBe(1);
    expect(needsRowCount(null)).toBe(0);
  });

  it("knows when nothing has been typed", () => {
    expect(isNeedsBlank(null)).toBe(true);
    expect(isNeedsBlank({ intro: "", groups: [emptyNeedsGroup()] })).toBe(true);
    expect(isNeedsBlank({ intro: "Hi", groups: [] })).toBe(false);
    expect(isNeedsBlank({ intro: "", groups: [emptyNeedsGroup({ title: "A" })] })).toBe(false);
  });

  it("builds the template within the server limits", () => {
    const t = needsTemplate();
    expect(t.groups.map((g) => [g.title, g.detailLabel, g.rows.length])).toEqual([
      ["Content and media", "Used for", 7],
      ["Accounts and access", "Used for", 4],
      ["Business documents for Paystack", "Notes", 7],
    ]);
    expect(t.groups[2].rows.every((r) => r.when === "")).toBe(true);
    for (const g of t.groups)
      for (const r of g.rows) {
        expect(r.item.length).toBeLessThanOrEqual(240);
        expect(r.detail.length).toBeLessThanOrEqual(240);
        expect(r.when.length).toBeLessThanOrEqual(40);
      }
    expect(needsTemplate().groups[0].id).not.toBe(t.groups[0].id);
  });
});
