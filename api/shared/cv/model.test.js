// @vitest-environment node
import { describe, it, expect } from "vitest";

const M = await import("./model.js");

function profile(overrides = {}) {
  return {
    header: {
      name: "Ama Mensah",
      title: "Software Engineer",
      lines: ["Kumasi, Ghana", "ama.mensah@example.com"],
      links: [{ label: "Portfolio Website", url: "https://ama-mensah.example.com/" }],
    },
    awards: [{ id: "a1", title: "Best Student in Computing", issuer: "KTC", year: "2023" }],
    coCurricular: [
      { id: "c1", org: "Open Learning Club", title: "Founder", bullets: ["Set up the club."] },
    ],
    skills: [{ id: "s1", label: "Languages", items: "JavaScript, TypeScript" }],
    footnotes: ["*WASSCE: West African Senior School Certificate Examination"],
    ...overrides,
  };
}

function expectInvalid(fn, message) {
  try {
    fn();
  } catch (err) {
    expect(err.status).toBe(400);
    if (message) expect(err.message).toMatch(message);
    return;
  }
  throw new Error("Expected a 400");
}

describe("parseProfile", () => {
  it("keeps the known fields, in order, and drops anything else", () => {
    const parsed = M.parseProfile({ ...profile(), referees: [{ name: "X" }], extra: 1 });
    expect(Object.keys(parsed)).toEqual([
      "header",
      "awards",
      "coCurricular",
      "skills",
      "references",
      "footnotes",
    ]);
    expect(parsed.coCurricular[0]).toEqual({
      id: "c1",
      org: "Open Learning Club",
      location: "",
      title: "Founder",
      period: "",
      bullets: ["Set up the club."],
    });
  });

  it("defaults references to 'Available upon request' and stores no referees", () => {
    const parsed = M.parseProfile(profile({ references: { referees: [{ name: "Someone" }] } }));
    expect(parsed.references).toEqual({ mode: "on-request", text: "Available upon request" });
  });

  it("refuses a references mode that would list referees", () => {
    expectInvalid(() => M.parseProfile(profile({ references: { mode: "listed" } })), /mode/);
  });

  it("requires a name", () => {
    expectInvalid(
      () => M.parseProfile(profile({ header: { ...profile().header, name: "  " } })),
      /Name is required/,
    );
  });

  it.each(["javascript:alert(1)", "http://example.com", "data:text/html,x", "not a url"])(
    "refuses the link %s",
    (url) => {
      expectInvalid(() =>
        M.parseProfile(profile({ header: { ...profile().header, links: [{ label: "X", url }] } })),
      );
    },
  );

  it("accepts mailto: links", () => {
    const parsed = M.parseProfile(
      profile({
        header: { name: "Ama", links: [{ label: "Email", url: "mailto:ama@example.com" }] },
      }),
    );
    expect(parsed.header.links[0].url).toBe("mailto:ama@example.com");
  });

  it("refuses line breaks and control characters in one-line text", () => {
    expectInvalid(
      () => M.parseProfile(profile({ header: { name: "Ama\nMensah" } })),
      /single line/,
    );
    expectInvalid(() => M.parseProfile(profile({ header: { name: "Ama\u0007" } })), /single line/);
  });

  it("caps lengths and list sizes", () => {
    expectInvalid(() => M.parseProfile(profile({ header: { name: "A".repeat(81) } })), /80/);
    const many = Array.from({ length: 31 }, (_, i) => ({ id: `a${i}`, title: "Award" }));
    expectInvalid(() => M.parseProfile(profile({ awards: many })), /at most 30/);
    const bullets = Array.from({ length: 7 }, () => "Did a thing.");
    expectInvalid(
      () => M.parseProfile(profile({ coCurricular: [{ id: "c1", org: "Club", bullets }] })),
      /at most 6/,
    );
  });

  it("refuses list items without an id or with a repeated id", () => {
    expectInvalid(() => M.parseProfile(profile({ skills: [{ label: "A", items: "B" }] })), /id/);
    expectInvalid(
      () =>
        M.parseProfile(
          profile({
            skills: [
              { id: "s1", label: "A", items: "B" },
              { id: "s1", label: "C", items: "D" },
            ],
          }),
        ),
      /same id/,
    );
  });

  it("refuses non-objects", () => {
    expectInvalid(() => M.parseProfile(null));
    expectInvalid(() => M.parseProfile(profile({ header: "Ama" })));
  });
});

