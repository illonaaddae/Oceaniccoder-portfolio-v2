// Creates the two Appwrite pieces the certification-type and blog-readership
// features need:
//
//   1. `certificationType` on the `certifications` collection — the kind of
//      certificate (Professional Certificate, Cloud Certification, …). Without
//      it every certification save fails with "Unknown attribute".
//   2. The `blog_views` collection — one document per (post, visitor) with a
//      `reads` counter, so the row count is unique readers and the sum of
//      `reads` is total reads. Without it every read count shows zero.
//
// Permissions on `blog_views` mirror `blog_reactions`: anonymous visitors need
// create (first read), read (showing the count) and update (their own repeat
// visits). No delete — nothing in the app removes a view.
//
// Usage:
//   APPWRITE_API_KEY=... node scripts/setup-blog-views-and-cert-type.mjs           # dry run
//   APPWRITE_API_KEY=... node scripts/setup-blog-views-and-cert-type.mjs --apply
//
// Needs the `collections.read`, `collections.write`, `attributes.read`,
// `attributes.write`, `indexes.read` and `indexes.write` scopes.

import { Client, Databases, Permission, Role, IndexType } from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const projectId = process.env.APPWRITE_PROJECT_ID || "6943431e00253c8f9883";
const databaseId = process.env.APPWRITE_DATABASE_ID || "6943493400018e7c314c";
const apiKey = process.env.APPWRITE_API_KEY;

const CERTIFICATIONS = "certifications";
const CERT_TYPE_KEY = "certificationType";
const CERT_TYPE_SIZE = 100;

const BLOG_VIEWS = "blog_views";

const apply = process.argv.includes("--apply");

if (!apiKey) {
  console.error("APPWRITE_API_KEY is required");
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

/** Appwrite builds attributes asynchronously; indexes fail while they're processing. */
async function waitForAttribute(collectionId, key, attempts = 20) {
  for (let i = 0; i < attempts; i += 1) {
    const list = await databases.listAttributes(databaseId, collectionId);
    const attribute = list.attributes.find((a) => a.key === key);
    if (attribute?.status === "available") return true;
    if (attribute?.status === "failed") throw new Error(`attribute ${key} failed to build`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function ensureCertificationType() {
  console.log(`\n── ${CERTIFICATIONS}.${CERT_TYPE_KEY} ──`);

  const collection = await databases.getCollection(databaseId, CERTIFICATIONS);
  const existing = collection.attributes.find((a) => a.key === CERT_TYPE_KEY);

  if (existing) {
    console.log(`  exists (status: ${existing.status})`);
    return;
  }

  if (!apply) {
    console.log(`  MISSING — would create string(${CERT_TYPE_SIZE}), optional`);
    return;
  }

  await databases.createStringAttribute(
    databaseId,
    CERTIFICATIONS,
    CERT_TYPE_KEY,
    CERT_TYPE_SIZE,
    false,
  );
  console.log(`  created string(${CERT_TYPE_SIZE}), optional`);
  await waitForAttribute(CERTIFICATIONS, CERT_TYPE_KEY);
  console.log("  available");
}

async function ensureBlogViewsCollection() {
  console.log(`\n── ${BLOG_VIEWS} collection ──`);

  const collections = await databases.listCollections(databaseId);
  const existing = collections.collections.find((c) => c.$id === BLOG_VIEWS);

  if (existing) {
    console.log("  exists");
    return;
  }

  if (!apply) {
    console.log("  MISSING — would create with create/read/update for any");
    return;
  }

  await databases.createCollection(
    databaseId,
    BLOG_VIEWS,
    "Blog Views",
    [Permission.create(Role.any()), Permission.read(Role.any()), Permission.update(Role.any())],
    false,
    true,
  );
  console.log("  created with create/read/update for any");
}

async function ensureBlogViewsAttributes() {
  console.log(`\n── ${BLOG_VIEWS} attributes ──`);

  const collections = await databases.listCollections(databaseId);
  if (!collections.collections.some((c) => c.$id === BLOG_VIEWS)) {
    console.log("  collection does not exist yet — skipping (dry run)");
    return false;
  }

  const list = await databases.listAttributes(databaseId, BLOG_VIEWS);
  const existing = new Set(list.attributes.map((a) => a.key));

  const strings = [
    ["postId", 64, true],
    ["visitorId", 64, true],
    ["lastReadAt", 64, false],
  ];

  for (const [key, size, required] of strings) {
    if (existing.has(key)) {
      console.log(`  exists ${key}`);
      continue;
    }
    if (!apply) {
      console.log(`  MISSING ${key} — would create string(${size})${required ? ", required" : ""}`);
      continue;
    }
    await databases.createStringAttribute(databaseId, BLOG_VIEWS, key, size, required);
    console.log(`  created ${key}`);
  }

  if (existing.has("reads")) {
    console.log("  exists reads");
  } else if (!apply) {
    console.log("  MISSING reads — would create integer, optional, default 1");
  } else {
    await databases.createIntegerAttribute(databaseId, BLOG_VIEWS, "reads", false, 0, undefined, 1);
    console.log("  created reads");
  }

  if (!apply) return false;

  for (const key of ["postId", "visitorId", "lastReadAt", "reads"]) {
    await waitForAttribute(BLOG_VIEWS, key);
  }
  console.log("  all attributes available");
  return true;
}

async function ensureBlogViewsIndexes() {
  console.log(`\n── ${BLOG_VIEWS} indexes ──`);

  // Every read path filters on postId, and recording a view filters on both
  // keys — unindexed, those queries degrade as the collection grows.
  const wanted = [
    ["postId_idx", IndexType.Key, ["postId"]],
    ["post_visitor_idx", IndexType.Key, ["postId", "visitorId"]],
  ];

  if (!apply) {
    wanted.forEach(([key, , attrs]) => console.log(`  would ensure ${key} on ${attrs.join(", ")}`));
    return;
  }

  const list = await databases.listIndexes(databaseId, BLOG_VIEWS);
  const existing = new Set(list.indexes.map((i) => i.key));

  for (const [key, type, attributes] of wanted) {
    if (existing.has(key)) {
      console.log(`  exists ${key}`);
      continue;
    }
    await databases.createIndex(databaseId, BLOG_VIEWS, key, type, attributes);
    console.log(`  created ${key} on ${attributes.join(", ")}`);
  }
}

async function main() {
  console.log(`Project ${projectId} · database ${databaseId}`);
  console.log(apply ? "Mode: APPLY" : "Mode: dry run (pass --apply to make changes)");

  await ensureCertificationType();
  await ensureBlogViewsCollection();
  const ready = await ensureBlogViewsAttributes();
  if (ready || !apply) await ensureBlogViewsIndexes();

  console.log(apply ? "\nDone." : "\nDry run complete. Re-run with --apply.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
