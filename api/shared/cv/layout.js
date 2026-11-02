/* global module */
// Turns a resolved CV into positioned draw operations, one list per page.
// Pure: the only outside input is `measure`, so tests can check positions
// without drawing anything, and the painter (render.js) does no layout.
//
// Input (CvDocument, built by the resolver from the CV store):
//   header:         { name, title, lines: string[], links: [{ label, url }] }
//   education:      [{ org, location, subtitle, period, expectedGraduation, gpa, gpaScale }]
//   awards:         [{ title, issuer, year }]
//   experience:     [{ org, location, title, period, bullets: string[] }]
//   projects:       [{ title, period, subtitle, bullets: string[] }]
//   certifications: [{ title, issuer, label, date }]
//   coCurricular:   [{ org, location, title, period, bullets: string[] }]
//   skills:         [{ label, items }]
//   references:     { text }
//   footnotes:      string[]
// Any item with show === false is skipped, and a section with nothing left is
// left out, heading included.
//
// Output: { page: { width, height }, pages: DrawOp[][], warnings }
//   { type: "text", x, y, text, weight: "regular" | "bold", size, color }
//       y is the alphabetic baseline, from the top of the page
//   { type: "rule", x1, x2, y, thickness }        y is the centre of the line
//   { type: "link", x, y, width, height, url }    y is the top of the box
//   warnings: [{ code, message }], for the admin preview; none stop a render
//
// The constants are measured from the owner's current CV (exported by a word
// processor, Verdana): US Letter, positions in points. Its quirks are cleaned
// (owner decision D3): one bullet indent, one gap between entries, dates
// always right-aligned on an entry's first line.

const PAGE = { width: 612, height: 792 };

const LEFT = 54;
const RIGHT = 558;
const RULE = { x1: 51.84, x2: 559.44, offset: 3.1, thickness: 0.75 };
const BULLET_X = 54;
const BULLET_TEXT_X = 72;
const BULLET = "•";

// The reference sets the name at 13.9 pt and the body at 8.4 pt in Verdana.
// DejaVu Sans runs about 2% narrower than Verdana at the same size, so these
// sizes are tuned until the owner's lines break where the reference's do.
// A different font (fonts.js `source`) needs them tuned again.
const SIZE = { name: 14.3, title: 10.1, body: 8.5 };

// Baselines of the page 1 header, and the steps between its lines.
const HEADER = { name: 44.2, nameToTitle: 14.2, titleToLines: 13.6, linePitch: 11.1 };

const TOP_BASELINE = 24; // first baseline on pages 2 onwards
const BOTTOM_BASELINE = 761; // no baseline below this
const LINE = 11.1; // baseline to baseline inside a section (reference: 10.8 to 11.3)
const HEADING_TO_BODY = 13.2;
const ENTRY_GAP = 10; // extra space between experience, project and co-curricular entries
const SECTION_LEAD = 24; // last line of a section to the next heading
const FIRST_HEADING_LEAD = 19.8; // header link line to the first heading
const DATE_GAP = 12; // least space between left text and a right-aligned date

const BLACK = "#000000";
const LINK_COLOR = "#0563C1";

const MAX_PAGES = 3;

// Link boxes are sized from the type size, not the font's own ascent: they
// only need to cover the label so a click lands on it.
const LINK_ASCENT = 0.95;
const LINK_DESCENT = 0.25;

const SECTION_TITLES = {
  education: "EDUCATION",
  awards: "ACHIEVEMENTS/AWARDS",
  experience: "WORK EXPERIENCE",
  projects: "PROJECTS AND RESEARCH",
  certifications: "CERTIFICATIONS",
  coCurricular: "CO-CURRICULAR ACTIVITIES",
  skills: "SKILLS",
  references: "REFERENCES",
};

