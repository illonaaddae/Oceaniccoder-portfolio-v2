// Visitor counters: site views, blog reads and blog reactions.
//
//   POST /api/counters/visitor     { visitorId? }        → { ok } + visitor cookie
//   POST /api/counters/site-view                         → { count }
//   GET  /api/counters/site-views                        → { count }
//   POST /api/counters/blog-view   { postId }            → { readers, reads }
//   GET  /api/counters/blog-views?postId=                → { readers, reads }
//   GET  /api/counters/blog-views                        → { [postId]: { readers, reads } }
//   GET  /api/counters/reactions?postId=                 → { likes, dislikes, mine }
//   POST /api/counters/reaction    { postId, reaction }  → same
//
// Who the visitor is comes only from the HttpOnly cookie that POST visitor
// sets, signed with RECEIPT_SIGNING_SECRET (purpose "visitor"). blog-view and
// reaction answer 401 without it, so a caller can't invent visitor ids; new
// ids are capped per IP and per instance. POST visitor signs a browser's old
// localStorage id when it sends one, so returning readers keep their reaction.
// Every POST is also capped per client IP (clientIp, as in /api/visit).
//
// Increments are Cosmos patch operations, so concurrent visitors can't
// overwrite each other's counts. Only totals come back; visitor ids are never
// listed. Blog rows are one per (post, visitor), enforced by the container's
// unique key, so a race on the first visit ends in a 409 that's retried as an
// increment.
//
// Each post's readers and reads are also kept in one `total` row in its
// blog_views partition, so reading them never scans the visitor rows. A post
// without one (rows from before it existed) gets it built from its rows once,
// before the next view is written; see ensureTotal.

const { getDatabase, newDocument } = require("../shared/cosmos");
const { clientIp } = require("../shared/turnstile");
const { createRateLimiter } = require("../shared/rateLimit");
const {
  Invalid,
  checkPostId,
  checkVisitorId,
  checkReaction,
  newVisitorId,
  visitorCookie,
  readVisitor,
  aggregateViews,
  countReactions,
  reactionChange,
} = require("../shared/counters");

const HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const HOUR_MS = 60 * 60 * 1000;
const WRITES_PER_IP = 30; // a minute
const NEW_VISITORS_PER_IP = 10; // an hour
const NEW_VISITORS_PER_INSTANCE = 600; // an hour
const TOTAL_ID = "total";
const TOTAL_KIND = "total";

function reply(context, status, body, headers = {}) {
  context.res = { status, headers: { ...HEADERS, ...headers }, body: JSON.stringify(body) };
}

async function query(container, text, parameters = [], options = {}) {
  const { resources } = await container.items
    .query({ query: text, parameters }, options)
    .fetchAll();
  return resources;
}

async function postExists(db, postId) {
  const { resource } = await db.container("blog_posts").item(postId, postId).read();
  return Boolean(resource) && resource.published !== false;
}

// ── site views ────────────────────────────────────────────────────────────

async function siteViewRow(db) {
  const [row] = await query(db.container("site_views"), "SELECT TOP 1 * FROM c");
  return row;
}

async function recordSiteView(db) {
  const container = db.container("site_views");
  const row = await siteViewRow(db);
  const now = new Date().toISOString();
  if (!row) {
    const { resource } = await container.items.create(newDocument({ count: 1, lastUpdated: now }));
    return resource.count;
  }
  const { resource } = await container.item(row.id, row.id).patch([
    { op: "incr", path: "/count", value: 1 },
    { op: "set", path: "/lastUpdated", value: now },
  ]);
  return resource.count;
}

// ── blog views ────────────────────────────────────────────────────────────

const statsOf = (total) => ({ readers: total.readers || 0, reads: total.reads || 0 });

/** Readers and reads summed from a post's visitor rows (the total row left out). */
async function countViewRows(db, postId) {
  const rows = await query(
    db.container("blog_views"),
    "SELECT c.postId, c.reads FROM c WHERE (NOT IS_DEFINED(c.kind) OR IS_NULL(c.kind))",
    [],
    { partitionKey: postId },
  );
  return aggregateViews(rows)[postId] || { readers: 0, reads: 0 };
}

