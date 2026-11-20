// @vitest-environment node
// Made-up people and organisations only (see shared/cv/fixture.js).
import { describe, it, expect, vi } from "vitest";

const { createHandler } = await import("./index.js");
const { createFakeCvRepo } = await import("../shared/cv/repo.js");

const NOW = new Date("2026-11-05T09:00:00.000Z");
const LATER = new Date("2026-11-06T09:00:00.000Z");

const JOB = {
  $id: "j1",
  $createdAt: "2025-11-01T00:00:00.000Z",
  role: "Software Engineer",
  company: "Brightpath Software",
  period: "November 2025 – Present",
  achievements: ["Building features for a scheduling web app."],
  order: 1,
};
const PROJECT = { $id: "p1", $createdAt: "2025-11-01T00:00:00.000Z", title: "Clinic Scheduler" };

const PROFILE = {
  header: {
    name: "Ama Mensah",
    title: "Software Engineer",
    lines: ["Kumasi, Ghana", "ama.mensah@example.com"],
    links: [{ label: "Portfolio Website", url: "https://ama-mensah.example.com/" }],
  },
  skills: [{ id: "s1", label: "Languages", items: "JavaScript, TypeScript" }],
};

function setup({ admin = true, docs = [], site = {} } = {}) {
  const repo = createFakeCvRepo(docs);
  const records = {
    education: [],
    journey: [JOB],
    projects: [PROJECT],
    certifications: [],
    ...site,
  };
  const sites = vi.fn(async () => structuredClone(records));
  let now = NOW;
  const handler = createHandler({
    requireAdmin: async () =>
      admin ? { user: { email: "owner@example.com" } } : { status: 401, error: "Sign in" },
    repo: () => repo,
    sites,
    now: () => now,
  });
  // Like a client that has just loaded: a write without its own `version`
  // carries the current one. Tests about stale screens pass theirs.
  const call = async (body) => {
    if (body.action !== "load" && !("version" in body))
      body = { ...body, version: (await repo.read()).version };
    const context = { log: { error: vi.fn(), warn: vi.fn() } };
    await handler(context, { method: "POST", body, headers: {} });
    return { status: context.res.status, body: JSON.parse(context.res.body), context };
  };
  return { repo, sites, records, call, later: () => (now = LATER) };
}

describe("staticwebapp.config.json", () => {
  // SWA matches a route exactly unless it ends in a wildcard.
  it("keeps every /api/cv path behind the admin role", async () => {
    const { readFile } = await import("node:fs/promises");
    const config = JSON.parse(
      await readFile(new URL("../../public/staticwebapp.config.json", import.meta.url), "utf8"),
    );
    const adminOnly = (path) =>
      config.routes.some(
        (r) =>
          r.allowedRoles?.includes("admin") &&
          (r.route.endsWith("*") ? path.startsWith(r.route.slice(0, -1)) : path === r.route),
      );
    for (const path of ["/api/cv", "/api/cv/", "/api/cv/load"]) expect(adminOnly(path)).toBe(true);
  });
});

describe("/api/cv auth and dispatch", () => {
  it("refuses callers who aren't the admin and reads nothing", async () => {
    const { call, repo, sites } = setup({ admin: false });
    const spy = vi.spyOn(repo, "read");
    for (const action of ["load", "saveProfile", "deleteEntry"]) {
      const res = await call({ action, version: null });
      expect(res.status).toBe(401);
    }
    expect(spy).not.toHaveBeenCalled();
    expect(sites).not.toHaveBeenCalled();
  });

  it("rejects unknown actions, including inherited object keys", async () => {
    const { call } = setup();
    expect((await call({ action: "toString" })).status).toBe(400);
    expect((await call({ action: "publish" })).status).toBe(400);
    expect((await call({ action: "draft" })).status).toBe(400);
  });

  it("answers 500 without details when the store fails", async () => {
    const { call, repo } = setup();
    vi.spyOn(repo, "read").mockRejectedValueOnce(new Error("Cosmos down: secret detail"));
    const res = await call({ action: "load" });
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("secret");
  });
});