// Text from the store is typed by hand. Control characters would draw as
// missing glyphs, and runs of spaces or line breaks would break the layout.
function clean(value) {
  if (value === null || value === undefined) return "";
  return (
    String(value)
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function shown(items) {
  return Array.isArray(items) ? items.filter((item) => item && item.show !== false) : [];
}

function cleanBullets(bullets) {
  return Array.isArray(bullets) ? bullets.map(clean).filter(Boolean) : [];
}

function runs(...parts) {
  return parts.filter((part) => part && part.text);
}

function bold(text) {
  return { text, weight: "bold" };
}

function regular(text) {
  return { text, weight: "regular" };
}

function textOp(x, y, text, weight, size = SIZE.body, color = BLACK) {
  return { type: "text", x, y, text, weight, size, color };
}

// Splits styled runs into lines no wider than the given widths. Words are kept
// whole unless one alone is wider than a line, which is then cut by character.
function wrapRuns(styled, firstWidth, restWidth, size, measure) {
  const tokens = [];
  for (const run of styled) {
    for (const piece of run.text.split(/(\s+)/)) {
      if (!piece) continue;
      tokens.push({ text: piece, weight: run.weight, space: /^\s+$/.test(piece) });
    }
  }

  const lines = [];
  let line = [];
  let width = 0;
  let pendingSpace = null;
  const limit = () => (lines.length === 0 ? firstWidth : restWidth);
  const finish = () => {
    lines.push(line);
    line = [];
    width = 0;
    pendingSpace = null;
  };

  for (const token of tokens) {
    if (token.space) {
      if (line.length) pendingSpace = { text: " ", weight: token.weight };
      continue;
    }
    const wordWidth = measure(token.text, token.weight, size);
    const spaceWidth = pendingSpace ? measure(" ", pendingSpace.weight, size) : 0;
    if (line.length && width + spaceWidth + wordWidth > limit()) finish();
    if (!line.length && wordWidth > limit()) {
      // One word wider than the line: cut it where it overflows.
      let rest = token.text;
      while (rest && measure(rest, token.weight, size) > limit()) {
        let cut = 1;
        const chars = Array.from(rest);
        while (
          cut < chars.length &&
          measure(chars.slice(0, cut + 1).join(""), token.weight, size) <= limit()
        ) {
          cut += 1;
        }
        line.push({ text: chars.slice(0, cut).join(""), weight: token.weight });
        finish();
        rest = chars.slice(cut).join("");
      }
      if (rest) {
        line.push({ text: rest, weight: token.weight });
        width = measure(rest, token.weight, size);
      }
      continue;
    }
    if (pendingSpace && line.length) {
      line.push(pendingSpace);
      width += spaceWidth;
    }
    pendingSpace = null;
    line.push({ text: token.text, weight: token.weight });
    width += wordWidth;
  }
  if (line.length) lines.push(line);
  return lines;
}

// One text op per same-weight stretch of a line, placed by measured width.
function lineOps(line, x, y, size, measure) {
  const ops = [];
  let cursor = x;
  let i = 0;
  while (i < line.length) {
    const weight = line[i].weight;
    let text = "";
    while (i < line.length && line[i].weight === weight) {
      text += line[i].text;
      i += 1;
    }
    ops.push(textOp(cursor, y, text, weight, size));
    cursor += measure(text, weight, size);
  }
  return ops;
}

// A row is what the paginator moves as one piece: its ops sit relative to the
// row's first baseline (y = 0), `depth` is how far its last baseline is below
// that, and `lead` is the space from the previous row's last baseline.
// keepWithNext ties it to the next row so a heading or an entry's header
// never ends a page alone.
function textRow(styled, { x, right, lead, measure, keepWithNext = false }) {
  const rightText = clean(right);
  const rightWidth = rightText ? measure(rightText, "bold", SIZE.body) : 0;
  const firstWidth = RIGHT - x - (rightText ? rightWidth + DATE_GAP : 0);
  const lines = wrapRuns(styled, firstWidth, RIGHT - x, SIZE.body, measure);
  const ops = [];
  lines.forEach((line, index) => ops.push(...lineOps(line, x, index * LINE, SIZE.body, measure)));
  if (rightText) ops.push(textOp(RIGHT - rightWidth, 0, rightText, "bold"));
  return { lead, ops, depth: Math.max(0, lines.length - 1) * LINE, keepWithNext };
}

function bulletRow(styled, { right, lead, measure, keepWithNext = false }) {
  const row = textRow(styled, { x: BULLET_TEXT_X, right, lead, measure, keepWithNext });
  row.ops.unshift(textOp(BULLET_X, 0, BULLET, "regular"));
  return row;
}

function headingRow(key, lead) {
  const ruleY = RULE.offset + RULE.thickness / 2;
  return {
    lead,
    ops: [
      textOp(LEFT, 0, SECTION_TITLES[key], "bold"),
      { type: "rule", x1: RULE.x1, x2: RULE.x2, y: ruleY, thickness: RULE.thickness },
    ],
    depth: 0,
    keepWithNext: true,
  };
}

// Leads for an entry's first row: right under the heading, or after the one
// before it, with a gap where the reference leaves a blank line.
function entryLead(index, spaced) {
  if (index === 0) return HEADING_TO_BODY;
  return spaced ? LINE + ENTRY_GAP : LINE;
}

function educationRows(items, measure) {
  const rows = [];
  items.forEach((item, index) => {
    const entry = [];
    const graduation = clean(item.expectedGraduation);
    const right2 = graduation ? `Expected Date of Graduation: ${graduation}` : clean(item.period);
    entry.push(textRow(runs(bold(clean(item.org))), { x: LEFT, right: item.location, measure }));
    if (clean(item.subtitle) || right2) {
      entry.push(textRow(runs(bold(clean(item.subtitle))), { x: LEFT, right: right2, measure }));
    }
    const gpa = clean(item.gpa);
    if (gpa) {
      const scale = clean(item.gpaScale);
      entry.push(
        textRow(runs(regular("Cumulative GPA: "), bold(gpa), regular(scale ? `/${scale}` : "")), {
          x: LEFT,
          measure,
        }),
      );
    }
    rows.push(...chain(entry, entryLead(index, false)));
  });
  return rows;
}

// Experience and co-curricular share a shape: "Org – Location" and the period
// on the first line, the role under it, then bullets.
function entryWithBulletsRows(items, measure, separator) {
  const rows = [];
  items.forEach((item, index) => {
    const entry = [];
    const location = clean(item.location);
    const org = clean(item.org);
    entry.push(
      textRow(runs(bold(location ? `${org}${separator}` : org), regular(location)), {
        x: LEFT,
        right: item.period,
        measure,
      }),
    );
    if (clean(item.title)) entry.push(textRow(runs(bold(clean(item.title))), { x: LEFT, measure }));
    const headerRows = entry.length;
    for (const bullet of cleanBullets(item.bullets))
      entry.push(bulletRow(runs(regular(bullet)), { measure }));
    rows.push(...chain(entry, entryLead(index, true), headerRows));
  });
  return rows;
}

function projectRows(items, measure) {
  const rows = [];
  items.forEach((item, index) => {
    const entry = [];
    entry.push(textRow(runs(bold(clean(item.title))), { x: LEFT, right: item.period, measure }));
    if (clean(item.subtitle))
      entry.push(textRow(runs(bold(clean(item.subtitle))), { x: LEFT, measure }));
    const headerRows = entry.length;
    for (const bullet of cleanBullets(item.bullets))
      entry.push(bulletRow(runs(regular(bullet)), { measure }));
    rows.push(...chain(entry, entryLead(index, true), headerRows));
  });
  return rows;
}

function awardRows(items, measure) {
  return items.map((item, index) => {
    const issuer = clean(item.issuer);
    const title = clean(item.title);
    return textRow(runs(bold(issuer ? `${title},` : title), regular(issuer ? ` ${issuer}` : "")), {
      x: LEFT,
      right: item.year,
      lead: entryLead(index, false),
      measure,
    });
  });
}

function certificationRows(items, measure) {
  return items.map((item, index) => {
    const issuer = clean(item.issuer);
    const label = clean(item.label);
    const title = clean(item.title);
    return bulletRow(
      runs(
        bold(issuer ? `${title},` : title),
        regular(issuer ? ` ${issuer}` : ""),
        regular(label ? ` (${label})` : ""),
      ),
      { right: item.date, lead: entryLead(index, false), measure },
    );
  });
}

function skillRows(items, measure) {
  return items.map((item, index) =>
    bulletRow(runs(bold(`${clean(item.label)}:`), regular(` ${clean(item.items)}`)), {
      lead: entryLead(index, false),
      measure,
    }),
  );
}

// Gives the first row its lead, the rest one line each, and ties each of the
// first `keep` rows (by default all of them) to the row after it. For an entry
// with bullets, `keep` is its header rows, so the header always has its first
// bullet under it.
function chain(entryRows, firstLead, keep = entryRows.length - 1) {
  return entryRows.map((row, index) => ({
    ...row,
    lead: index === 0 ? firstLead : LINE,
    keepWithNext: index < Math.min(keep, entryRows.length - 1),
  }));
}

function isSafeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "mailto:";
  } catch {
    return false;
  }
}

