// @vitest-environment node
// Made-up people and organisations only (see fixture.js).
import { describe, it, expect } from "vitest";

const { resolveCv, sectionItems } = await import("./resolve.js");
const { layout } = await import("./layout.js");

const PROFILE = {
  id: "profile",
  kind: "profile",
  header: {
    name: "Ama Mensah",
    title: "Software Engineer",
    lines: ["Kumasi, Ghana", "+000 000 000 000 / Ghanaian", "ama.mensah@example.com"],
    links: [{ label: "Portfolio Website", url: "https://ama-mensah.example.com/" }],
  },
  awards: [{ id: "a1", title: "Best Student in Computing", issuer: "KTC", year: "2023" }],
  coCurricular: [
    {
      id: "c1",
      org: "Open Learning Club",
      location: "NGO",
      title: "Founder",
      period: "December 2024",
      bullets: ["Set up the club's first training roadmap."],
    },
  ],
  skills: [{ id: "s1", label: "Languages", items: "JavaScript, TypeScript" }],
  references: { mode: "on-request", text: "Available upon request" },
  footnotes: ["*WASSCE: West African Senior School Certificate Examination"],
};

function site(overrides = {}) {
  return {
    education: [],
    journey: [],
    projects: [],
    certifications: [],
    ...overrides,
  };
}

function entry(section, key, fields = {}) {
  const collection = { experience: "journey" }[section] ?? section;
  return {
    id: `entry.${section}.${key}`,
    kind: "entry",
    section,
    source: key.startsWith("cv-") ? null : { collection, id: key },
    show: true,
    order: 0,
    fields: {},
    approved: null,
    draft: null,
    ...fields,
  };
}

const JOB = {
  $id: "j1",
  $createdAt: "2025-11-01T00:00:00.000Z",
  role: "Software Engineer",
  company: "Brightpath Software",
  period: "November 2025 – Present",
  location: "Kumasi",
  achievements: ["Building features for a scheduling web app."],
  order: 1,
};

const PROJECT = {
  $id: "p1",
  $createdAt: "2025-11-01T00:00:00.000Z",
  title: "Clinic Scheduler",
  year: "2025",
};

const APPROVED = {
  roleLine: "Brightpath Software | Web Platform | Frontend Engineer",
  bullets: ["Built the booking flow.", "Tech stack: React, TypeScript."],
  approvedAt: "2026-11-01T00:00:00.000Z",
};