describe("load", () => {
  it("returns an empty store, the site records, the version and the warnings", async () => {
    const { call } = setup();
    const res = await call({ action: "load" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      profile: null,
      entries: [],
      sources: { education: [], journey: [JOB], projects: [PROJECT], certifications: [] },
      warnings: [
        expect.objectContaining({ code: "no-profile" }),
        expect.objectContaining({ code: "waiting-for-approval", entryId: "entry.projects.p1" }),
      ],
      version: null,
    });
  });
});

describe("saveProfile", () => {
  it("creates the profile in the 'me' partition, then replaces it", async () => {
    const { call, later } = setup();
    const first = await call({ action: "saveProfile", profile: PROFILE });
    expect(first.status).toBe(200);
    expect(first.body.profile).toMatchObject({
      id: "profile",
      scope: "me",
      kind: "profile",
      references: { mode: "on-request", text: "Available upon request" },
      createdAt: NOW.toISOString(),
    });
    later();
    const second = await call({
      action: "saveProfile",
      profile: { ...PROFILE, header: { ...PROFILE.header, title: "Frontend Engineer" } },
    });
    expect(second.body.profile).toMatchObject({
      header: { title: "Frontend Engineer" },
      createdAt: NOW.toISOString(),
      updatedAt: LATER.toISOString(),
    });
    const loaded = await call({ action: "load" });
    expect(loaded.body.profile.header.title).toBe("Frontend Engineer");
    expect(loaded.body.warnings.map((w) => w.code)).not.toContain("no-profile");
  });

  it("rejects invalid input and writes nothing", async () => {
    const { call, repo } = setup();
    const bad = {
      ...PROFILE,
      header: { ...PROFILE.header, links: [{ label: "X", url: "javascript:alert(1)" }] },
    };
    const res = await call({ action: "saveProfile", profile: bad });
    expect(res.status).toBe(400);
    expect((await call({ action: "saveProfile" })).status).toBe(400);
    expect(repo.docs.size).toBe(0);
  });
});