describe("parseEntry", () => {
  it("takes the section from the linked collection and shows by default", () => {
    expect(M.parseEntry({ source: { collection: "journey", id: "j1" } })).toEqual({
      section: "experience",
      source: { collection: "journey", id: "j1" },
      show: true,
      order: null,
      fields: {},
      approved: null,
      sourceNotes: "",
    });
  });

  it("refuses a linked item put in another section", () => {
    expectInvalid(
      () => M.parseEntry({ section: "projects", source: { collection: "journey", id: "j1" } }),
      /belongs in experience/,
    );
  });

  it("refuses an unknown collection or section", () => {
    expectInvalid(() => M.parseEntry({ source: { collection: "messages", id: "m1" } }));
    expectInvalid(() => M.parseEntry({ section: "hobbies", fields: { title: "Chess" } }));
  });

  it("only accepts the fields its section's layout uses, and drops empty ones", () => {
    const parsed = M.parseEntry({
      source: { collection: "education", id: "e1" },
      fields: { gpa: "4.10", gpaScale: "5.00", expectedGraduation: "" },
    });
    expect(parsed.fields).toEqual({ gpa: "4.10", gpaScale: "5.00" });
    expectInvalid(
      () => M.parseEntry({ source: { collection: "projects", id: "p1" }, fields: { gpa: "4" } }),
      /gpa can't be set on a projects entry/,
    );
  });

  it("needs the main field on a CV-only entry", () => {
    expectInvalid(() => M.parseEntry({ section: "projects", fields: {} }), /needs a title/);
    expectInvalid(() => M.parseEntry({ section: "experience" }), /needs an organisation/);
    expect(M.parseEntry({ section: "projects", fields: { title: "Ops Suite" } }).source).toBeNull();
  });

  it("takes approved text on experience and projects only, with 1 to 6 bullets", () => {
    const approved = { roleLine: "Brightpath | Web | Engineer", bullets: ["Built it.", ""] };
    expect(
      M.parseEntry({ source: { collection: "projects", id: "p1" }, approved }).approved,
    ).toEqual({ roleLine: "Brightpath | Web | Engineer", bullets: ["Built it."] });
    expectInvalid(
      () => M.parseEntry({ source: { collection: "certifications", id: "c1" }, approved }),
      /no role line/,
    );
    expectInvalid(
      () =>
        M.parseEntry({
          source: { collection: "projects", id: "p1" },
          approved: { roleLine: "", bullets: [] },
        }),
      /at least 1/,
    );
    expectInvalid(
      () =>
        M.parseEntry({
          source: { collection: "projects", id: "p1" },
          approved: { bullets: ["x".repeat(301)] },
        }),
      /300/,
    );
  });

  it("never takes a draft from the client", () => {
    const parsed = M.parseEntry({
      source: { collection: "projects", id: "p1" },
      draft: { roleLine: "x", bullets: ["y"] },
    });
    expect(parsed).not.toHaveProperty("draft");
  });

  it("keeps drafting notes on CV-only projects only, line breaks allowed", () => {
    const parsed = M.parseEntry({
      section: "projects",
      fields: { title: "Ops Suite" },
      sourceNotes: "Line one\nLine two",
    });
    expect(parsed.sourceNotes).toBe("Line one\nLine two");
    expectInvalid(
      () => M.parseEntry({ source: { collection: "projects", id: "p1" }, sourceNotes: "x" }),
      /CV-only projects/,
    );
    expectInvalid(() =>
      M.parseEntry({ section: "projects", fields: { title: "X" }, sourceNotes: "x".repeat(8001) }),
    );
  });

  it("refuses a show that isn't a boolean and an order that isn't a whole number", () => {
    const source = { collection: "journey", id: "j1" };
    expectInvalid(() => M.parseEntry({ source, show: "yes" }), /Show/);
    expectInvalid(() => M.parseEntry({ source, order: 1.5 }), /Order/);
    expectInvalid(() => M.parseEntry({ source, order: 2_000_000 }), /Order/);
  });

  it("refuses a site id that isn't an id", () => {
    expectInvalid(() => M.parseEntry({ source: { collection: "journey", id: "../x" } }));
  });
});

describe("parseReorder", () => {
  it("accepts entry ids of the section, once each", () => {
    expect(
      M.parseReorder({ section: "projects", ids: ["entry.projects.p1", "entry.projects.cv-1"] }),
    ).toEqual({ section: "projects", ids: ["entry.projects.p1", "entry.projects.cv-1"] });
    expectInvalid(
      () =>
        M.parseReorder({ section: "projects", ids: ["entry.projects.p1", "entry.projects.p1"] }),
      /twice/,
    );
    expectInvalid(() => M.parseReorder({ section: "projects", ids: ["profile"] }), /not valid/);
  });

  it("caps the list at what one batch can write", () => {
    const ids = Array.from({ length: 91 }, (_, i) => `entry.projects.p${i}`);
    expectInvalid(() => M.parseReorder({ section: "projects", ids }), /at most 90/);
  });
});