async function readTotal(db, postId) {
  const { resource } = await db.container("blog_views").item(TOTAL_ID, postId).read();
  return resource;
}

/**
 * Makes sure the post has its total row, building it from the visitor rows
 * when missing. Called before a view is written, so the count can't include
 * that view and then be incremented for it too. A 409 means a concurrent
 * request built it first.
 */
async function ensureTotal(db, postId) {
  if (await readTotal(db, postId)) return;
  const counts = await countViewRows(db, postId);
  try {
    await db.container("blog_views").items.create({
      id: TOTAL_ID,
      postId,
      visitorId: TOTAL_ID,
      kind: TOTAL_KIND,
      ...counts,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err.code !== 409) throw err;
  }
}

async function postViewStats(db, postId) {
  const total = await readTotal(db, postId);
  // No total yet: count without storing one, so a GET for any id can't add rows.
  return total ? statsOf(total) : countViewRows(db, postId);
}

/** Stats for every published post, building any missing total once. */
async function allViewStats(db) {
  const totals = await query(
    db.container("blog_views"),
    "SELECT c.postId, c.readers, c.reads FROM c WHERE c.kind = @kind",
    [{ name: "@kind", value: TOTAL_KIND }],
  );
  const stats = {};
  for (const total of totals) stats[total.postId] = statsOf(total);
  const posts = await query(db.container("blog_posts"), "SELECT c.id, c.published FROM c");
  for (const { id, published } of posts) {
    if (stats[id] || published === false) continue;
    await ensureTotal(db, id);
    const total = await readTotal(db, id);
    if (total) stats[id] = statsOf(total);
  }
  return Object.fromEntries(Object.entries(stats).filter(([, s]) => s.readers > 0));
}

async function recordBlogView(db, postId, visitorId) {
  const container = db.container("blog_views");
  const now = new Date().toISOString();
  const increment = async (row) =>
    container.item(row.id, postId).patch([
      { op: "incr", path: "/reads", value: 1 },
      { op: "set", path: "/lastReadAt", value: now },
    ]);
  const find = async () =>
    (
      await query(
        container,
        "SELECT c.id FROM c WHERE c.visitorId = @v",
        [{ name: "@v", value: visitorId }],
        { partitionKey: postId },
      )
    )[0];

  await ensureTotal(db, postId);
  let newReader = false;
  const existing = await find();
  if (existing) {
    await increment(existing);
  } else {
    try {
      await container.items.create(newDocument({ postId, visitorId, reads: 1, lastReadAt: now }));
      newReader = true;
    } catch (err) {
      if (err.code !== 409) throw err;
      await increment(await find()); // another tab created it first
    }
  }
  const { resource } = await container.item(TOTAL_ID, postId).patch([
    { op: "incr", path: "/reads", value: 1 },
    { op: "incr", path: "/readers", value: newReader ? 1 : 0 },
    { op: "set", path: "/updatedAt", value: now },
  ]);
  return statsOf(resource);
}

// ── reactions ─────────────────────────────────────────────────────────────

async function reactionState(db, postId, visitorId) {
  const rows = await query(
    db.container("blog_reactions"),
    "SELECT c.visitorId, c.reaction FROM c",
    [],
    { partitionKey: postId },
  );
  const mine = visitorId && rows.find((r) => r.visitorId === visitorId);
  return { ...countReactions(rows), mine: mine ? mine.reaction : null };
}

async function react(db, postId, visitorId, reaction) {
  const container = db.container("blog_reactions");
  const [row] = await query(
    container,
    "SELECT c.id, c.reaction FROM c WHERE c.visitorId = @v",
    [{ name: "@v", value: visitorId }],
    { partitionKey: postId },
  );
  const change = reactionChange(row && row.reaction, reaction);
  if (change === "delete") {
    await container.item(row.id, postId).delete();
  } else if (change === "replace") {
    await container.item(row.id, postId).patch([{ op: "set", path: "/reaction", value: reaction }]);
  } else {
    try {
      await container.items.create(newDocument({ postId, visitorId, reaction }));
    } catch (err) {
      if (err.code !== 409) throw err; // a double click already created it
    }
  }
  return reactionState(db, postId, visitorId);
}

// ── routing ───────────────────────────────────────────────────────────────

/**
 * deps.db returns the Cosmos database; env and now replace process.env and
 * the clock in tests.
 */
function createHandler(deps) {
  const env = deps.env || process.env;
  const now = deps.now || (() => Date.now());
  const allowWrite = createRateLimiter({ limit: WRITES_PER_IP });
  const allowNewVisitor = createRateLimiter({ limit: NEW_VISITORS_PER_IP, windowMs: HOUR_MS });
  const allowNewVisitorHere = createRateLimiter({
    limit: NEW_VISITORS_PER_INSTANCE,
    windowMs: HOUR_MS,
    maxKeys: 1,
  });

  return async function (context, req) {
    const action = context.bindingData && context.bindingData.action;
    const route = `${req.method} ${action}`;
    const body = req.body || {};
    const params = req.query || {};
    const secret = env.RECEIPT_SIGNING_SECRET;
    const ip = clientIp(req) || "unknown";
    const tooMany = () =>
      reply(context, 429, { error: "Too many requests. Try again in a few minutes." });
    const unavailable = () => reply(context, 503, { error: "Counters are unavailable" });

    try {
      if (req.method === "POST" && !allowWrite(ip, 1, now())) return tooMany();

      // The signed visitor for blog-view and reaction; null after replying.
      const requireVisitor = () => {
        if (!secret) {
          unavailable();
          return null;
        }
        const visitorId = readVisitor(req, secret);
        if (!visitorId) reply(context, 401, { error: "Unknown visitor" });
        return visitorId;
      };

      switch (route) {
        case "POST visitor": {
          if (!secret) return unavailable();
          if (readVisitor(req, secret)) return reply(context, 200, { ok: true });
          const at = now();
          if (!allowNewVisitor(ip, 1, at) || !allowNewVisitorHere("all", 1, at)) return tooMany();
          let visitorId = newVisitorId();
          try {
            if (body.visitorId !== undefined) visitorId = checkVisitorId(body.visitorId);
          } catch {
            // An old id in an unknown shape: hand out a new one instead.
          }
          return reply(
            context,
            200,
            { ok: true },
            { "Set-Cookie": visitorCookie(visitorId, secret) },
          );
        }
        case "POST site-view":
          return reply(context, 200, { count: await recordSiteView(deps.db()) });
        case "GET site-views": {
          const row = await siteViewRow(deps.db());
          return reply(context, 200, { count: (row && row.count) || 0 });
        }
        case "POST blog-view": {
          const postId = checkPostId(body.postId);
          const visitorId = requireVisitor();
          if (!visitorId) return;
          const db = deps.db();
          if (!(await postExists(db, postId)))
            return reply(context, 404, { error: "Post not found" });
          return reply(context, 200, await recordBlogView(db, postId, visitorId));
        }
        case "GET blog-views": {
          const db = deps.db();
          return reply(
            context,
            200,
            params.postId
              ? await postViewStats(db, checkPostId(params.postId))
              : await allViewStats(db),
          );
        }
        case "GET reactions":
          return reply(
            context,
            200,
            await reactionState(
              deps.db(),
              checkPostId(params.postId),
              secret ? readVisitor(req, secret) : null,
            ),
          );
        case "POST reaction": {
          const postId = checkPostId(body.postId);
          const reaction = checkReaction(body.reaction);
          const visitorId = requireVisitor();
          if (!visitorId) return;
          const db = deps.db();
          if (!(await postExists(db, postId)))
            return reply(context, 404, { error: "Post not found" });
          return reply(context, 200, await react(db, postId, visitorId, reaction));
        }
        default:
          return reply(context, 404, { error: "Not found" });
      }
    } catch (err) {
      if (err instanceof Invalid) return reply(context, 400, { error: err.message });
      context.log.error(`counters/${action} failed:`, err.message);
      return reply(context, 500, { error: "Couldn't update the counter" });
    }
  };
}

module.exports = createHandler({ db: getDatabase });
module.exports.createHandler = createHandler;
