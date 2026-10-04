// Visitor counters: site views, blog reads and blog reactions.
//
//   POST /api/counters/site-view                         → { count }
//   GET  /api/counters/site-views                        → { count }
//   POST /api/counters/blog-view   { postId, visitorId } → { readers, reads }
//   GET  /api/counters/blog-views?postId=                → { readers, reads }
//   GET  /api/counters/blog-views                        → { [postId]: { readers, reads } }
//   GET  /api/counters/reactions?postId=[&visitorId=]    → { likes, dislikes, mine }
//   POST /api/counters/reaction    { postId, visitorId, reaction } → same
//
// Increments are Cosmos patch operations, so concurrent visitors can't
// overwrite each other's counts. Only totals come back; visitor ids are never
// listed. Blog rows are one per (post, visitor), enforced by the container's
// unique key, so a race on the first visit ends in a 409 that's retried as an
// increment.

const { getDatabase, newDocument } = require("../shared/cosmos");
const {
  Invalid,
  checkPostId,
  checkVisitorId,
  checkReaction,
  aggregateViews,
  countReactions,
  reactionChange,
} = require("../shared/counters");

const HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };

function reply(context, status, body) {
  context.res = { status, headers: HEADERS, body: JSON.stringify(body) };
}

async function query(container, text, parameters = [], options = {}) {
  const { resources } = await container.items
    .query({ query: text, parameters }, options)
    .fetchAll();
  return resources;
}

async function postExists(db, postId) {
  const rows = await query(
    db.container("blog_posts"),
    "SELECT c.id FROM c WHERE c.id = @id AND NOT (IS_BOOLEAN(c.published) AND c.published = false)",
    [{ name: "@id", value: postId }],
  );
  return rows.length > 0;
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

async function viewStats(db, postId) {
  const rows = await query(
    db.container("blog_views"),
    "SELECT c.postId, c.reads FROM c",
    [],
    postId ? { partitionKey: postId } : {},
  );
  const stats = aggregateViews(rows);
  return postId ? stats[postId] || { readers: 0, reads: 0 } : stats;
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

  const existing = await find();
  if (existing) {
    await increment(existing);
  } else {
    try {
      await container.items.create(newDocument({ postId, visitorId, reads: 1, lastReadAt: now }));
    } catch (err) {
      if (err.code !== 409) throw err;
      await increment(await find()); // another tab created it first
    }
  }
  return viewStats(db, postId);
}

// ── reactions ─────────────────────────────────────────────────────────────

async function reactionState(db, postId, visitorId) {
  const rows = await query(
    db.container("blog_reactions"),
    "SELECT c.visitorId, c.reaction FROM c",
    [],
    { partitionKey: postId },
  );
  const mine = rows.find((r) => r.visitorId === visitorId);
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

module.exports = async function (context, req) {
  const action = context.bindingData && context.bindingData.action;
  const route = `${req.method} ${action}`;
  const body = req.body || {};
  const params = req.query || {};

  try {
    const db = getDatabase();
    switch (route) {
      case "POST site-view":
        return reply(context, 200, { count: await recordSiteView(db) });
      case "GET site-views": {
        const row = await siteViewRow(db);
        return reply(context, 200, { count: (row && row.count) || 0 });
      }
      case "POST blog-view": {
        const postId = checkPostId(body.postId);
        const visitorId = checkVisitorId(body.visitorId);
        if (!(await postExists(db, postId)))
          return reply(context, 404, { error: "Post not found" });
        return reply(context, 200, await recordBlogView(db, postId, visitorId));
      }
      case "GET blog-views":
        return reply(
          context,
          200,
          await viewStats(db, params.postId ? checkPostId(params.postId) : undefined),
        );
      case "GET reactions":
        return reply(
          context,
          200,
          await reactionState(
            db,
            checkPostId(params.postId),
            params.visitorId ? checkVisitorId(params.visitorId) : null,
          ),
        );
      case "POST reaction": {
        const postId = checkPostId(body.postId);
        const visitorId = checkVisitorId(body.visitorId);
        const reaction = checkReaction(body.reaction);
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
