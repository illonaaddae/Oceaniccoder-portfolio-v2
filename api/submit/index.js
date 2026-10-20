// Visitor submissions: comments, contact messages, bookings, project
// inquiries and testimonials.
//
//   POST /api/submit/{collection}
//        { turnstileToken, imageData?, ...fields }  → 201 with the saved row
//
// Order matters: the fields are validated before the Turnstile token is spent
// (tokens are single-use), and the row is written only after both pass. What
// each form may send, and what the server sets itself, is in
// api/shared/submissions.js.
//
// A saved contact message also emails the admin (RESEND_TO_EMAIL). The email
// goes only after the row is saved, and a failed send is logged, never
// returned: the visitor's message is already stored.
//
// Turnstile can be solved by paid captcha farms, and the alert shares its
// Resend key and quota with the payment emails, so alerts are capped per
// instance: ALERTS_PER_IP an hour per client IP, then ALERTS_PER_DAY in total.
// Over a cap the row is still saved (201) and only the email is skipped,
// logged once an hour per cap so a flood can't fill the logs either.

const { getDatabase, newDocument, fromCosmos } = require("../shared/cosmos");
const { Invalid, validateSubmission } = require("../shared/submissions");
const { verifyTurnstile, clientIp } = require("../shared/turnstile");
const { storeVisitorImage } = require("../shared/media");
const { sendEmail } = require("../shared/email/send");
const { createRateLimiter } = require("../shared/rateLimit");
const { messageAlertEmail, isSafeReplyTo } = require("./messageAlert");

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const ALERTS_PER_IP = 3;
const ALERTS_PER_DAY = 50;

const HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };

function reply(context, status, body) {
  context.res = { status, headers: HEADERS, body: JSON.stringify(body) };
}

async function exists(container, query, parameters) {
  const { resources } = await container.items.query({ query, parameters }).fetchAll();
  return resources.length > 0;
}

/** Collection-specific checks against existing data. Returns an error reply or null. */
async function checkAgainstData(db, collection, doc) {
  if (collection === "comments") {
    const post = await exists(
      db.container("blog_posts"),
      "SELECT c.id FROM c WHERE c.id = @id AND NOT (IS_BOOLEAN(c.published) AND c.published = false)",
      [{ name: "@id", value: doc.postId }],
    );
    if (!post) return [404, "That post doesn't exist."];
    if (doc.parentId) {
      const parent = await exists(
        db.container("comments"),
        "SELECT c.id FROM c WHERE c.id = @id AND c.postId = @postId",
        [
          { name: "@id", value: doc.parentId },
          { name: "@postId", value: doc.postId },
        ],
      );
      if (!parent) return [400, "The comment you're replying to doesn't exist."];
    }
  }
  if (collection === "bookings") {
    const taken = await exists(
      db.container("bookings"),
      "SELECT c.id FROM c WHERE c.preferredDate = @date AND c.preferredTime = @time",
      [
        { name: "@date", value: doc.preferredDate },
        { name: "@time", value: doc.preferredTime },
      ],
    );
    if (taken) return [409, "That time was just booked. Please choose a different time."];
  }
  return null;
}

/** Emails the admin about a saved message. Logs a failure; never throws. */
async function alertAdmin(context, row, sendEmail) {
  let error;
  try {
    const result = await sendEmail({
      to: process.env.RESEND_TO_EMAIL,
      // Left out when unsafe, so sendEmail falls back to its own address.
      ...(isSafeReplyTo(row.email) ? { replyTo: row.email } : {}),
      ...messageAlertEmail(row),
    });
    if (!result.ok) error = result.error;
  } catch (err) {
    error = err.message;
  }
  if (error) context.log.error(`submit/messages: alert email for ${row.$id} failed:`, error);
}

/** Decides whether a saved message may email the admin, and logs the first skip per cap. */
function createAlertBudget(now) {
  const allowIp = createRateLimiter({ limit: ALERTS_PER_IP, windowMs: HOUR_MS });
  const allowDay = createRateLimiter({ limit: ALERTS_PER_DAY, windowMs: DAY_MS, maxKeys: 1 });
  const allowSkipLog = createRateLimiter({ limit: 1, windowMs: HOUR_MS, maxKeys: 2 });

  return function mayAlert(context, ip) {
    const nowMs = now();
    // Per-IP first, so one source can't use up the daily budget on its own.
    // Requests without a forwarded IP share one bucket rather than going unlimited.
    let cap = null;
    if (!allowIp(ip || "unknown", 1, nowMs)) cap = `${ALERTS_PER_IP} an hour from one IP`;
    else if (!allowDay("all", 1, nowMs)) cap = `${ALERTS_PER_DAY} a day`;
    if (!cap) return true;
    if (allowSkipLog(cap, 1, nowMs)) {
      context.log.warn(
        `submit/messages: alert email cap of ${cap} reached; saving without emailing`,
      );
    }
    return false;
  };
}

function createHandler({
  getDatabase,
  verifyTurnstile,
  storeVisitorImage,
  sendEmail,
  now = Date.now,
}) {
  const mayAlert = createAlertBudget(now);

  return async function (context, req) {
    const collection = context.bindingData && context.bindingData.collection;
    const { turnstileToken, imageData, ...fields } = req.body || {};

    let doc;
    try {
      doc = validateSubmission(collection, fields);
    } catch (err) {
      if (err instanceof Invalid) {
        reply(context, err.message === "Unknown form" ? 404 : 400, { error: err.message });
        return;
      }
      throw err;
    }
    if (imageData !== undefined && collection !== "testimonials") {
      reply(context, 400, { error: "Unexpected field: imageData" });
      return;
    }

    const ip = clientIp(req);
    const spam = await verifyTurnstile(turnstileToken, ip);
    if (!spam.ok) {
      reply(context, spam.status, { error: spam.error });
      return;
    }

    let saved;
    try {
      const db = getDatabase();
      const conflict = await checkAgainstData(db, collection, doc);
      if (conflict) {
        reply(context, conflict[0], { error: conflict[1] });
        return;
      }

      if (imageData) doc.image = await storeVisitorImage(imageData);

      const { resource } = await db.container(collection).items.create(newDocument(doc));
      saved = fromCosmos(resource);
    } catch (err) {
      if (err.status === 400) {
        reply(context, 400, { error: err.message });
        return;
      }
      context.log.error(`submit/${collection} failed:`, err.message);
      reply(context, 500, { error: "Couldn't save that. Please try again." });
      return;
    }

    reply(context, 201, saved);
    if (collection === "messages" && mayAlert(context, ip)) {
      await alertAdmin(context, saved, sendEmail);
    }
  };
}

module.exports = createHandler({ getDatabase, verifyTurnstile, storeVisitorImage, sendEmail });
module.exports.createHandler = createHandler;
