// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { createFakeCosmos } = require("../shared/fakeCosmos.js");
const { visitorCookie, VISITOR_COOKIE } = require("../shared/counters.js");
const { createHandler } = require("./index.js");

const SECRET = "test-signing-secret";
const PARTITIONS = { blog_views: "/postId", blog_reactions: "/postId" };

let db;
let handler;
let nextIp = 1;
const freshIp = () => `203.0.113.${nextIp++ % 250}`;
const cookieFor = (visitorId) => visitorCookie(visitorId, SECRET).split(";")[0];

async function call(method, action, { body, query, cookie, ip = freshIp() } = {}) {
  const context = {
    bindingData: { action },
    res: null,
    log: Object.assign(vi.fn(), { error: vi.fn(), warn: vi.fn() }),
  };
  const headers = { "x-forwarded-for": ip, ...(cookie && { cookie }) };
  await handler(context, { method, headers, body, query });
  return {
    status: context.res.status,
    body: JSON.parse(context.res.body),
    setCookie: context.res.headers["Set-Cookie"],
  };
}

beforeEach(() => {
  db = createFakeCosmos(PARTITIONS);
  db.container("blog_posts").seed({ id: "p1", title: "Hello" });
  db.container("blog_posts").seed({ id: "draft", published: false });
  handler = createHandler({ db: () => db, env: { RECEIPT_SIGNING_SECRET: SECRET } });
});

describe("visitor ids", () => {
  it("issues a signed HttpOnly cookie that blog-view and reaction accept", async () => {
    const issued = await call("POST", "visitor", { body: {} });
    expect(issued.status).toBe(200);
    expect(issued.body).toEqual({ ok: true });
    expect(issued.setCookie).toMatch(
      new RegExp(`^${VISITOR_COOKIE}=visitor_[a-z0-9]+\\.[\\w-]{32}; .*HttpOnly; Secure`),
    );
    const cookie = issued.setCookie.split(";")[0];

    const view = await call("POST", "blog-view", { body: { postId: "p1" }, cookie });
    expect(view).toMatchObject({ status: 200, body: { readers: 1, reads: 1 } });
    const liked = await call("POST", "reaction", {
      body: { postId: "p1", reaction: "like" },
      cookie,
    });
    expect(liked).toMatchObject({ status: 200, body: { likes: 1, dislikes: 0, mine: "like" } });
  });

  it("refuses an unsigned or forged visitor id", async () => {
    const unsigned = await call("POST", "reaction", {
      body: { postId: "p1", visitorId: "visitor_made1up2", reaction: "dislike" },
    });
    expect(unsigned.status).toBe(401);
    const forged = await call("POST", "blog-view", {
      body: { postId: "p1" },
      cookie: `${VISITOR_COOKIE}=visitor_made1up2.${"A".repeat(32)}`,
    });
    expect(forged.status).toBe(401);
    const otherSecret = createHandler({ db: () => db, env: { RECEIPT_SIGNING_SECRET: "other" } });
    handler = otherSecret;
    expect(
      (
        await call("POST", "blog-view", {
          body: { postId: "p1" },
          cookie: cookieFor("visitor_abc123"),
        })
      ).status,
    ).toBe(401);
    expect(db.container("blog_views").docs.size).toBe(0);
    expect(db.container("blog_reactions").docs.size).toBe(0);
  });

  it("signs a browser's old localStorage id so its reaction carries over", async () => {
    db.container("blog_reactions").seed({
      id: "r1",
      postId: "p1",
      visitorId: "visitor_legacy123",
      reaction: "like",
    });
    const issued = await call("POST", "visitor", { body: { visitorId: "visitor_legacy123" } });
    expect(issued.setCookie.startsWith(`${cookieFor("visitor_legacy123")};`)).toBe(true);

    const mine = await call("GET", "reactions", {
      query: { postId: "p1" },
      cookie: cookieFor("visitor_legacy123"),
    });
    expect(mine.body).toEqual({ likes: 1, dislikes: 0, mine: "like" });
    // A visitorId in the query no longer reads someone else's reaction.
    const guessed = await call("GET", "reactions", {
      query: { postId: "p1", visitorId: "visitor_legacy123" },
    });
    expect(guessed.body.mine).toBeNull();
  });

  it("keeps a valid cookie instead of minting a new visitor", async () => {
    const again = await call("POST", "visitor", { body: {}, cookie: cookieFor("visitor_abc123") });
    expect(again.status).toBe(200);
    expect(again.setCookie).toBeUndefined();
  });

  it("caps new visitor ids per IP", async () => {
    const ip = "198.51.100.7";
    for (let i = 0; i < 10; i += 1) {
      expect((await call("POST", "visitor", { body: {}, ip })).status).toBe(200);
    }
    expect((await call("POST", "visitor", { body: {}, ip })).status).toBe(429);
    expect((await call("POST", "visitor", { body: {} })).status).toBe(200);
  });

  it("answers 503 when the signing secret is missing", async () => {
    handler = createHandler({ db: () => db, env: {} });
    expect((await call("POST", "visitor", { body: {} })).status).toBe(503);
    expect(
      (
        await call("POST", "blog-view", {
          body: { postId: "p1" },
          cookie: cookieFor("visitor_abc123"),
        })
      ).status,
    ).toBe(503);
  });
});

