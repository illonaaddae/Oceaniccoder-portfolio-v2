// Public, read-only access to the site's content in Cosmos DB.
//
//   GET /api/data/{collection}        → { total, documents }
//       ?where={"field":value}&orderBy=field&dir=asc|desc&limit=n
//   GET /api/data/{collection}/{id}   → document, or 404
//
// Documents come back in the Appwrite shape ($id, $createdAt, $updatedAt), so
// the browser code reads them exactly as before. Which collections, rows and
// fields are public is decided in api/shared/publicData.js, not by the caller.
// Writes and admin reads live elsewhere.

const { getDatabase, fromCosmos } = require("../shared/cosmos");
const {
  PUBLIC_COLLECTIONS,
  BadRequest,
  parseListQuery,
  buildQuery,
  sortRows,
  stripPrivate,
} = require("../shared/publicData");

const HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };

function reply(context, status, body) {
  context.res = { status, headers: HEADERS, body: JSON.stringify(body) };
}

module.exports = async function (context, req) {
  const { collection, id } = context.bindingData || {};

  if (!Object.prototype.hasOwnProperty.call(PUBLIC_COLLECTIONS, collection)) {
    reply(context, 404, { error: "Not found" });
    return;
  }

  try {
    const container = getDatabase().container(collection);
    const toPublic = (doc) => stripPrivate(collection, fromCosmos(doc));

    if (id) {
      const { resources } = await container.items.query(buildQuery(collection, {}, id)).fetchAll();
      if (resources.length === 0) reply(context, 404, { error: "Not found" });
      else reply(context, 200, toPublic(resources[0]));
      return;
    }

    const options = parseListQuery(req.query, collection);
    const { resources } = await container.items.query(buildQuery(collection, options)).fetchAll();
    const sorted = sortRows(resources, options.orderBy, options.dir);
    const documents = (options.limit ? sorted.slice(0, options.limit) : sorted).map(toPublic);
    reply(context, 200, { total: resources.length, documents });
  } catch (err) {
    if (err instanceof BadRequest) {
      reply(context, 400, { error: err.message });
      return;
    }
    context.log.error(`data/${collection} failed:`, err.message);
    reply(context, 500, { error: "Could not load data" });
  }
};
