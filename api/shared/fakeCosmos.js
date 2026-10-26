// In-memory stand-in for a Cosmos database, for tests. It copies the
// @azure/cosmos behaviour the quote repo and locks rely on:
//   - item(id, pk).read() resolves { resource: undefined, statusCode: 404 }
//     for a missing item (the SDK does not throw there);
//   - items.create throws code 409 when the id is taken;
//   - replace and delete throw code 404 for a missing item, and replace
//     throws code 412 when an IfMatch etag no longer matches;
//   - every stored item gets _rid, _self, _etag, _attachments and _ts.
//
// Queries run through a small evaluator for the SQL the repo writes:
//   SELECT [TOP n] * | c.field FROM c
//   [WHERE cond AND cond ...] [ORDER BY c.field ASC|DESC]
// where cond is `c.f = @p`, `c.f < @p`, `STARTSWITH(c.f, @p)` or
// `(NOT IS_DEFINED(c.f) OR IS_NULL(c.f))`. Anything else throws, and so does
// a literal value in the SQL text, so a test can't pass on an unparameterised
// or unsupported query.

const clone = (v) => (v === undefined ? v : structuredClone(v));

function cosmosError(code, message) {
  return Object.assign(new Error(message), { code });
}

const FIELD = String.raw`c\.([A-Za-z_][A-Za-z0-9_]*)`;
const CONDITIONS = [
  {
    re: new RegExp(String.raw`^${FIELD} = (@[A-Za-z0-9_]+)$`),
    test: (doc, field, value) => doc[field] !== undefined && doc[field] === value,
  },
  {
    // Cosmos compares only values of the same type; a missing field never matches.
    re: new RegExp(String.raw`^${FIELD} < (@[A-Za-z0-9_]+)$`),
    test: (doc, field, value) => typeof doc[field] === typeof value && doc[field] < value,
  },
  {
    re: new RegExp(String.raw`^STARTSWITH\(${FIELD}, (@[A-Za-z0-9_]+)\)$`),
    test: (doc, field, value) => typeof doc[field] === "string" && doc[field].startsWith(value),
  },
  {
    re: new RegExp(String.raw`^\(NOT IS_DEFINED\(${FIELD}\) OR IS_NULL\(c\.\1\)\)$`),
    test: (doc, field) => doc[field] === undefined || doc[field] === null,
  },
];
const SELECT = new RegExp(
  String.raw`^SELECT (?:TOP (\d+) )?(\*|${FIELD}) FROM c` +
    String.raw`(?: WHERE (.+?))?(?: ORDER BY ${FIELD} (ASC|DESC))?$`,
);

function compileCondition(text, params) {
  for (const { re, test } of CONDITIONS) {
    const m = re.exec(text);
    if (!m) continue;
    const [, field, name] = m;
    if (name && !params.has(name)) throw new Error(`fakeCosmos: no value for ${name}`);
    return (doc) => test(doc, field, params.get(name));
  }
  throw new Error(`fakeCosmos: unsupported condition: ${text}`);
}

function runQuery(docs, spec) {
  if (!spec || typeof spec.query !== "string") throw new Error("fakeCosmos: query must be a spec");
  const { query, parameters = [] } = spec;
  if (/['"]/.test(query)) throw new Error(`fakeCosmos: literal value in SQL: ${query}`);
  const m = SELECT.exec(query);
  if (!m) throw new Error(`fakeCosmos: unsupported query: ${query}`);
  const [, top, projection, projected, where, orderField, orderDir] = m;
  const params = new Map(parameters.map((p) => [p.name, p.value]));
  const conditions = where ? where.split(" AND ").map((t) => compileCondition(t, params)) : [];

  let rows = docs.filter((doc) => conditions.every((matches) => matches(doc)));
  if (orderField) {
    // Cosmos leaves out items without the ORDER BY field.
    rows = rows.filter((doc) => doc[orderField] !== undefined);
    const dir = orderDir === "DESC" ? -1 : 1;
    rows.sort((a, b) =>
      a[orderField] < b[orderField] ? -dir : a[orderField] > b[orderField] ? dir : 0,
    );
  }
  if (top) rows = rows.slice(0, Number(top));
  return rows.map((doc) => (projection === "*" ? clone(doc) : { [projected]: doc[projected] }));
}

function createFakeContainer(name, { partitionKey = "/id" } = {}) {
  const pkField = partitionKey.slice(1);
  const docs = new Map();
  const queries = [];
  // Tests set these to simulate another writer or a failing request. Each
  // runs before the operation and may change `docs` or throw.
  const hooks = { beforeCreate: null, beforeReplace: null, beforeRead: null };
  let version = 0;

  function store(doc) {
    version += 1;
    const saved = {
      ...clone(doc),
      _rid: `rid-${doc.id}`,
      _self: `dbs/portfolio/colls/${name}/docs/${doc.id}`,
      _etag: `"etag-${version}"`,
      _attachments: "attachments/",
      _ts: Math.floor(Date.now() / 1000),
    };
    docs.set(doc.id, saved);
    return clone(saved);
  }

  function find(id, pk) {
    const doc = docs.get(id);
    return doc && doc[pkField] === pk ? doc : undefined;
  }

  return {
    id: name,
    docs,
    queries,
    hooks,
    /** Puts a document in as-is (plus system fields), like an import. */
    seed(doc) {
      return store(doc);
    },
    items: {
      async create(body) {
        if (hooks.beforeCreate) await hooks.beforeCreate(body);
        if (typeof body.id !== "string" || !body.id) throw cosmosError(400, "id is required");
        if (docs.has(body.id))
          throw cosmosError(409, "Entity with the specified id already exists");
        return { resource: store(body), statusCode: 201 };
      },
      query(spec) {
        queries.push(clone(spec));
        return {
          async fetchAll() {
            return { resources: runQuery([...docs.values()], spec) };
          },
        };
      },
    },
    item(id, pk) {
      return {
        async read() {
          if (hooks.beforeRead) await hooks.beforeRead(id);
          const doc = find(id, pk);
          return doc
            ? { resource: clone(doc), statusCode: 200 }
            : { resource: undefined, statusCode: 404 };
        },
        async replace(body, options = {}) {
          if (hooks.beforeReplace) await hooks.beforeReplace(id, body);
          const current = find(id, pk);
          if (!current) throw cosmosError(404, "Entity with the specified id does not exist");
          const condition = options.accessCondition;
          if (condition && condition.type === "IfMatch" && condition.condition !== current._etag) {
            throw cosmosError(412, "Precondition Failed");
          }
          if (body.id !== id || body[pkField] !== pk)
            throw cosmosError(400, "id or partition key changed");
          const { _rid, _self, _etag, _attachments, _ts, ...fields } = body;
          return { resource: store(fields), statusCode: 200 };
        },
        async delete() {
          if (!find(id, pk)) throw cosmosError(404, "Entity with the specified id does not exist");
          docs.delete(id);
          return { statusCode: 204 };
        },
      };
    },
  };
}

/** A fake database whose containers are created on first use. */
function createFakeCosmos(partitionKeys = {}) {
  const containers = new Map();
  return {
    containers,
    container(name) {
      if (!containers.has(name)) {
        containers.set(name, createFakeContainer(name, { partitionKey: partitionKeys[name] }));
      }
      return containers.get(name);
    },
  };
}

module.exports = { createFakeCosmos, createFakeContainer };