describe("per-IP write limit", () => {
  it("answers 429 once one IP sends more POSTs than the limit allows", async () => {
    const ip = "198.51.100.9";
    for (let i = 0; i < 30; i += 1) {
      expect((await call("POST", "site-view", { ip })).status).toBe(200);
    }
    expect((await call("POST", "site-view", { ip })).status).toBe(429);
    const cookie = cookieFor("visitor_abc123");
    expect((await call("POST", "blog-view", { body: { postId: "p1" }, cookie, ip })).status).toBe(
      429,
    );
    expect((await call("POST", "site-view")).status).toBe(200);
  });
});

describe("blog view totals", () => {
  it("counts readers and reads in one total row per post", async () => {
    const a = cookieFor("visitor_aaaaaa1");
    const b = cookieFor("visitor_bbbbbb2");
    await call("POST", "blog-view", { body: { postId: "p1" }, cookie: a });
    await call("POST", "blog-view", { body: { postId: "p1" }, cookie: a });
    const last = await call("POST", "blog-view", { body: { postId: "p1" }, cookie: b });
    expect(last.body).toEqual({ readers: 2, reads: 3 });

    const views = db.container("blog_views");
    expect(views.docs.get("p1/total")).toMatchObject({ postId: "p1", readers: 2, reads: 3 });
    expect((await call("GET", "blog-views", { query: { postId: "p1" } })).body).toEqual({
      readers: 2,
      reads: 3,
    });

    views.queries.length = 0;
    expect((await call("GET", "blog-views")).body).toEqual({ p1: { readers: 2, reads: 3 } });
    // Only total rows are read across partitions, never the visitor rows.
    expect(views.queries.map((q) => q.query)).toEqual([
      "SELECT c.postId, c.readers, c.reads FROM c WHERE c.kind = @kind",
    ]);
  });

  it("keeps a separate total for each post", async () => {
    db.container("blog_posts").seed({ id: "p2", title: "Second" });
    const a = cookieFor("visitor_aaaaaa1");
    await call("POST", "blog-view", { body: { postId: "p1" }, cookie: a });
    await call("POST", "blog-view", { body: { postId: "p2" }, cookie: a });
    await call("POST", "blog-view", { body: { postId: "p2" }, cookie: a });
    expect((await call("GET", "blog-views")).body).toEqual({
      p1: { readers: 1, reads: 1 },
      p2: { readers: 1, reads: 2 },
    });
  });

  it("builds a missing total from rows written before totals existed", async () => {
    const views = db.container("blog_views");
    views.seed({ id: "v1", postId: "p1", visitorId: "visitor_old0001", reads: 4 });
    views.seed({ id: "v2", postId: "p1", visitorId: "visitor_old0002" });

    expect((await call("GET", "blog-views", { query: { postId: "p1" } })).body).toEqual({
      readers: 2,
      reads: 5,
    });
    expect(views.docs.has("p1/total")).toBe(false);

    expect((await call("GET", "blog-views")).body).toEqual({ p1: { readers: 2, reads: 5 } });
    expect(views.docs.get("p1/total")).toMatchObject({ readers: 2, reads: 5 });

    const next = await call("POST", "blog-view", {
      body: { postId: "p1" },
      cookie: cookieFor("visitor_old0001"),
    });
    expect(next.body).toEqual({ readers: 2, reads: 6 });
  });

  it("refuses views of unknown or unpublished posts", async () => {
    const cookie = cookieFor("visitor_abc123");
    expect((await call("POST", "blog-view", { body: { postId: "nope" }, cookie })).status).toBe(
      404,
    );
    expect((await call("POST", "blog-view", { body: { postId: "draft" }, cookie })).status).toBe(
      404,
    );
    expect(db.container("blog_views").docs.size).toBe(0);
  });
});
