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

const { getDatabase, newDocument, fromCosmos } = require("../shared/cosmos");
const { Invalid, validateSubmission } = require("../shared/submissions");
const { verifyTurnstile, clientIp } = require("../shared/turnstile");
const { storeVisitorImage } = require("../shared/media");

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

module.exports = async function (context, req) {
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

  const spam = await verifyTurnstile(turnstileToken, clientIp(req));
  if (!spam.ok) {
    reply(context, spam.status, { error: spam.error });
    return;
  }

  try {
    const db = getDatabase();
    const conflict = await checkAgainstData(db, collection, doc);
    if (conflict) {
      reply(context, conflict[0], { error: conflict[1] });
      return;
    }

    if (imageData) doc.image = await storeVisitorImage(imageData);

    const { resource } = await db.container(collection).items.create(newDocument(doc));
    reply(context, 201, fromCosmos(resource));
  } catch (err) {
    if (err.status === 400) {
      reply(context, 400, { error: err.message });
      return;
    }
    context.log.error(`submit/${collection} failed:`, err.message);
    reply(context, 500, { error: "Couldn't save that. Please try again." });
  }
};