describe("resolveCv", () => {
  it("puts site jobs and certificates with no entry straight on the CV", () => {
    const { cv, warnings } = resolveCv(
      { profile: PROFILE, entries: [] },
      site({
        journey: [JOB],
        certifications: [{ $id: "c1", title: "Cloud Practitioner", issuer: "Example Cloud" }],
      }),
    );
    expect(cv.experience).toEqual([
      {
        org: "Brightpath Software",
        location: "Kumasi",
        title: "Software Engineer",
        period: "November 2025 – Present",
        bullets: ["Building features for a scheduling web app."],
      },
    ]);
    expect(cv.certifications).toEqual([{ title: "Cloud Practitioner", issuer: "Example Cloud" }]);
    expect(warnings).toEqual([]);
  });

  it("leaves out a project with no approved text and says it is waiting for approval", () => {
    const { cv, warnings } = resolveCv(
      { profile: PROFILE, entries: [] },
      site({ projects: [PROJECT] }),
    );
    expect(cv.projects).toEqual([]);
    expect(warnings).toEqual([
      {
        code: "waiting-for-approval",
        entryId: "entry.projects.p1",
        message: '"Clinic Scheduler" is waiting for approval, so it is left off the CV.',
      },
    ]);
  });

  it("uses approved text and never a draft", () => {
    const draft = { roleLine: "Draft line", bullets: ["Draft bullet."] };
    const pending = resolveCv(
      { profile: PROFILE, entries: [entry("projects", "p1", { draft })] },
      site({ projects: [PROJECT] }),
    );
    expect(pending.cv.projects).toEqual([]);
    expect(pending.warnings[0].code).toBe("waiting-for-approval");

    const { cv } = resolveCv(
      { profile: PROFILE, entries: [entry("projects", "p1", { draft, approved: APPROVED })] },
      site({ projects: [PROJECT] }),
    );
    expect(cv.projects).toEqual([
      {
        title: "Clinic Scheduler",
        period: "2025",
        subtitle: "Brightpath Software | Web Platform | Frontend Engineer",
        bullets: ["Built the booking flow.", "Tech stack: React, TypeScript."],
      },
    ]);
  });

  it("skips hidden entries without a warning", () => {
    const { cv, warnings } = resolveCv(
      {
        profile: PROFILE,
        entries: [
          entry("experience", "j1", { show: false }),
          entry("projects", "p1", { show: false }),
        ],
      },
      site({ journey: [JOB], projects: [PROJECT] }),
    );
    expect(cv.experience).toEqual([]);
    expect(cv.projects).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it("resolves approved text, then overrides, then the site record", () => {
    const { cv } = resolveCv(
      {
        profile: PROFILE,
        entries: [
          entry("experience", "j1", {
            fields: { location: "Remote", title: "Override title" },
            approved: { roleLine: "Senior Engineer", bullets: ["Led the team."] },
          }),
        ],
      },
      site({ journey: [JOB] }),
    );
    expect(cv.experience[0]).toEqual({
      org: "Brightpath Software",
      location: "Remote",
      title: "Senior Engineer",
      period: "November 2025 – Present",
      bullets: ["Led the team."],
    });
  });

  it("falls back to the job's achievements when nothing is approved", () => {
    const { cv } = resolveCv(
      { profile: PROFILE, entries: [entry("experience", "j1", { fields: { period: "2025" } })] },
      site({ journey: [JOB] }),
    );
    expect(cv.experience[0]).toMatchObject({
      period: "2025",
      bullets: ["Building features for a scheduling web app."],
    });
  });

  it("includes CV-only entries, which need approved text only when they are projects", () => {
    const { cv, warnings } = resolveCv(
      {
        profile: PROFILE,
        entries: [
          entry("projects", "cv-1", {
            fields: { title: "Ops Suite", period: "2024" },
            approved: { roleLine: "", bullets: ["Built an internal tool."] },
          }),
          entry("projects", "cv-2", { fields: { title: "Unapproved" } }),
          entry("certifications", "cv-3", {
            fields: { title: "Data Track", label: "In progress" },
          }),
        ],
      },
      site(),
    );
    expect(cv.projects).toEqual([
      { title: "Ops Suite", period: "2024", bullets: ["Built an internal tool."] },
    ]);
    expect(cv.certifications).toEqual([{ title: "Data Track", label: "In progress" }]);
    expect(warnings.map((w) => w.entryId)).toEqual(["entry.projects.cv-2"]);
  });

  it("applies the entries' order, after site items that have no entry yet", () => {
    const jobs = [
      { ...JOB, $id: "j1", company: "First", order: 1 },
      { ...JOB, $id: "j2", company: "Second", order: 2 },
      { ...JOB, $id: "j3", company: "New", order: 3 },
    ];
    const { cv } = resolveCv(
      {
        profile: PROFILE,
        entries: [
          entry("experience", "j1", { order: 20 }),
          entry("experience", "j2", { order: 10 }),
          entry("experience", "cv-9", { order: 15, fields: { org: "CV only" } }),
        ],
      },
      site({ journey: jobs }),
    );
    expect(cv.experience.map((e) => e.org)).toEqual(["New", "Second", "CV only", "First"]);
  });

  it("orders site items without entries the way the site lists them", () => {
    const certs = [
      { $id: "c1", title: "Old", date: "March 2024", $createdAt: "2026-01-01" },
      { $id: "c2", title: "New", date: "January 2026", $createdAt: "2024-01-01" },
      { $id: "c3", title: "Undated", $createdAt: "2026-05-01" },
    ];
    const education = [
      { $id: "e1", institution: "Low", degree: "BSc", displayOrder: 1 },
      { $id: "e2", institution: "High", degree: "BTech", displayOrder: 5 },
    ];
    const { cv } = resolveCv(
      { profile: PROFILE, entries: [] },
      site({ certifications: certs, education }),
    );
    expect(cv.certifications.map((c) => c.title)).toEqual(["New", "Old", "Undated"]);
    expect(cv.education.map((e) => e.org)).toEqual(["High", "Low"]);
  });

  it("keeps an education row hidden on the site off the CV until its entry shows it", () => {
    const hidden = { $id: "e1", institution: "Night School", degree: "Cert", isVisible: false };
    const off = resolveCv({ profile: PROFILE, entries: [] }, site({ education: [hidden] }));
    expect(off.cv.education).toEqual([]);
    const on = resolveCv(
      { profile: PROFILE, entries: [entry("education", "e1")] },
      site({ education: [hidden] }),
    );
    expect(on.cv.education).toEqual([{ org: "Night School", subtitle: "Cert" }]);
  });

  it("builds the education line from degree and field, with GPA overrides", () => {
    const row = {
      $id: "e1",
      institution: "Kumasi Technical College",
      degree: "BTech.",
      field: "Computer Science",
      location: "Kumasi",
      gpa: "4.10",
    };
    const { cv } = resolveCv(
      {
        profile: PROFILE,
        entries: [
          entry("education", "e1", {
            fields: { gpaScale: "5.00", expectedGraduation: "September 2027" },
          }),
        ],
      },
      site({ education: [row] }),
    );
    expect(cv.education).toEqual([
      {
        org: "Kumasi Technical College",
        location: "Kumasi",
        subtitle: "BTech. in Computer Science",
        expectedGraduation: "September 2027",
        gpa: "4.10",
        gpaScale: "5.00",
      },
    ]);
  });

  it("leaves out an entry whose site item is gone and reports it", () => {
    const { cv, warnings } = resolveCv(
      { profile: PROFILE, entries: [entry("experience", "gone", { order: 1 })] },
      site({ journey: [JOB] }),
    );
    expect(cv.experience).toHaveLength(1);
    expect(warnings).toEqual([
      expect.objectContaining({ code: "orphan", entryId: "entry.experience.gone" }),
    ]);
  });

  it("maps the profile to the layout's shape, without ids", () => {
    const { cv } = resolveCv({ profile: PROFILE, entries: [] }, site());
    expect(cv.header).toEqual(PROFILE.header);
    expect(cv.awards).toEqual([
      { title: "Best Student in Computing", issuer: "KTC", year: "2023" },
    ]);
    expect(cv.coCurricular[0]).not.toHaveProperty("id");
    expect(cv.skills).toEqual([{ label: "Languages", items: "JavaScript, TypeScript" }]);
    expect(cv.references).toEqual({ text: "Available upon request" });
    expect(cv.footnotes).toEqual(PROFILE.footnotes);
  });

  it("works before anything was saved, and says the header is empty", () => {
    const { cv, warnings } = resolveCv({ profile: null, entries: [] }, site({ journey: [JOB] }));
    expect(cv.header).toEqual({ name: "", title: "", lines: [], links: [] });
    expect(cv.references).toEqual({ text: "Available upon request" });
    expect(cv.experience).toHaveLength(1);
    expect(warnings.map((w) => w.code)).toEqual(["no-profile"]);
  });

  it("gives a document the layout can draw", () => {
    const { cv } = resolveCv(
      { profile: PROFILE, entries: [entry("projects", "p1", { approved: APPROVED })] },
      site({ journey: [JOB], projects: [PROJECT] }),
    );
    const measure = (text, _weight, size) => text.length * size * 0.5;
    const out = layout(cv, { measure });
    const drawn = out.pages
      .flat()
      .filter((op) => op.type === "text")
      .map((op) => op.text);
    expect(drawn.join(" ")).toContain("Clinic Scheduler");
    expect(drawn.join(" ")).toContain("Brightpath Software");
  });
});

describe("sectionItems", () => {
  it("lists every item of a section in CV order, shown or not, and the orphans apart", () => {
    const { items, orphans } = sectionItems(
      "experience",
      [
        entry("experience", "j1", { order: 10, show: false }),
        entry("experience", "gone", { order: 5 }),
        entry("projects", "p1"),
      ],
      site({ journey: [JOB, { ...JOB, $id: "j2" }] }),
    );
    expect(items.map((i) => [i.id, i.show, Boolean(i.entry)])).toEqual([
      ["entry.experience.j2", true, false],
      ["entry.experience.j1", false, true],
    ]);
    expect(orphans.map((o) => o.id)).toEqual(["entry.experience.gone"]);
  });
});
