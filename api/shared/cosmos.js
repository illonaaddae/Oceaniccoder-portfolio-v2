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

const crypto = require("crypto");

const DATABASE_ID = "portfolio";
const SHARED_THROUGHPUT = 1000;

// Partition keys: `/id` unless rows are read by a parent id. Unique keys only
// apply inside one partition, which is what the old Appwrite indexes need:
//   blog_reactions, blog_views   one row per (postId, visitorId)
//   project_videos,
//   project_case_studies         one row per projectId
//
// `analytics` (page views from /api/visit) is Cosmos-only, so it has no
// Appwrite table to import (`imported: false`). Partition per UTC day; TTL is
// on with no default (-1), and each item sets its own `ttl`. Only the fields
// the analytics queries filter on are indexed, which keeps writes cheap.
//
// TTL must be On for the container itself. With container TTL Off, Cosmos
// ignores every item's `ttl`, so raw page views and daily salts would never
// expire. createIfNotExists never changes an existing container, so check it
// in the portal (Settings → Time to Live: "On (no default)") if it was created
// by hand. Production was created with defaultTtl -1.
const ANALYTICS_INDEXING_POLICY = {
  indexingMode: "consistent",
  includedPaths: [{ path: "/type/?" }, { path: "/day/?" }, { path: "/ts/?" }, { path: "/sid/?" }],
  excludedPaths: [{ path: "/*" }],
};

const CONTAINERS = {
  about: { partitionKey: "/id" },
  analytics: {
    partitionKey: "/day",
    defaultTtl: -1,
    indexingPolicy: ANALYTICS_INDEXING_POLICY,
    imported: false,
  },
  blog_posts: { partitionKey: "/id" },
  blog_reactions: { partitionKey: "/postId", uniqueKeys: [["/visitorId"]] },
  blog_views: { partitionKey: "/postId", uniqueKeys: [["/visitorId"]] },
  bookings: { partitionKey: "/id" },
  certifications: { partitionKey: "/id" },
  comments: { partitionKey: "/id" },
  education: { partitionKey: "/id" },
  // Never existed in Appwrite (the Analytics tab showed "unavailable").
  expenses: { partitionKey: "/id" },
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

/** A client from COSMOS_ENDPOINT and COSMOS_KEY. `extra` adds client options. */
function createClient(extra = {}) {
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  if (!endpoint || !key) throw new Error("COSMOS_ENDPOINT and COSMOS_KEY must be set");
  // Required here, not at the top: publicData.js (and its tests) import this
  // file for constants only, where api/node_modules may not be installed.
  const { CosmosClient } = require("@azure/cosmos");
  return new CosmosClient({ endpoint, key, ...extra });
}

// Page-view writes must never compete with the rest of the site for the
// shared 1,000 RU/s. Their client gives up on the first 429 and on slow
// requests, so throttling drops page views instead of queueing retries.
const ANALYTICS_CLIENT_OPTIONS = {
  connectionPolicy: {
    requestTimeout: 5000,
    retryOptions: {
      maxRetryAttemptCount: 0,
      fixedRetryIntervalInMilliseconds: 0,
      maxWaitTimeInSeconds: 1,
    },
  },
};

let database;
let analyticsContainer;

/** The `portfolio` database, reusing one client across invocations. */
function getDatabase() {
  database ??= createClient().database(DATABASE_ID);
  return database;
}

/** The `analytics` container on its own no-retry client. */
function getAnalyticsContainer() {
  analyticsContainer ??= createClient(ANALYTICS_CLIENT_OPTIONS)
    .database(DATABASE_ID)
    .container("analytics");
  return analyticsContainer;
}

/** Creates the database and every container if missing. Safe to re-run. */
async function ensureSchema(client) {
  const { database: db } = await client.databases.createIfNotExists({
    id: DATABASE_ID,
    throughput: SHARED_THROUGHPUT,
  });
  for (const [id, { partitionKey, uniqueKeys, defaultTtl, indexingPolicy }] of Object.entries(
    CONTAINERS,
  )) {
    await db.containers.createIfNotExists({
      id,
      partitionKey: { paths: [partitionKey] },
      ...(uniqueKeys && {
        uniqueKeyPolicy: { uniqueKeys: uniqueKeys.map((paths) => ({ paths })) },
      }),
      ...(defaultTtl !== undefined && { defaultTtl }),
      ...(indexingPolicy && { indexingPolicy }),
    });
  }
  return db;
}

/** A new document id: 20 hex chars, the same shape as an Appwrite id. */
function newId() {
  return crypto.randomBytes(10).toString("hex");
}

/** A new document with its id and timestamps set. */
function newDocument(fields) {
  const now = new Date().toISOString();
  return { id: newId(), createdAt: now, updatedAt: now, ...fields };
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
  newId,
  newDocument,
  getDatabase,
  getAnalyticsContainer,
  ANALYTICS_CLIENT_OPTIONS,
  ensureSchema,
  toCosmos,
  fromCosmos,
};
