// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";

const { layout, wrapRuns, TEMPLATE } = await import("./layout.js");
const { loadFonts, createMeasurer } = await import("./fonts.js");
const { fixtureCv } = await import("./fixture.js");

const HEADINGS = Object.values(TEMPLATE.SECTION_TITLES);
const { SIZE } = TEMPLATE;

let measure;

beforeAll(async () => {
  measure = createMeasurer(await loadFonts());
});

const texts = (ops) => ops.filter((op) => op.type === "text");
const allOps = (result) => result.pages.flat();
const findText = (result, text) =>
  allOps(result).find((op) => op.type === "text" && op.text === text);
const rightEdge = (op) => op.x + measure(op.text, op.weight, op.size);
const isHeading = (op) => op.type === "text" && op.weight === "bold" && HEADINGS.includes(op.text);

describe("layout header", () => {
  it("centres the name in capitals, then the title, contact lines and links", () => {
    const result = layout(fixtureCv(), { measure });
    const name = findText(result, "AMA MENSAH");
    expect(name).toMatchObject({ weight: "regular", size: SIZE.name, y: 44.2 });
    expect(name.x + measure(name.text, "regular", SIZE.name) / 2).toBeCloseTo(306, 1);

    const title = findText(result, "Software Engineer");
    expect(title).toMatchObject({ weight: "bold", size: SIZE.title });
    expect(title.x + measure(title.text, "bold", SIZE.title) / 2).toBeCloseTo(306, 1);

    const email = findText(result, "ama.mensah@example.com");
    expect(email.x + measure(email.text, "regular", SIZE.body) / 2).toBeCloseTo(306, 1);
  });

  it("underlines each link label and covers it with a link to its URL", () => {
    const result = layout(fixtureCv(), { measure });
    const links = result.pages[0].filter((op) => op.type === "link");
    expect(links.map((link) => link.url)).toEqual([
      "https://www.linkedin.example/in/ama-mensah",
      "https://github.example/ama-mensah",
      "https://ama-mensah.example.com/",
    ]);
    const label = findText(result, "GitHub Profile");
    expect(label.color).toBe(TEMPLATE.LINK_COLOR);
    const link = links[1];
    expect(link.x).toBeCloseTo(label.x, 5);
    expect(link.width).toBeCloseTo(measure("GitHub Profile", "regular", SIZE.body), 5);
    expect(link.y).toBeLessThan(label.y);
    expect(link.y + link.height).toBeGreaterThan(label.y);
    const underline = result.pages[0].find((op) => op.type === "rule" && op.x1 === label.x);
    expect(underline.y).toBeGreaterThan(label.y);
    expect(texts(result.pages[0]).filter((op) => op.text === " | ")).toHaveLength(2);
  });

  it("prints a link that is not https: or mailto: as plain text, with a warning", () => {
    const cv = fixtureCv();
    cv.header.links = [{ label: "Bad", url: "javascript:alert(1)" }];
    const result = layout(cv, { measure });
    expect(result.pages[0].filter((op) => op.type === "link")).toHaveLength(0);
    expect(findText(result, "Bad").color).toBe("#000000");
    expect(result.warnings.map((w) => w.code)).toEqual(["link-scheme"]);
  });
});

