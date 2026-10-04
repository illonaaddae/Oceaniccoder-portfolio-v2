// The admin dashboard's data access: every row of every container, read and
// write. (Azure Functions reserves routes starting with "admin", hence
// "manage".)
//
//   GET    /api/manage/{collection}       → { total, documents }
//          ?where={json}&orderBy=&dir=&limit=   same options as /api/data
//   GET    /api/manage/{collection}/{id}  → document, or 404
//   POST   /api/manage/{collection}       { fields } → 201 document
//   PATCH  /api/manage/{collection}/{id}  { fields } → document (merged)
//   DELETE /api/manage/{collection}/{id}  → 204
//
// Admin only: the route is limited to the admin role in
// staticwebapp.config.json, and requireAdmin checks again here. Documents use
// the Appwrite shape ($id, $createdAt, $updatedAt), like /api/data.

const { getDatabase, newDocument, fromCosmos } = require("../shared/cosmos");
const { requireAdmin } = require("../shared/adminAuth");
const { BadRequest, parseListQuery, sortRows } = require("../shared/publicData");
const {
  Invalid,
  isCollection,
  partitionField,
  writableFields,
  buildAdminQuery,
  isJsonRequest,
} = require("../shared/adminData");

const HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };

function reply(context, status, body) {
  context.res = {
    status,
    headers: HEADERS,
    body: body === undefined ? "" : JSON.stringify(body),
  };
}

async function findById(container, id) {
  const { resources } = await container.items.query(buildAdminQuery({}, id)).fetchAll();
  return resources[0] || null;
}

module.exports = async function (context, req) {
  const auth = await requireAdmin(context, req);
  if (!auth.user) return reply(context, auth.status, { error: auth.error });

  const { collection, id } = context.bindingData || {};
  if (!isCollection(collection)) return reply(context, 404, { error: "Not found" });
  if ((req.method === "POST" || req.method === "PATCH") && !isJsonRequest(req)) {
    return reply(context, 415, { error: "Send JSON" });
  }

  try {
    const container = getDatabase().container(collection);

    if (req.method === "GET" && !id) {
      const options = parseListQuery(req.query);
      const { resources } = await container.items.query(buildAdminQuery(options)).fetchAll();
      const sorted = sortRows(resources, options.orderBy, options.dir);
      const documents = (options.limit ? sorted.slice(0, options.limit) : sorted).map(fromCosmos);
      return reply(context, 200, { total: resources.length, documents });
    }

    if (req.method === "POST" && !id) {
      const doc = newDocument(writableFields(req.body));
      const { resource } = await container.items.create(doc);
      return reply(context, 201, fromCosmos(resource));
    }

    if (!id) return reply(context, 405, { error: "Method not allowed" });
    const existing = await findById(container, id);
    if (!existing) return reply(context, 404, { error: "Not found" });
    const item = container.item(existing.id, existing[partitionField(collection)]);

    if (req.method === "GET") return reply(context, 200, fromCosmos(existing));

    if (req.method === "PATCH") {
      const updated = {
        ...existing,
        ...writableFields(req.body),
        updatedAt: new Date().toISOString(),
      };
      if (updated[partitionField(collection)] !== existing[partitionField(collection)]) {
        throw new Invalid(`${partitionField(collection)} can't be changed`);
      }
      // Replace only if nobody else changed the row since we read it.
      const { resource } = await item.replace(updated, {
        accessCondition: { type: "IfMatch", condition: existing._etag },
      });
      return reply(context, 200, fromCosmos(resource));
    }

    if (req.method === "DELETE") {
      await item.delete();
      return reply(context, 204);
    }

    return reply(context, 405, { error: "Method not allowed" });
  } catch (err) {
    if (err instanceof Invalid || err instanceof BadRequest) {
      return reply(context, 400, { error: err.message });
    }
    if (err.code === 409) return reply(context, 409, { error: "That would create a duplicate." });
    if (err.code === 412) {
      return reply(context, 409, { error: "This item changed meanwhile. Reload and try again." });
    }
    context.log.error(`manage/${collection} ${req.method} failed:`, err.message);
    return reply(context, 500, { error: "Couldn't complete that" });
  }
};