function centred(text, weight, size, y, measure) {
  const width = measure(text, weight, size);
  return { op: textOp((PAGE.width - width) / 2, y, text, weight, size), width };
}

function headerOps(header, measure, warnings) {
  const ops = [];
  const maxWidth = RIGHT - LEFT;
  const checkWidth = (width, what) => {
    if (width > maxWidth) {
      warnings.push({
        code: "header-overflow",
        message: `The header ${what} is wider than the page margins.`,
      });
    }
  };

  let y = HEADER.name;
  const name = clean(header.name).toUpperCase();
  if (name) {
    const { op, width } = centred(name, "regular", SIZE.name, y, measure);
    checkWidth(width, "name");
    ops.push(op);
  }
  const title = clean(header.title);
  if (title) {
    y += HEADER.nameToTitle;
    const { op, width } = centred(title, "bold", SIZE.title, y, measure);
    checkWidth(width, "title");
    ops.push(op);
  }

  let step = HEADER.titleToLines;
  for (const line of (Array.isArray(header.lines) ? header.lines : []).map(clean).filter(Boolean)) {
    y += step;
    step = HEADER.linePitch;
    const { op, width } = centred(line, "regular", SIZE.body, y, measure);
    checkWidth(width, "contact line");
    ops.push(op);
  }

  const links = (Array.isArray(header.links) ? header.links : [])
    .map((link) => ({ label: clean(link && link.label), url: clean(link && link.url) }))
    .filter((link) => link.label);
  if (links.length) {
    y += step;
    const separator = " | ";
    const sepWidth = measure(separator, "regular", SIZE.body);
    const widths = links.map((link) => measure(link.label, "regular", SIZE.body));
    const total = widths.reduce((sum, w) => sum + w, 0) + sepWidth * (links.length - 1);
    checkWidth(total, "link line");
    let x = (PAGE.width - total) / 2;
    links.forEach((link, index) => {
      if (index > 0) {
        ops.push(textOp(x, y, separator, "regular"));
        x += sepWidth;
      }
      const width = widths[index];
      if (isSafeUrl(link.url)) {
        ops.push(textOp(x, y, link.label, "regular", SIZE.body, LINK_COLOR));
        ops.push({
          type: "rule",
          x1: x,
          x2: x + width,
          y: y + 1.2,
          thickness: 0.5,
          color: LINK_COLOR,
        });
        ops.push({
          type: "link",
          x,
          y: y - SIZE.body * LINK_ASCENT,
          width,
          height: SIZE.body * (LINK_ASCENT + LINK_DESCENT),
          url: link.url,
        });
      } else {
        // Only https: and mailto: may become a PDF link; anything else is
        // printed as plain text so a pasted javascript: URL does nothing.
        ops.push(textOp(x, y, link.label, "regular"));
        warnings.push({
          code: "link-scheme",
          message: `The link "${link.label}" is not an https: or mailto: address, so it is shown without a link.`,
        });
      }
      x += width;
    });
  }
  return { ops, lastBaseline: y };
}