describe("layout sections", () => {
  it("lays the sections out in the reference order, with the footnote last", () => {
    const result = layout(fixtureCv(), { measure });
    const order = allOps(result)
      .filter(isHeading)
      .map((op) => op.text);
    expect(order).toEqual(HEADINGS);
    const last = texts(allOps(result)).at(-1);
    expect(last.text).toBe("*WASSCE – West African Senior School Certificate Examination");
  });

  it("draws a full-width black rule just under every heading", () => {
    const result = layout(fixtureCv(), { measure });
    for (const page of result.pages) {
      for (const heading of page.filter(isHeading)) {
        expect(heading.x).toBe(TEMPLATE.LEFT);
        const rule = page.find(
          (op) => op.type === "rule" && op.y > heading.y && op.y < heading.y + 5,
        );
        expect(rule).toMatchObject({ x1: 51.84, x2: 559.44, thickness: 0.75 });
        expect(rule.y - heading.y).toBeCloseTo(3.1 + 0.75 / 2, 1);
        expect(rule.color).toBeUndefined();
      }
    }
  });

  it("right-aligns dates, years and locations on the right margin", () => {
    const result = layout(fixtureCv(), { measure });
    for (const text of [
      "November 2025 – Present",
      "2023",
      "December 2025",
      "Berlin, Germany (Online)",
    ]) {
      const op = findText(result, text);
      expect(op.weight).toBe("bold");
      expect(rightEdge(op)).toBeCloseTo(TEMPLATE.RIGHT, 5);
    }
    const graduation = findText(result, "Expected Date of Graduation: September 2027");
    expect(rightEdge(graduation)).toBeCloseTo(TEMPLATE.RIGHT, 5);
  });

  it("writes an experience entry as bold org, regular location, bold role, then bullets", () => {
    const result = layout(fixtureCv(), { measure });
    const org = findText(result, "Brightpath Software – ");
    const location = findText(result, "Kumasi");
    expect(org).toMatchObject({ weight: "bold", x: TEMPLATE.LEFT });
    expect(location).toMatchObject({ weight: "regular", y: org.y });
    expect(location.x).toBeCloseTo(org.x + measure(org.text, "bold", SIZE.body), 5);
    const role = allOps(result).find(
      (op) => op.text === "Software Engineer" && op.size === SIZE.body,
    );
    expect(role).toMatchObject({ weight: "bold", x: TEMPLATE.LEFT });
    expect(role.y).toBeCloseTo(org.y + TEMPLATE.LINE, 5);
  });

  it("splits the GPA line into regular label, bold grade and regular scale", () => {
    const result = layout(fixtureCv(), { measure });
    const label = findText(result, "Cumulative GPA: ");
    const grade = findText(result, "4.10");
    const scale = findText(result, "/5.00");
    expect([label.weight, grade.weight, scale.weight]).toEqual(["regular", "bold", "regular"]);
    expect(grade.y).toBe(label.y);
    expect(scale.x).toBeCloseTo(grade.x + measure("4.10", "bold", SIZE.body), 5);
  });

  it("hangs every bullet: the dot at 54 pt, its text and wrapped lines at 72 pt", () => {
    const result = layout(fixtureCv(), { measure });
    const bullets = allOps(result).filter((op) => op.text === "•");
    expect(bullets.length).toBeGreaterThan(10);
    for (const bullet of bullets) {
      expect(bullet.x).toBe(TEMPLATE.BULLET_X);
      const text = allOps(result).find(
        (op) => op.type === "text" && op.y === bullet.y && op.x === TEMPLATE.BULLET_TEXT_X,
      );
      expect(text).toBeDefined();
    }
  });

  it("wraps a long bullet at the right margin, filling each line as far as it goes", () => {
    const result = layout(fixtureCv(), { measure });
    const first = allOps(result).find(
      (op) => op.type === "text" && op.text.startsWith("Building features"),
    );
    const second = allOps(result).find(
      (op) => op.type === "text" && Math.abs(op.y - (first.y + TEMPLATE.LINE)) < 0.01,
    );
    expect(second.x).toBe(TEMPLATE.BULLET_TEXT_X);
    expect(`${first.text} ${second.text}`).toBe(
      "Building features for a scheduling web application used by clinics across several regions, working in a team of five engineers.",
    );
    expect(rightEdge(first)).toBeLessThanOrEqual(TEMPLATE.RIGHT);
    // Greedy and exact: the next word would not have fitted on the first line.
    const nextWord = second.text.split(" ")[0];
    expect(rightEdge({ ...first, text: `${first.text} ${nextWord}` })).toBeGreaterThan(
      TEMPLATE.RIGHT,
    );
  });

  it("keeps all text inside the margins and above the bottom limit", () => {
    const result = layout(fixtureCv(), { measure });
    for (const op of texts(allOps(result))) {
      expect(op.x).toBeGreaterThanOrEqual(TEMPLATE.LEFT);
      expect(rightEdge(op)).toBeLessThanOrEqual(TEMPLATE.RIGHT + 1e-6);
      expect(op.y).toBeLessThanOrEqual(TEMPLATE.BOTTOM_BASELINE);
    }
  });

  it("keeps a long project title clear of its date by wrapping it", () => {
    const cv = fixtureCv();
    cv.projects[0].title =
      "A very long project title that goes on and on about what the project was and who it was for";
    const result = layout(cv, { measure });
    const date = allOps(result).find((op) => op.text === "November 2025 – Present" && op.y > 300);
    const titleLine = allOps(result).find(
      (op) => op.type === "text" && op.y === date.y && op.x === TEMPLATE.LEFT,
    );
    expect(rightEdge(titleLine)).toBeLessThan(date.x);
  });

  it("leaves out empty sections and hidden items", () => {
    const cv = fixtureCv();
    cv.awards = [];
    cv.skills = cv.skills.map((skill) => ({ ...skill, show: false }));
    delete cv.coCurricular;
    const result = layout(cv, { measure });
    const headings = allOps(result)
      .filter(isHeading)
      .map((op) => op.text);
    expect(headings).not.toContain("ACHIEVEMENTS/AWARDS");
    expect(headings).not.toContain("SKILLS");
    expect(headings).not.toContain("CO-CURRICULAR ACTIVITIES");
    expect(allOps(result).some((op) => op.type === "text" && op.text.includes("Old Firm"))).toBe(
      false,
    );
    expect(
      allOps(result).some((op) => op.type === "text" && op.text.includes("must not appear")),
    ).toBe(false);
  });

  it("strips control characters and collapses runs of spaces in typed text", () => {
    const cv = fixtureCv();
    cv.skills = [{ label: "Tools", items: "Git,\u0007  GitHub\n\tFigma" }];
    const result = layout(cv, { measure });
    expect(findText(result, " Git, GitHub Figma")).toBeDefined();
  });
});

