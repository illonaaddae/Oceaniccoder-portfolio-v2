// The /api/cv actions. Each takes ({ repo, sites }, input, now) and returns
// the response body. `repo` is the CV store (shared/cv/repo.js), `sites()`
// reads the site records entries link to. Validation lives in
// shared/cv/model.js and the join with the site in shared/cv/resolve.js.
//
// `preview` also takes `render` (shared/cv/render.js renderCv), which turns
// the resolved CV into PDF bytes.
//
// Every write carries `version`, the CV store version the client's screen
// was loaded from (load returns it), and is refused when the store has moved
// on since: the client sends whole records, so a stale screen would otherwise
// put old values back over newer ones.

const { HttpError } = require("../shared/http");
const { newId } = require("../shared/cosmos");
const { readForWrite: readVersioned, stamp } = require("../shared/personal");
const M = require("../shared/cv/model");
const { resolveCv, sectionItems, shownByDefault } = require("../shared/cv/resolve");

const ENTRY_GONE = new HttpError(404, "That CV entry no longer exists. Refresh and try again.");
const SITE_ITEM_GONE = new HttpError(
  404,
  "That site item no longer exists. Refresh and try again.",
);

function readForWrite(repo, input) {
  return readVersioned(repo, input, "CV");
}

function split(docs) {
  return {
    profile: docs.find((d) => d.kind === "profile" && d.id === M.PROFILE_ID) ?? null,
    entries: docs.filter((d) => d.kind === "entry"),
  };
}

function touch(doc, fields, now) {
  return { ...doc, ...fields, updatedAt: now.toISOString() };
}

/** An order above every entry in the section: new things go to the top, as on a CV. */
function topOrder(entries, section) {
  const orders = entries.filter((e) => e.section === section).map((e) => e.order);
  return orders.length ? Math.min(...orders) - 10 : 0;
}

function newEntry(fields, now) {
  return stamp(
    {
      kind: "entry",
      fields: {},
      approved: null,
      draft: null,
      sourceNotes: "",
      ...fields,
    },
    now,
  );
}

function checkRoom(entries, section) {
  if (entries.filter((e) => e.section === section).length >= M.MAX_SECTION_ENTRIES)
    throw new HttpError(
      409,
      `The ${section} section is full (${M.MAX_SECTION_ENTRIES} entries). Delete one first.`,
    );
}

/**
 * Each section's items in CV order, shown or not, then its orphans: the list
 * the CV tab shows and sends back to `reorder`. Sorting stays here, in one
 * place, so the tab can't drift from the CV.
 */
function sectionLists(entries, sources) {
  return Object.fromEntries(
    M.SECTIONS.map((section) => {
      const { items, orphans } = sectionItems(section, entries, sources);
      return [
        section,
        [
          ...items.map(({ id, show }) => ({ id, show, orphan: false })),
          ...orphans.map((entry) => ({ id: entry.id, show: entry.show !== false, orphan: true })),
        ],
      ];
    }),
  );
}

async function load({ repo, sites }) {
  const [{ docs, version }, sources] = await Promise.all([repo.read(), sites()]);
  const store = split(docs);
  const { warnings } = resolveCv(store, sources);
  return {
    profile: store.profile,
    entries: store.entries,
    sources,
    sections: sectionLists(store.entries, sources),
    warnings,
    version,
  };
}

async function saveProfile({ repo }, input, now) {
  const fields = M.parseProfile(input.profile);
  const { docs, version } = await readForWrite(repo, input);
  const existing = split(docs).profile;
  if (existing) {
    const profile = touch(existing, fields, now);
    await repo.write({ replace: [profile] }, version);
    return { profile };
  }
  const profile = stamp({ id: M.PROFILE_ID, kind: "profile", ...fields }, now);
  await repo.write({ create: [profile] }, version);
  return { profile };
}

/**
 * Creates or replaces one entry. A linked entry's id comes from its site
 * record; a CV-only entry gets a new id unless it is an edit. The AI draft is
 * kept as it was, and an unchanged approval keeps its approval time.
 */
async function saveEntry({ repo, sites }, input, now) {
  const parsed = M.parseEntry(input.entry);
  const givenId = input.entry.id === undefined ? undefined : M.entryId(input.entry.id);
  const { docs, version } = await readForWrite(repo, input);
  const { entries } = split(docs);

  let id;
  let existing;
  if (parsed.source) {
    id = M.entryIdFor(parsed.section, parsed.source.id);
    if (givenId !== undefined && givenId !== id)
      throw new HttpError(400, "That entry id doesn't match its site item.");
    existing = entries.find((e) => e.id === id);
    if (!existing) {
      const records = (await sites())[parsed.source.collection] ?? [];
      if (!records.some((r) => r.$id === parsed.source.id)) throw SITE_ITEM_GONE;
    }
  } else if (givenId !== undefined) {
    id = givenId;
    existing = entries.find((e) => e.id === id);
    if (!existing) throw ENTRY_GONE;
    if (existing.source)
      throw new HttpError(400, "A site item's entry can't become a CV-only entry.");
    if (existing.section !== parsed.section)
      throw new HttpError(400, "A CV-only entry can't move to another section.");
  } else {
    id = M.entryIdFor(parsed.section, `cv-${newId()}`);
  }

  const sameApproval =
    parsed.approved &&
    existing?.approved &&
    JSON.stringify([parsed.approved.roleLine, parsed.approved.bullets]) ===
      JSON.stringify([existing.approved.roleLine, existing.approved.bullets]);
  const approved = parsed.approved
    ? {
        ...parsed.approved,
        approvedAt: sameApproval ? existing.approved.approvedAt : now.toISOString(),
      }
    : null;
  const fields = {
    section: parsed.section,
    source: parsed.source,
    show: parsed.show,
    order: parsed.order ?? existing?.order ?? topOrder(entries, parsed.section),
    fields: parsed.fields,
    approved,
    sourceNotes: parsed.sourceNotes,
  };

  if (existing) {
    const entry = touch(existing, fields, now);
    await repo.write({ replace: [entry] }, version);
    return { entry };
  }
  checkRoom(entries, parsed.section);
  const entry = newEntry({ id, ...fields }, now);
  await repo.write({ create: [entry] }, version);
  return { entry };
}