function sectionRows(cv, measure) {
  const sections = [];
  const add = (key, rows) => {
    if (rows.length) sections.push({ key, rows });
  };
  add("education", educationRows(shown(cv.education), measure));
  add("awards", awardRows(shown(cv.awards), measure));
  add("experience", entryWithBulletsRows(shown(cv.experience), measure, " – "));
  add("projects", projectRows(shown(cv.projects), measure));
  add("certifications", certificationRows(shown(cv.certifications), measure));
  add("coCurricular", entryWithBulletsRows(shown(cv.coCurricular), measure, ", "));
  add("skills", skillRows(shown(cv.skills), measure));
  const referenceText = clean(cv.references && cv.references.text);
  if (referenceText) {
    add("references", [
      textRow(runs(regular(referenceText)), { x: LEFT, lead: HEADING_TO_BODY, measure }),
    ]);
  }

  const rows = [];
  sections.forEach((section, index) => {
    rows.push(headingRow(section.key, index === 0 ? FIRST_HEADING_LEAD : SECTION_LEAD));
    rows.push(...section.rows);
  });
  const footnotes = (Array.isArray(cv.footnotes) ? cv.footnotes : []).map(clean).filter(Boolean);
  footnotes.forEach((note, index) => {
    rows.push(
      textRow(runs(regular(note)), {
        x: LEFT,
        lead: index === 0 ? (rows.length ? SECTION_LEAD : FIRST_HEADING_LEAD) : LINE,
        measure,
      }),
    );
  });
  return rows;
}

