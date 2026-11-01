// Storage for personal finance records: the `finance` container in the
// `personal` Cosmos database, kept apart from the site's `portfolio` database
// so no public Function can ever read it (the `portfolio` one is also full at
// 25 containers). Every record shares the partition key `/scope` = "me", so a
// whole read is one single-partition query and related writes can go in one
// transactional batch.
//
// The `personal` database (400 RU/s shared) is created by hand in the portal
// or CLI, so its throughput is a deliberate choice; the container is created
// on first use if missing.

const { createClient, newId } = require("../cosmos");
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

function strip(doc) {
  const { _rid, _self, _etag, _attachments, _ts, ...rest } = doc;
  return rest;
}

function stamp(fields, now = new Date()) {
  const iso = now.toISOString();
  return { id: newId(), scope: SCOPE, createdAt: iso, updatedAt: iso, ...fields };
}

function createCosmosFinanceRepo() {
  return {
    async listAll() {
      const container = await getContainer();
      const { resources } = await container.items
        .query(
          {
            query: "SELECT * FROM c WHERE c.scope = @scope",
            parameters: [{ name: "@scope", value: SCOPE }],
          },
          { partitionKey: SCOPE },
        )
        .fetchAll();
      return resources.map(strip);
    },
    async create(doc) {
      const container = await getContainer();
      const { resource } = await container.items.create(doc);
      return strip(resource);
    },
    async replace(doc) {
      const container = await getContainer();
      const { resource } = await container.item(doc.id, SCOPE).replace(doc);
      return strip(resource);
    },
    async remove(id) {
      const container = await getContainer();
      await container.item(id, SCOPE).delete();
    },
    /** Creates and replaces in one all-or-nothing batch. */
    async batch({ create = [], replace = [] }) {
      const container = await getContainer();
      const operations = [
        ...create.map((doc) => ({ operationType: "Create", resourceBody: doc })),
        ...replace.map((doc) => ({ operationType: "Replace", id: doc.id, resourceBody: doc })),
      ];
      const response = await container.items.batch(operations, SCOPE);
      const failed = (response.result || []).find((r) => r.statusCode >= 400);
      if (failed) throw new Error(`Finance batch failed with status ${failed.statusCode}`);
    },
  };
}

/** An in-memory repo with the same interface, for tests. */
function createFakeFinanceRepo(initial = []) {
  const docs = new Map(initial.map((d) => [d.id, structuredClone(d)]));
  return {
    docs,
    async listAll() {
      return [...docs.values()].map((d) => structuredClone(d));
    },
    async create(doc) {
      if (docs.has(doc.id)) throw new Error("conflict");
      docs.set(doc.id, structuredClone(doc));
      return structuredClone(doc);
    },
    async replace(doc) {
      if (!docs.has(doc.id)) throw new Error("not found");
      docs.set(doc.id, structuredClone(doc));
      return structuredClone(doc);
    },
    async remove(id) {
      docs.delete(id);
    },
    async batch({ create = [], replace = [] }) {
      if (create.some((d) => docs.has(d.id)) || replace.some((d) => !docs.has(d.id)))
        throw new Error("batch failed");
      for (const d of [...create, ...replace]) docs.set(d.id, structuredClone(d));
    },
  };
}

module.exports = {
  DATABASE_ID,
  CONTAINER_ID,
  stamp,
  createCosmosFinanceRepo,
  createFakeFinanceRepo,
};
