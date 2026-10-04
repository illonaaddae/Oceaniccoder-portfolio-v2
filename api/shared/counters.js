// Input checks and aggregation for /api/counters (site views, blog views,
// reactions). No Cosmos calls here, so it's unit-tested on its own.

const POST_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
// getVisitorId() in src/components/BlogPost/utils.js: "visitor_" + base36.
const VISITOR_ID = /^visitor_[a-z0-9]{6,40}$/;
const REACTIONS = new Set(["like", "dislike"]);

class Invalid extends Error {}

function checkPostId(value) {
  if (typeof value !== "string" || !POST_ID.test(value)) throw new Invalid("Invalid postId");
  return value;
}

function checkVisitorId(value) {
  if (typeof value !== "string" || !VISITOR_ID.test(value)) throw new Invalid("Invalid visitorId");
  return value;
}

function checkReaction(value) {
  if (!REACTIONS.has(value)) throw new Invalid("reaction must be like or dislike");
  return value;
}

/**
 * Rows of { postId, reads } → { [postId]: { readers, reads } }. One row per
 * (post, visitor), so rows are unique readers and the sum of reads is total
 * reads. A row without `reads` counts as one read, as before.
 */
function aggregateViews(rows) {
  const stats = {};
  for (const { postId, reads } of rows) {
    const current = stats[postId] || { readers: 0, reads: 0 };
    stats[postId] = {
      readers: current.readers + 1,
      reads: current.reads + Math.max(1, reads || 1),
    };
  }
  return stats;
}

/** Rows of { reaction } → { likes, dislikes }. */
function countReactions(rows) {
  let likes = 0;
  let dislikes = 0;
  for (const { reaction } of rows) {
    if (reaction === "like") likes += 1;
    else if (reaction === "dislike") dislikes += 1;
  }
  return { likes, dislikes };
}

/**
 * What a click does, given the visitor's current reaction: the same one again
 * removes it, a different one replaces it, none adds it.
 */
function reactionChange(current, clicked) {
  if (!current) return "create";
  return current === clicked ? "delete" : "replace";
}

module.exports = {
  Invalid,
  checkPostId,
  checkVisitorId,
  checkReaction,
  aggregateViews,
  countReactions,
  reactionChange,
};