function place(row, baseline) {
  return row.ops.map((op) => ({ ...op, y: round(op.y + baseline) }));
}

function round(value) {
  return Math.round(value * 100) / 100;
}

// Fills pages top to bottom. Before placing a row it checks that the row and
// every row tied to it by keepWithNext fit above the bottom; if not, and the
// page already has body rows, it starts a new page first.
function paginate(rows, header, warnings) {
  const pages = [header.ops];
  let last = header.lastBaseline;
  let pageHasBody = false;

  const bottomOfChain = (start, from) => {
    let baseline = from;
    let i = start;
    for (;;) {
      baseline += rows[i].lead;
      const bottom = baseline + rows[i].depth;
      if (!rows[i].keepWithNext || i === rows.length - 1) return bottom;
      baseline = bottom;
      i += 1;
    }
  };

  rows.forEach((row, index) => {
    if (pageHasBody && bottomOfChain(index, last) > BOTTOM_BASELINE) {
      pages.push([]);
      pageHasBody = false;
    }
    const isFreshPage = !pageHasBody && pages.length > 1;
    const baseline = isFreshPage ? TOP_BASELINE : last + row.lead;
    if (baseline + row.depth > BOTTOM_BASELINE) {
      warnings.push({
        code: "overflow",
        message: "A block of text is taller than a page and runs off the bottom.",
      });
    }
    pages[pages.length - 1].push(...place(row, baseline));
    last = baseline + row.depth;
    pageHasBody = true;
  });
  return pages;
}

function layout(cv, { measure }) {
  if (!cv || typeof cv !== "object") throw new Error("layout needs a CV document");
  if (typeof measure !== "function")
    throw new Error("layout needs a measure(text, weight, size) function");
  const warnings = [];
  const header = headerOps(cv.header || {}, measure, warnings);
  const rows = sectionRows(cv, measure);
  const pages = paginate(rows, header, warnings);
  if (pages.length > MAX_PAGES) {
    warnings.push({
      code: "pages",
      message: `The CV runs to ${pages.length} pages; the current one is ${MAX_PAGES}.`,
    });
  }
  return { page: { ...PAGE }, pages, warnings };
}

module.exports = {
  layout,
  wrapRuns,
  TEMPLATE: {
    PAGE,
    LEFT,
    RIGHT,
    RULE,
    BULLET_X,
    BULLET_TEXT_X,
    SIZE,
    HEADER,
    TOP_BASELINE,
    BOTTOM_BASELINE,
    LINE,
    MAX_PAGES,
    LINK_COLOR,
    SECTION_TITLES,
  },
};