describe("stale screens", () => {
  it("refuses a write from a screen loaded before another write, and writes nothing", async () => {
    const { call, repo } = setup();
    await call({ action: "saveProfile", profile: PROFILE });
    const stale = (await call({ action: "load" })).body.version;
    expect(typeof stale).toBe("string");
    expect(
      (await call({ action: "saveProfile", profile: { ...PROFILE, skills: [] }, version: stale }))
        .status,
    ).toBe(200);
    const before = structuredClone([...repo.docs.values()]);
    const res = await call({
      action: "setShown",
      id: "entry.experience.j1",
      show: false,
      version: stale,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Something changed since this loaded. Refresh to see the latest.");
    expect([...repo.docs.values()]).toEqual(before);
  });

  it("refuses the first write when the screen loaded an empty store that is no longer empty", async () => {
    const { call } = setup();
    await call({ action: "saveProfile", profile: PROFILE });
    const res = await call({ action: "saveProfile", profile: PROFILE, version: null });
    expect(res.status).toBe(409);
  });

  it("refuses a write whose version is not valid", async () => {
    const { call, repo } = setup();
    const res = await call({ action: "saveProfile", profile: PROFILE, version: 7 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("The CV version is missing. Refresh and try again.");
    expect(repo.docs.size).toBe(0);
  });
});

describe("saveEntry", () => {
  it("creates a linked entry with an id from its site item, shown by default", async () => {
    const { call } = setup();
    const res = await call({
      action: "saveEntry",
      entry: { source: { collection: "journey", id: "j1" }, fields: { location: "Remote" } },
    });
    expect(res.status).toBe(200);
    expect(res.body.entry).toMatchObject({
      id: "entry.experience.j1",
      scope: "me",
      kind: "entry",
      section: "experience",
      source: { collection: "journey", id: "j1" },
      show: true,
      order: 0,
      fields: { location: "Remote" },
      approved: null,
      draft: null,
    });
  });

  it("refuses a link to a site item that doesn't exist", async () => {
    const { call, repo } = setup();
    const res = await call({
      action: "saveEntry",
      entry: { source: { collection: "journey", id: "nope" } },
    });
    expect(res.status).toBe(404);
    expect(repo.docs.size).toBe(0);
  });

  it("refuses an id that doesn't match the linked site item", async () => {
    const { call } = setup();
    const res = await call({
      action: "saveEntry",
      entry: { id: "entry.experience.other", source: { collection: "journey", id: "j1" } },
    });
    expect(res.status).toBe(400);
  });

  it("creates CV-only entries at the top of their section and edits them in place", async () => {
    const { call } = setup();
    const a = (
      await call({
        action: "saveEntry",
        entry: { section: "projects", fields: { title: "Ops Suite" } },
      })
    ).body.entry;
    expect(a.id).toMatch(/^entry\.projects\.cv-[0-9a-f]{20}$/);
    expect(a.source).toBeNull();
    const b = (
      await call({
        action: "saveEntry",
        entry: { section: "projects", fields: { title: "Second" } },
      })
    ).body.entry;
    expect(b.order).toBeLessThan(a.order);

    const edited = await call({
      action: "saveEntry",
      entry: { id: a.id, section: "projects", fields: { title: "Ops Suite v2" }, order: a.order },
    });
    expect(edited.status).toBe(200);
    expect(edited.body.entry).toMatchObject({ id: a.id, fields: { title: "Ops Suite v2" } });
    expect(edited.body.entry.createdAt).toBe(a.createdAt);
  });

  it("refuses to edit a CV-only entry that is gone, or move it to another section", async () => {
    const { call } = setup();
    const gone = await call({
      action: "saveEntry",
      entry: { id: "entry.projects.cv-0000", section: "projects", fields: { title: "X" } },
    });
    expect(gone.status).toBe(404);
    const a = (
      await call({ action: "saveEntry", entry: { section: "projects", fields: { title: "Ops" } } })
    ).body.entry;
    const moved = await call({
      action: "saveEntry",
      entry: { id: a.id, section: "certifications", fields: { title: "Ops" } },
    });
    expect(moved.status).toBe(400);
  });

  it("stamps approved text when it changes, keeps the stamp when it doesn't, and keeps the draft", async () => {
    const draft = { roleLine: "Draft", bullets: ["Draft bullet."] };
    const { call, later, repo } = setup({
      docs: [
        {
          id: "entry.projects.p1",
          scope: "me",
          kind: "entry",
          section: "projects",
          source: { collection: "projects", id: "p1" },
          show: true,
          order: 10,
          fields: {},
          approved: null,
          draft,
          sourceNotes: "",
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
    });
    const approved = {
      roleLine: "Brightpath | Web | Engineer",
      bullets: ["Built the booking flow."],
    };
    const source = { collection: "projects", id: "p1" };
    const first = await call({ action: "saveEntry", entry: { source, approved, draft: null } });
    expect(first.body.entry.approved).toEqual({ ...approved, approvedAt: NOW.toISOString() });
    expect(first.body.entry.draft).toEqual(draft);
    expect(first.body.entry.order).toBe(10);

    later();
    const same = await call({ action: "saveEntry", entry: { source, approved, show: false } });
    expect(same.body.entry.approved.approvedAt).toBe(NOW.toISOString());
    const changed = await call({
      action: "saveEntry",
      entry: { source, approved: { ...approved, bullets: ["Built and shipped it."] } },
    });
    expect(changed.body.entry.approved.approvedAt).toBe(LATER.toISOString());
    expect(repo.docs.get("entry.projects.p1").draft).toEqual(draft);

    const loaded = await call({ action: "load" });
    expect(loaded.body.warnings.map((w) => w.code)).not.toContain("waiting-for-approval");
  });

  it("refuses a new entry when the section is full", async () => {
    const docs = Array.from({ length: 90 }, (_, i) => ({
      id: `entry.certifications.cv-${i}`,
      scope: "me",
      kind: "entry",
      section: "certifications",
      source: null,
      show: true,
      order: i,
      fields: { title: `Cert ${i}` },
    }));
    const { call } = setup({ docs });
    const res = await call({
      action: "saveEntry",
      entry: { section: "certifications", fields: { title: "One more" } },
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toContain("full");
  });
});

describe("setShown", () => {
  it("creates a hidden entry for a site item that had none", async () => {
    const { call } = setup();
    const res = await call({ action: "setShown", id: "entry.experience.j1", show: false });
    expect(res.status).toBe(200);
    expect(res.body.entry).toMatchObject({
      id: "entry.experience.j1",
      section: "experience",
      source: { collection: "journey", id: "j1" },
      show: false,
    });
    const loaded = await call({ action: "load" });
    expect(loaded.body.entries).toHaveLength(1);
  });

  it("flips an existing entry and nothing else", async () => {
    const { call } = setup();
    const created = (
      await call({
        action: "saveEntry",
        entry: { source: { collection: "journey", id: "j1" }, fields: { location: "Remote" } },
      })
    ).body.entry;
    const res = await call({ action: "setShown", id: created.id, show: false });
    expect(res.body.entry).toEqual({ ...created, show: false });
  });

  it("answers 404 for an item that doesn't exist and 400 for a show that isn't a boolean", async () => {
    const { call } = setup();
    expect(
      (await call({ action: "setShown", id: "entry.experience.nope", show: true })).status,
    ).toBe(404);
    expect((await call({ action: "setShown", id: "entry.experience.j1", show: "no" })).status).toBe(
      400,
    );
    expect((await call({ action: "setShown", id: "profile", show: true })).status).toBe(400);
  });
});

describe("reorder", () => {
  it("orders the whole section, creating entries for site items that had none", async () => {
    const jobs = [JOB, { ...JOB, $id: "j2", company: "Riverbank Media" }];
    const { call } = setup({ site: { journey: jobs } });
    const cvOnly = (
      await call({ action: "saveEntry", entry: { section: "experience", fields: { org: "Club" } } })
    ).body.entry;
    const ids = [cvOnly.id, "entry.experience.j2", "entry.experience.j1"];
    const res = await call({ action: "reorder", section: "experience", ids });
    expect(res.status).toBe(200);
    expect(res.body.entries.map((e) => [e.id, e.order, e.show])).toEqual([
      [cvOnly.id, 10, true],
      ["entry.experience.j2", 20, true],
      ["entry.experience.j1", 30, true],
    ]);
    const loaded = await call({ action: "load" });
    expect(loaded.body.entries).toHaveLength(3);
  });

  it("keeps an education row hidden on the site hidden when it gets an entry", async () => {
    const { call } = setup({
      site: { education: [{ $id: "e1", institution: "Night School", isVisible: false }] },
    });
    const res = await call({
      action: "reorder",
      section: "education",
      ids: ["entry.education.e1"],
    });
    expect(res.body.entries[0].show).toBe(false);
  });

  it("refuses an order that leaves out or adds an item, and writes nothing", async () => {
    const jobs = [JOB, { ...JOB, $id: "j2" }];
    const { call, repo } = setup({ site: { journey: jobs } });
    const missing = await call({
      action: "reorder",
      section: "experience",
      ids: ["entry.experience.j1"],
    });
    expect(missing.status).toBe(409);
    const extra = await call({
      action: "reorder",
      section: "experience",
      ids: ["entry.experience.j1", "entry.experience.j2", "entry.experience.j3"],
    });
    expect(extra.status).toBe(409);
    expect(repo.docs.size).toBe(0);
  });
});

describe("deleteEntry", () => {
  it("deletes a CV-only entry", async () => {
    const { call, repo } = setup();
    const { entry } = (
      await call({ action: "saveEntry", entry: { section: "projects", fields: { title: "Ops" } } })
    ).body;
    const res = await call({ action: "deleteEntry", id: entry.id });
    expect(res.body).toEqual({ deleted: entry.id });
    expect(repo.docs.has(entry.id)).toBe(false);
  });

  it("won't delete the entry of a live site item, which would put it back on the CV", async () => {
    const { call, repo } = setup();
    await call({ action: "setShown", id: "entry.experience.j1", show: false });
    const res = await call({ action: "deleteEntry", id: "entry.experience.j1" });
    expect(res.status).toBe(409);
    expect(res.body.error).toContain("Hide it instead");
    expect(repo.docs.has("entry.experience.j1")).toBe(true);
  });

  it("deletes an entry whose site item is gone", async () => {
    const { call, records, repo } = setup();
    await call({ action: "setShown", id: "entry.experience.j1", show: false });
    records.journey = [];
    const loaded = await call({ action: "load" });
    expect(loaded.body.warnings.map((w) => w.code)).toContain("orphan");
    const res = await call({ action: "deleteEntry", id: "entry.experience.j1" });
    expect(res.status).toBe(200);
    expect(repo.docs.has("entry.experience.j1")).toBe(false);
  });

  it("answers 404 for an entry that doesn't exist", async () => {
    const { call } = setup();
    expect((await call({ action: "deleteEntry", id: "entry.projects.cv-0" })).status).toBe(404);
  });
});