/** Shows or hides one item. A site item with no entry yet gets one. */
async function setShown({ repo, sites }, input, now) {
  const id = M.entryId(input.id);
  if (typeof input.show !== "boolean") throw new HttpError(400, "Show must be true or false.");
  const { docs, version } = await readForWrite(repo, input);
  const { entries } = split(docs);

  const existing = entries.find((e) => e.id === id);
  if (existing) {
    const entry = touch(existing, { show: input.show }, now);
    await repo.write({ replace: [entry] }, version);
    return { entry };
  }
  const section = id.split(".")[1];
  const { items } = sectionItems(section, entries, await sites());
  const item = items.find((i) => i.id === id && !i.entry);
  if (!item) throw ENTRY_GONE;
  checkRoom(entries, section);
  const entry = newEntry(
    {
      id,
      section,
      source: { collection: M.SECTION_COLLECTION[section], id: item.record.$id },
      show: input.show,
      order: topOrder(entries, section),
    },
    now,
  );
  await repo.write({ create: [entry] }, version);
  return { entry };
}

/**
 * Puts a section in the given order. `ids` must be every item of the section
 * as load showed it: entries (orphans included) and site items with no entry
 * yet, which get one here, shown as they were.
 */
async function reorder({ repo, sites }, input, now) {
  const { section, ids } = M.parseReorder(input);
  const { docs, version } = await readForWrite(repo, input);
  const { entries } = split(docs);
  const { items, orphans } = sectionItems(section, entries, await sites());

  const byId = new Map([
    ...items.map((i) => [i.id, i]),
    ...orphans.map((entry) => [entry.id, { id: entry.id, entry, record: null }]),
  ]);
  if (ids.length !== byId.size || ids.some((id) => !byId.has(id)))
    throw new HttpError(
      409,
      "This section changed since it loaded, so it can't be reordered. Refresh and try again.",
    );

  const create = [];
  const replace = [];
  const ordered = ids.map((id, index) => {
    const { entry, record } = byId.get(id);
    const order = (index + 1) * 10;
    if (!entry) {
      const created = newEntry(
        {
          id,
          section,
          source: { collection: M.SECTION_COLLECTION[section], id: record.$id },
          show: shownByDefault(section, record),
          order,
        },
        now,
      );
      create.push(created);
      return created;
    }
    if (entry.order === order) return entry;
    const moved = touch(entry, { order }, now);
    replace.push(moved);
    return moved;
  });
  if (create.length || replace.length) await repo.write({ create, replace }, version);
  return { entries: ordered };
}

/**
 * Deletes a CV-only entry, or an entry whose site item is gone. An entry for
 * a live site item can only be hidden: without it the item would come back
 * on the CV by default.
 */
async function deleteEntry({ repo, sites }, input) {
  const id = M.entryId(input.id);
  const { docs, version } = await readForWrite(repo, input);
  const existing = split(docs).entries.find((e) => e.id === id);
  if (!existing) throw ENTRY_GONE;
  if (existing.source) {
    const records = (await sites())[existing.source.collection] ?? [];
    if (records.some((r) => r.$id === existing.source.id))
      throw new HttpError(
        409,
        "This entry comes from a site item. Hide it instead, or delete the item on the site.",
      );
  }
  await repo.write({ remove: [id] }, version);
  return { deleted: id };
}

// A 3-page CV with subset fonts is well under 200 KB. The cap keeps a runaway
// render from sending megabytes of base64 through the SWA proxy.
const MAX_PREVIEW_BYTES = 2 * 1024 * 1024;

const CV_LISTS = [
  "education",
  "awards",
  "experience",
  "projects",
  "certifications",
  "coCurricular",
  "skills",
];

function hasContent(cv) {
  return Boolean(cv.header.name.trim()) || CV_LISTS.some((list) => cv[list].length > 0);
}

/**
 * Builds the CV as it would publish now, without storing it: the store and
 * the site joined by resolveCv, drawn by `render`. Warnings are the join's
 * (waiting for approval, orphans) then the layout's (overflow, page count).
 */
async function preview({ repo, sites, render }, _input, now) {
  const [{ docs }, sources] = await Promise.all([repo.read(), sites()]);
  const { cv, warnings } = resolveCv(split(docs), sources);
  if (!hasContent(cv))
    throw new HttpError(422, "There is nothing to put on the CV yet. Add your profile first.");
  const { pdf, pages, warnings: layoutWarnings } = await render(cv, { creationDate: now });
  if (pdf.length > MAX_PREVIEW_BYTES)
    throw new HttpError(500, "The preview came out too large to show. Try again later.");
  return {
    pdfBase64: pdf.toString("base64"),
    pages,
    warnings: [
      ...warnings,
      ...layoutWarnings.map(({ code, message }) => ({ code, entryId: null, message })),
    ],
  };
}

module.exports = { load, saveProfile, saveEntry, setShown, reorder, deleteEntry, preview };
