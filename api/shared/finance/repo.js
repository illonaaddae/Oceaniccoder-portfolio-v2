// Storage for personal finance records: the `finance` container in the
// `personal` Cosmos database, apart from the site's `portfolio` database (also
// full at 25 containers). Only /api/finance, behind the admin role, uses this
// file; it is kept out of /api/data and every public code path. That is the
// only thing keeping it private: the Functions share the account-wide
// COSMOS_KEY, which can read every database on the account. Every record
// shares the partition key `/scope` = "me", so a whole read is one
// single-partition query and related writes can go in one transactional batch.
//
// The `personal` database (400 RU/s shared) is created by hand in the portal
// or CLI, so its throughput is a deliberate choice; the container is created
// on first use if missing.

const { createClient, newId } = require("../cosmos");
const { HttpError } = require("../http");
const { SCOPE } = require("./model");

const DATABASE_ID = "personal";
const CONTAINER_ID = "finance";

let containerPromise;

function getContainer() {
  containerPromise ??= createClient()
    .database(DATABASE_ID)
    .containers.createIfNotExists({ id: CONTAINER_ID, partitionKey: { paths: ["/scope"] } })
    .then(({ container }) => container)
    .catch((err) => {
      containerPromise = undefined;
      throw err;
    });
  return containerPromise;
}

// One extra document whose etag stands for the whole ledger. Every write
// replaces it with IfMatch on the etag read before the ledger, inside the same
// transactional batch, so a write based on a ledger that changed meanwhile
// fails as a whole instead of breaking a balance check made on stale data.
const VERSION_ID = "ledger-version";

const CONFLICT = new HttpError(409, "That was already recorded. Refresh to see the latest.");
const STALE = new HttpError(409, "Something changed since this loaded. Refresh to see the latest.");
const GONE = new HttpError(404, "That record no longer exists. Refresh and try again.");

function strip(doc) {
  const { _rid, _self, _etag, _attachments, _ts, ...rest } = doc;
  return rest;
}

function stamp(fields, now = new Date()) {
  const iso = now.toISOString();
  return { id: newId(), scope: SCOPE, createdAt: iso, updatedAt: iso, ...fields };
}

function versionDoc() {
  return { id: VERSION_ID, scope: SCOPE, kind: "version", bumpedAt: new Date().toISOString() };
}

/** `container` is for tests; by default it is the `finance` container. */
function createCosmosFinanceRepo({ container: getFinanceContainer = getContainer } = {}) {
  return {
    /**
     * The whole ledger plus the version etag to pass to write(). The version
     * is read first: a write landing between the two reads then fails its
     * IfMatch, never the other way round. `version` is null before the first
     * write ever made.
     */
    async read() {
      const container = await getFinanceContainer();
      let version = null;
      try {
        const { resource } = await container.item(VERSION_ID, SCOPE).read();
        version = resource?._etag ?? null;
      } catch (err) {
        if (err?.code !== 404) throw err;
      }
      const { resources } = await container.items
        .query(
          {
            query: "SELECT * FROM c WHERE c.scope = @scope AND c.id != @versionId",
            parameters: [
              { name: "@scope", value: SCOPE },
              { name: "@versionId", value: VERSION_ID },
            ],
          },
          { partitionKey: SCOPE },
        )
        .fetchAll();
      return { docs: resources.map(strip), version };
    },
    /**
     * Creates, replaces and deletes in one all-or-nothing batch, together with
     * the version bump. A changed version fails the batch (409 "Refresh"), and
     * so does a create whose id already exists, which is what stops the same
     * expected income being received twice by overlapping requests.
     */
    async write({ create = [], replace = [], remove = [] }, version) {
      const container = await getFinanceContainer();
      const bump = version
        ? { operationType: "Replace", id: VERSION_ID, resourceBody: versionDoc(), ifMatch: version }
        : { operationType: "Create", resourceBody: versionDoc() };
      const operations = [
        bump,
        ...create.map((doc) => ({ operationType: "Create", resourceBody: doc })),
        ...replace.map((doc) => ({ operationType: "Replace", id: doc.id, resourceBody: doc })),
        ...remove.map((id) => ({ operationType: "Delete", id })),
      ];
      let response;
      try {
        response = await container.items.batch(operations, SCOPE);
      } catch (err) {
        // A failed atomic batch can come back as a thrown "Batch request error"
        // that has lost its status code, so work out the cause from the data.
        throw await explainFailedBatch(container, err, version, create);
      }
      const results = response.result || [];
      const failedAt = results.findIndex((r) => r.statusCode >= 400 && r.statusCode !== 424);
      if (failedAt === -1) return;
      const status = results[failedAt].statusCode;
      if (failedAt === 0 && (status === 412 || status === 409)) throw STALE;
      if (status === 409) throw CONFLICT;
      if (status === 404) throw GONE;
      throw new Error(`Finance batch failed with status ${status}`);
    },
  };
}

async function readEtag(container, id) {
  try {
    const { resource } = await container.item(id, SCOPE).read();
    return resource?._etag ?? null;
  } catch (err) {
    if (err?.code === 404) return null;
    throw err;
  }
}

/** The error to answer with when the batch call itself threw. */
async function explainFailedBatch(container, err, version, create) {
  if ((await readEtag(container, VERSION_ID)) !== version) return STALE;
  for (const doc of create) {
    if ((await readEtag(container, doc.id)) !== null) return CONFLICT;
  }
  return err;
}

/**
 * An in-memory repo with the same interface, for tests. Like Cosmos, it gives
 * the version document a new etag on every write, fails a write whose version
 * no longer matches, and fails a create of an existing id or a replace or
 * delete of a missing one, all without applying any part of the write.
 */
function createFakeFinanceRepo(initial = []) {
  const docs = new Map(initial.map((d) => [d.id, structuredClone(d)]));
  let version = null;
  let writes = 0;
  return {
    docs,
    async read() {
      return { docs: [...docs.values()].map((d) => structuredClone(d)), version };
    },
    async write({ create = [], replace = [], remove = [] }, expected) {
      if (expected !== version) throw STALE;
      if (create.some((d) => docs.has(d.id))) throw CONFLICT;
      if (replace.some((d) => !docs.has(d.id)) || remove.some((id) => !docs.has(id))) throw GONE;
      for (const d of [...create, ...replace]) docs.set(d.id, structuredClone(d));
      for (const id of remove) docs.delete(id);
      writes += 1;
      version = `"v${writes}"`;
    },
  };
}

module.exports = {
  DATABASE_ID,
  CONTAINER_ID,
  VERSION_ID,
  stamp,
  createCosmosFinanceRepo,
  createFakeFinanceRepo,
};
