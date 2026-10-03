// Cosmos DB for NoSQL, shared by the data Functions and
// scripts/import-to-cosmos.mjs so both agree on container layout and on how
// an Appwrite row maps to a Cosmos document. This folder has no function.json,
// so the Functions host never exposes it as an endpoint.
//
// One database (`portfolio`) with shared throughput, one container per former
// Appwrite table. The free tier covers 1,000 RU/s shared across all of them;
// never give a container its own throughput, or it's billed separately.
//
// Documents keep the Appwrite row id as `id` (links and slugs stay valid) and
// its timestamps as `createdAt` / `updatedAt`. fromCosmos() turns them back
// into `$id` / `$createdAt` / `$updatedAt`, so the browser sees the same shape
// it got from Appwrite.

const { CosmosClient } = require("@azure/cosmos");

const DATABASE_ID = "portfolio";
const SHARED_THROUGHPUT = 1000;

// Partition keys: `/id` unless rows are read by a parent id. Unique keys only
// apply inside one partition, which is what the old Appwrite indexes need:
//   blog_reactions, blog_views   one row per (postId, visitorId)
//   project_videos,
//   project_case_studies         one row per projectId
const CONTAINERS = {
  about: { partitionKey: "/id" },
  blog_posts: { partitionKey: "/id" },
  blog_reactions: { partitionKey: "/postId", uniqueKeys: [["/visitorId"]] },
  blog_views: { partitionKey: "/postId", uniqueKeys: [["/visitorId"]] },
  bookings: { partitionKey: "/id" },
  certifications: { partitionKey: "/id" },
  comments: { partitionKey: "/id" },
  education: { partitionKey: "/id" },
  gallery: { partitionKey: "/id" },
  invoices: { partitionKey: "/id" },
  journey: { partitionKey: "/id" },
  messages: { partitionKey: "/id" },
  payments: { partitionKey: "/id" },
  project_case_studies: { partitionKey: "/projectId", uniqueKeys: [["/projectId"]] },
  project_inquiries: { partitionKey: "/id" },
  project_videos: { partitionKey: "/projectId", uniqueKeys: [["/projectId"]] },
  projects: { partitionKey: "/id" },
  settings: { partitionKey: "/id" },
  site_views: { partitionKey: "/id" },
  skills: { partitionKey: "/id" },
  testimonials: { partitionKey: "/id" },
};

// The only settings rows that move to Cosmos, the same keys the site reads
// (PUBLIC_SETTING_KEYS in src/services/api/settings.ts). Any other row stays
// behind, so a private setting is never copied by accident.
const MIGRATED_SETTINGS_KEYS = new Set(["platform_logos", "hero_roles", "hero_images"]);

/** A client from COSMOS_ENDPOINT and COSMOS_KEY. */
function createClient() {
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  if (!endpoint || !key) throw new Error("COSMOS_ENDPOINT and COSMOS_KEY must be set");
  return new CosmosClient({ endpoint, key });
}

let database;

/** The `portfolio` database, reusing one client across invocations. */
function getDatabase() {
  database ??= createClient().database(DATABASE_ID);
  return database;
}

/** Creates the database and every container if missing. Safe to re-run. */
async function ensureSchema(client) {
  const { database: db } = await client.databases.createIfNotExists({
    id: DATABASE_ID,
    throughput: SHARED_THROUGHPUT,
  });
  for (const [id, { partitionKey, uniqueKeys }] of Object.entries(CONTAINERS)) {
    await db.containers.createIfNotExists({
      id,
      partitionKey: { paths: [partitionKey] },
      ...(uniqueKeys && {
        uniqueKeyPolicy: { uniqueKeys: uniqueKeys.map((paths) => ({ paths })) },
      }),
    });
  }
  return db;
}

/** Appwrite row → Cosmos document. Drops Appwrite-only `$` fields. */
function toCosmos(row) {
  const doc = { id: row.$id, createdAt: row.$createdAt, updatedAt: row.$updatedAt };
  for (const [key, value] of Object.entries(row)) {
    if (!key.startsWith("$")) doc[key] = value;
  }
  return doc;
}

/** Cosmos document → the row shape the browser already expects. */
function fromCosmos(doc) {
  const { id, createdAt, updatedAt, _rid, _self, _etag, _attachments, _ts, ...fields } = doc;
  return { $id: id, $createdAt: createdAt, $updatedAt: updatedAt, ...fields };
}

module.exports = {
  DATABASE_ID,
  CONTAINERS,
  MIGRATED_SETTINGS_KEYS,
  createClient,
  getDatabase,
  ensureSchema,
  toCosmos,
  fromCosmos,
};
