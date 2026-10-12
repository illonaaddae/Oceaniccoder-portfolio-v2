import { describe, it, expect } from "vitest";
import { parseNeeds, serializeNeeds, textToRows, rowsToText, splitNote } from "./needsList";

describe("parseNeeds", () => {
  it("returns nothing for empty text", () => {
    expect(parseNeeds("")).toEqual({ groups: [], count: 0 });
    expect(parseNeeds("  \n\n ")).toEqual({ groups: [], count: 0 });
  });

  it("groups items under headings and strips the colon", () => {
    const r = parseNeeds("Access:\nEmail login\nDomain\nContent:\nPhotos");
    expect(r.count).toBe(3);
    expect(r.groups).toEqual([
      {
        heading: "Access",
        items: [
          { text: "Email login", note: "" },
          { text: "Domain", note: "" },
        ],
      },
      { heading: "Content", items: [{ text: "Photos", note: "" }] },
    ]);
  });

  it("uses one headingless group when there are no headings", () => {
    const r = parseNeeds("Logo\nPhotos");
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0].heading).toBeNull();
    expect(r.count).toBe(2);
  });

  it("keeps items before the first heading in a headingless group", () => {
    const r = parseNeeds("Logo\nAccess:\nEmail");
    expect(r.groups.map((g) => g.heading)).toEqual([null, "Access"]);
  });

  it("strips bullets with and without a space", () => {
    const r = parseNeeds("- One\n-Two\n• Three\n*Four\n* Five");
    expect(r.groups[0].items.map((i) => i.text)).toEqual(["One", "Two", "Three", "Four", "Five"]);
  });

  it("ignores blank lines and headings with no items", () => {
    const r = parseNeeds("\nEmpty:\n\nFull:\n\nItem\n\n");
    expect(r.groups).toEqual([{ heading: "Full", items: [{ text: "Item", note: "" }] }]);
  });

  it("splits a trailing parenthetical into a note", () => {
    const r = parseNeeds("Business registration certificate (Registrar General's Department)");
    expect(r.groups[0].items[0]).toEqual({
      text: "Business registration certificate",
      note: "Registrar General's Department",
    });
  });

  it("only takes the final parenthetical and handles nesting and no space", () => {
    expect(splitNote("Tax (TIN) form (Form A)")).toEqual({
      text: "Tax (TIN) form",
      note: "Form A",
    });
    expect(splitNote("Address listed(For example GA-1 (GPS))")).toEqual({
      text: "Address listed",
      note: "For example GA-1 (GPS)",
    });
  });

  it("keeps unbalanced parentheses as text", () => {
    expect(splitNote("Photos (high res")).toEqual({ text: "Photos (high res", note: "" });
    expect(splitNote("Photos high res)")).toEqual({ text: "Photos high res)", note: "" });
  });

  it("leaves mid-text parentheses and a fully parenthetical item alone", () => {
    expect(splitNote("Logo (SVG) and colours").note).toBe("");
    expect(splitNote("(Only a note)")).toEqual({ text: "(Only a note)", note: "" });
  });

  it("keeps an item with a colon in the middle as an item", () => {
    const r = parseNeeds("Trip details: itinerary, dates, prices");
    expect(r.groups[0].heading).toBeNull();
    expect(r.groups[0].items[0].text).toBe("Trip details: itinerary, dates, prices");
  });
});

describe("serializeNeeds / rows", () => {
  it("round-trips headings, items and notes", () => {
    const text = "Logo\nAccess:\nEmail (info@x.com)\nDomain";
    expect(serializeNeeds(parseNeeds(text).groups)).toBe(text);
  });

  it("converts rows to stored text and back", () => {
    const rows = textToRows("- Access:\n- Email (login)\n\nDocs:\nTIN");
    expect(rows).toEqual([
      { kind: "heading", text: "Access" },
      { kind: "item", text: "Email (login)" },
      { kind: "heading", text: "Docs" },
      { kind: "item", text: "TIN" },
    ]);
    expect(rowsToText(rows)).toBe("Access:\nEmail (login)\nDocs:\nTIN");
  });

  it("drops blank rows and never doubles the colon", () => {
    expect(
      rowsToText([
        { kind: "heading", text: "Access:" },
        { kind: "item", text: "  " },
        { kind: "item", text: " Email " },
      ]),
    ).toBe("Access:\nEmail");
  });
});