describe("layout pages", () => {
  // Pushes content down a line at a time so headings and entry headers land
  // on every possible spot near the bottom of a page.
  function withFillerAwards(count) {
    const cv = fixtureCv();
    for (let i = 0; i < count; i += 1) cv.awards.push({ title: `Filler award ${i}`, year: "2020" });
    return cv;
  }

  it("never leaves a heading or an entry header without body text under it on the same page", () => {
    for (let count = 0; count <= 45; count += 1) {
      const result = layout(withFillerAwards(count), { measure });
      result.pages.forEach((page) => {
        for (const heading of page.filter(isHeading)) {
          expect(texts(page).some((op) => op.y > heading.y)).toBe(true);
        }
        // An entry header: a bold line at the left margin followed by a
        // bullet on the next rows. Its first bullet must be on the same page.
        for (const org of texts(page).filter((op) => op.text.endsWith(" – "))) {
          expect(page.some((op) => op.text === "•" && op.y > org.y)).toBe(true);
        }
      });
    }
  });

  it("starts pages after the first at the top baseline, with no gap carried over", () => {
    const result = layout(withFillerAwards(10), { measure });
    expect(result.pages.length).toBeGreaterThan(1);
    for (const page of result.pages.slice(1)) {
      expect(Math.min(...texts(page).map((op) => op.y))).toBe(TEMPLATE.TOP_BASELINE);
    }
  });

  it("fits the fixture on two pages with no warnings", () => {
    const result = layout(fixtureCv(), { measure });
    expect(result.page).toEqual({ width: 612, height: 792 });
    expect(result.pages).toHaveLength(2);
    expect(result.warnings).toEqual([]);
  });

  it("warns, but still lays out every page, when the CV runs past three pages", () => {
    const cv = fixtureCv();
    cv.projects = Array.from({ length: 20 }, () => cv.projects[0]);
    const result = layout(cv, { measure });
    expect(result.pages.length).toBeGreaterThan(TEMPLATE.MAX_PAGES);
    expect(result.warnings).toEqual([
      {
        code: "pages",
        message: `The CV runs to ${result.pages.length} pages; the current one is 3.`,
      },
    ]);
  });

  it("refuses to run without a CV or a measure function", () => {
    expect(() => layout(null, { measure })).toThrow("layout needs a CV document");
    expect(() => layout(fixtureCv(), {})).toThrow("layout needs a measure");
  });
});

describe("wrapRuns", () => {
  it("cuts a single word that is wider than the line", () => {
    const lines = wrapRuns([{ text: "x".repeat(200), weight: "regular" }], 100, 100, 8.4, measure);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(measure(line.map((run) => run.text).join(""), "regular", 8.4)).toBeLessThanOrEqual(
        100,
      );
    }
    expect(
      lines
        .flat()
        .map((run) => run.text)
        .join(""),
    ).toBe("x".repeat(200));
  });

  it("keeps bold and regular runs apart on one line", () => {
    const lines = wrapRuns(
      [
        { text: "Label:", weight: "bold" },
        { text: " one two", weight: "regular" },
      ],
      500,
      500,
      8.4,
      measure,
    );
    expect(lines).toEqual([
      [
        { text: "Label:", weight: "bold" },
        { text: " ", weight: "regular" },
        { text: "one", weight: "regular" },
        { text: " ", weight: "regular" },
        { text: "two", weight: "regular" },
      ],
    ]);
  });
});
