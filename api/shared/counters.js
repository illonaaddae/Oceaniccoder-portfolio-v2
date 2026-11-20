// Input checks, visitor cookies and aggregation for /api/counters (site
// views, blog views, reactions). No Cosmos calls here, so it's unit-tested on
// its own.

const crypto = require("crypto");
const { readCookie } = require("./access/core");
const { signVisitor, verifyVisitor } = require("./tokens");

const POST_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
// getVisitorId() in src/components/BlogPost/utils.js: "visitor_" + base36.
const VISITOR_ID = /^visitor_[a-z0-9]{6,40}$/;
const REACTIONS = new Set(["like", "dislike"]);

// The visitor id lives in an HttpOnly cookie signed by the server, so a
// caller can only get new visitor ids from POST /api/counters/visitor, which
// is rate limited per IP. The __Secure- prefix makes browsers refuse it
// without Secure, i.e. over plain HTTP from another site.
const VISITOR_COOKIE = "__Secure-oc_visitor";
const VISITOR_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

class Invalid extends Error {}

function checkPostId(value) {
  if (typeof value !== "string" || !POST_ID.test(value)) throw new Invalid("Invalid postId");
  return value;
}

function checkVisitorId(value) {
  if (typeof value !== "string" || !VISITOR_ID.test(value)) throw new Invalid("Invalid visitorId");
  return value;
}

/** A fresh visitor id in the shape the browser used to make itself. */
function newVisitorId() {
  const n = BigInt(`0x${crypto.randomBytes(12).toString("hex")}`);
  return `visitor_${n.toString(36).padStart(19, "0")}`;
}

/** The Set-Cookie header that hands `visitorId` to the browser. */
function visitorCookie(visitorId, secret) {
  const value = `${visitorId}.${signVisitor(visitorId, secret)}`;
  return `${VISITOR_COOKIE}=${value}; Max-Age=${VISITOR_COOKIE_MAX_AGE}; Path=/api/counters; HttpOnly; Secure; SameSite=Strict`;
}

/** The visitor id from a cookie this server signed, or null. */
function readVisitor(req, secret) {
  const value = readCookie(req, VISITOR_COOKIE);
  if (!value || !secret) return null;
  const dot = value.indexOf(".");
  if (dot < 0) return null;
  const visitorId = value.slice(0, dot);
  if (!VISITOR_ID.test(visitorId)) return null;
  return verifyVisitor(visitorId, value.slice(dot + 1), secret) ? visitorId : null;
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
  VISITOR_COOKIE,
  newVisitorId,
  visitorCookie,
  readVisitor,
  aggregateViews,
  countReactions,
  reactionChange,
};
