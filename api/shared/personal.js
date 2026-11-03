// Storage for the owner's private records: the `personal` Cosmos database,
// apart from the site's `portfolio` database (full at 25 containers). Only
// admin functions (/api/finance, /api/cv) use this file; it is kept out of
// /api/data and every public code path. That is the only thing keeping it
// private: the Functions share the account-wide COSMOS_KEY, which can read
// every database on the account. Every record in a container shares the
// partition key `/scope` = "me", so a whole read is one single-partition query
// and related writes can go in one transactional batch.
//
// The `personal` database (400 RU/s shared) is created by hand in the portal
// or CLI, so its throughput is a deliberate choice; each container is created
// on first use if missing.

const { createClient, newId } = require("./cosmos");
const { HttpError } = require("./http");

const DATABASE_ID = "personal";
const SCOPE = "me";

let client;
const containerPromises = new Map();

/** The named container in `personal`, created with partition key /scope if missing. */
function getPersonalContainer(containerId) {
  if (!containerPromises.has(containerId)) {
    client ??= createClient();
    const promise = client
      .database(DATABASE_ID)
      .containers.createIfNotExists({ id: containerId, partitionKey: { paths: ["/scope"] } })
      .then(({ container }) => container)
      .catch((err) => {
        containerPromises.delete(containerId);
        throw err;
      });
    containerPromises.set(containerId, promise);
  }
  return containerPromises.get(containerId);
}

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

/**
 * A repo over one container in `personal`. One extra document (`versionId`)
 * has an etag that stands for the whole container. Every write replaces it
 * with IfMatch on the etag read before the records, inside the same
 * transactional batch, so a write based on records that changed meanwhile
 * fails as a whole instead of acting on stale data.
 *
 * `label` names the store in unexpected-failure errors. `container` is for
 * tests; by default it is the named container.
 */
function createPersonalRepo({ containerId, versionId, label, container } = {}) {
  const getContainer = container ?? (() => getPersonalContainer(containerId));
  const versionDoc = () => ({
    id: versionId,
    scope: SCOPE,
    kind: "version",
    bumpedAt: new Date().toISOString(),
  });

  async function readEtag(c, id) {
    try {
      const { resource } = await c.item(id, SCOPE).read();
      return resource?._etag ?? null;
    } catch (err) {
      if (err?.code === 404) return null;
      throw err;
    }
  }

  /** The error to answer with when the batch call itself threw. */
  async function explainFailedBatch(c, err, version, create) {
    if ((await readEtag(c, versionId)) !== version) return STALE;
    for (const doc of create) {
      if ((await readEtag(c, doc.id)) !== null) return CONFLICT;
    }
    return err;
  }

  return {
    /**
     * Every record plus the version etag to pass to write(). The version is
     * read first: a write landing between the two reads then fails its
     * IfMatch, never the other way round. `version` is null before the first
     * write ever made.
     */
    async read() {
      const c = await getContainer();
      const version = await readEtag(c, versionId);
      const { resources } = await c.items
        .query(
          {
            query: "SELECT * FROM c WHERE c.scope = @scope AND c.id != @versionId",
            parameters: [
              { name: "@scope", value: SCOPE },
              { name: "@versionId", value: versionId },
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
     * so does a create whose id already exists.
     */
    async write({ create = [], replace = [], remove = [] }, version) {
      const c = await getContainer();
      const bump = version
        ? { operationType: "Replace", id: versionId, resourceBody: versionDoc(), ifMatch: version }
        : { operationType: "Create", resourceBody: versionDoc() };
      const operations = [
        bump,
        ...create.map((doc) => ({ operationType: "Create", resourceBody: doc })),
        ...replace.map((doc) => ({ operationType: "Replace", id: doc.id, resourceBody: doc })),
        ...remove.map((id) => ({ operationType: "Delete", id })),
      ];
      let response;
      try {
        response = await c.items.batch(operations, SCOPE);
      } catch (err) {
        // A failed atomic batch can come back as a thrown "Batch request error"
        // that has lost its status code, so work out the cause from the data.
        throw await explainFailedBatch(c, err, version, create);
      }
      const results = response.result || [];
      const failedAt = results.findIndex((r) => r.statusCode >= 400 && r.statusCode !== 424);
      if (failedAt === -1) return;
      const status = results[failedAt].statusCode;
      if (failedAt === 0 && (status === 412 || status === 409)) throw STALE;
      if (status === 409) throw CONFLICT;
      if (status === 404) throw GONE;
      throw new Error(`${label} batch failed with status ${status}`);
    },
  };
}

/**
 * An in-memory repo with the same interface, for tests. Like Cosmos, it gives
 * the version document a new etag on every write, fails a write whose version
 * no longer matches, and fails a create of an existing id or a replace or
 * delete of a missing one, all without applying any part of the write.
 */
function createFakePersonalRepo(initial = []) {
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

/**
 * The records for a write, refused when they aren't the ones the client
 * loaded (`input.version`, from its last read). Clients send whole records, so
 * a write from a screen that is behind would otherwise put old values back
 * over newer ones. `noun` names the store in the error, e.g. "ledger".
 */
async function readForWrite(repo, input, noun) {
  const loaded = input.version;
  if (loaded !== null && typeof loaded !== "string")
    throw new HttpError(400, `The ${noun} version is missing. Refresh and try again.`);
  const current = await repo.read();
  if (current.version !== loaded) throw STALE;
  return current;
}

module.exports = {
  DATABASE_ID,
  SCOPE,
  STALE,
  CONFLICT,
  GONE,
  stamp,
  readForWrite,
  getPersonalContainer,
  createPersonalRepo,
  createFakePersonalRepo,
};
