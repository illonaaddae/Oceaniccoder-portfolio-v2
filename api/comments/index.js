// Approved comments on one blog post, for visitors, while the site still reads
// Appwrite (VITE_DATA_BACKEND unset). The Cosmos build reads /api/data/comments.
//
//   GET /api/comments?postId=<id>  → { total, documents }, newest first
//
// Reads with the server API key so the browser never has to read the
// `comments` collection itself; a direct read hands every visitor every
// commenter's email. Fields go through the same allow-list as /api/data
// (stripPrivate in shared/publicData.js), so both backends return the same
// shape. Not cached: a visitor who reloads after commenting, or a comment the
// admin has just hidden, should show the current state.

const { sdk, DATABASE_ID, getDatabases } = require("../shared/appwrite");
const { send, handleError } = require("../shared/http");
const { stripPrivate } = require("../shared/publicData");
const { DOC_ID } = require("../shared/submissions");

const COLLECTION = "comments";
// One Appwrite page. The blog shows a carousel, not an archive.
const MAX_COMMENTS = 100;

function createHandler({ databases }) {
  return async function (context, req) {
    const postId = req.query && req.query.postId;
    if (typeof postId !== "string" || !DOC_ID.test(postId)) {
      send(context, 400, { error: "Invalid postId" });
      return;
    }

    try {
      const { Query } = sdk;
      const result = await databases().listDocuments(DATABASE_ID, COLLECTION, [
        Query.equal("postId", [postId]),
        Query.equal("isApproved", [true]),
        Query.orderDesc("$createdAt"),
        Query.limit(MAX_COMMENTS),
      ]);
      // Checked again here so a query change can't publish hidden comments.
      const documents = (result.documents || [])
        .filter((doc) => doc.isApproved === true && doc.postId === postId)
        .map((doc) => stripPrivate(COLLECTION, doc));
      send(context, 200, { total: documents.length, documents });
    } catch (err) {
      handleError(context, err, "comments");
    }
  };
}

module.exports = createHandler({ databases: getDatabases });
module.exports.createHandler = createHandler;
