// Takes a full backup of the Appwrite project onto this machine.
//
// Why this exists: the project lives in Appwrite's "GitHub Student
// Organization", which is deleted, together with Appwrite's own backups, when
// the education period ends. This copy is the only one that survives that, and
// it is the source the Azure migration imports from.
//
// What it writes, under backup/<YYYY-MM-DD>/:
//   db/<collection>.json        every document (row), paged so nothing is capped
//   schema.json                 database + each table's columns, indexes,
//                               permissions and rowSecurity
//   storage/<bucket>/files.json bucket settings and every file's metadata
//   storage/<bucket>/<fileId>/<name>
//                               the file itself
//   functions/<id>/function.json, variables.json (names only), source.tar.gz
//   users.json                  users without password hashes (Appwrite won't
//                               export usable passwords anyway)
//   manifest.json               counts per collection, bucket and function
//
// backup/ is git-ignored: it holds personal data from bookings, invoices,
// payments and messages. Copy it off this laptop once it finishes.
//
// Re-running with the same date skips files that are already downloaded with
// the right size, so an interrupted run can be resumed. Documents, schema and
// users are always fetched fresh.
//
// Usage:
//   APPWRITE_API_KEY=... node scripts/backup-appwrite.mjs
//   APPWRITE_API_KEY=... node scripts/backup-appwrite.mjs --out backup/before-cutover
//
// Needs a key with the read scopes: databases.read, tables.read, columns.read,
// indexes.read, rows.read, buckets.read, files.read, functions.read and
// users.read. The database step uses the TablesDB API because the console only
// offers the tables/rows scopes now; the older Databases API checks
// collections.read, which a key made today doesn't have. Create it in the Appwrite console under
// Overview > Integrations > API keys, and delete it when you're done.

import { mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  Client,
  TablesDB,
  Storage,
  Functions,
  Users,
  Query,
  DeploymentDownloadType,
} from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const projectId = process.env.APPWRITE_PROJECT_ID || "6943431e00253c8f9883";
const databaseId = process.env.APPWRITE_DATABASE_ID || "6943493400018e7c314c";
const apiKey = process.env.APPWRITE_API_KEY;

const PAGE_SIZE = 100;

if (!apiKey) {
  console.error("APPWRITE_API_KEY is required");
  process.exit(1);
}

const outFlag = process.argv.indexOf("--out");
const outDir =
  outFlag !== -1 && process.argv[outFlag + 1]
    ? path.resolve(process.argv[outFlag + 1])
    : path.resolve("backup", new Date().toISOString().slice(0, 10));

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const tablesDB = new TablesDB(client);
const storage = new Storage(client);
const functions = new Functions(client);
const users = new Users(client);

/** Failures are collected rather than thrown, so one bad file doesn't stop the rest. */
const errors = [];

async function writeJson(relativePath, data) {
  const file = path.join(outDir, relativePath);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2));
}

/**
 * Pages through any Appwrite list endpoint with a cursor. Offset paging gets
 * slow and can skip rows if something is written mid-run; a cursor on $id
 * doesn't.
 */
async function listAll(fetchPage, key) {
  const items = [];
  let cursor;
  for (;;) {
    const queries = [Query.limit(PAGE_SIZE), Query.orderAsc("$id")];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const page = await fetchPage(queries);
    items.push(...page[key]);
    if (page[key].length < PAGE_SIZE) return items;
    cursor = page[key][page[key].length - 1].$id;
  }
}

/** Keeps file names safe on disk without losing the extension. */
function safeName(name, fallback) {
  const cleaned = path.basename(name || "").replace(/[^\w.\- ]+/g, "_");
  return cleaned && cleaned !== "." && cleaned !== ".." ? cleaned : fallback;
}

async function sameSizeOnDisk(file, size) {
  try {
    return (await stat(file)).size === size;
  } catch {
    return false;
  }
}

async function backupDatabase(manifest) {
  console.log("\n── database ──");
  const database = await tablesDB.get(databaseId);
  const tables = await listAll((queries) => tablesDB.listTables(databaseId, queries), "tables");

  // The table objects already carry columns, indexes, $permissions and
  // rowSecurity, which is everything needed to recreate them.
  await writeJson("schema.json", { database, tables });

  manifest.collections = {};
  for (const table of tables) {
    try {
      const rows = await listAll(
        (queries) => tablesDB.listRows(databaseId, table.$id, queries),
        "rows",
      );
      await writeJson(path.join("db", `${table.$id}.json`), rows);
      manifest.collections[table.$id] = rows.length;
      console.log(`  ${table.$id.padEnd(24)} ${rows.length}`);
    } catch (error) {
      errors.push(`table ${table.$id}: ${error.message}`);
      console.error(`  ${table.$id.padEnd(24)} FAILED: ${error.message}`);
    }
  }
}

async function backupStorage(manifest) {
  console.log("\n── storage ──");
  const buckets = await listAll((queries) => storage.listBuckets(queries), "buckets");

  manifest.buckets = {};
  for (const bucket of buckets) {
    const files = await listAll((queries) => storage.listFiles(bucket.$id, queries), "files");
    await writeJson(path.join("storage", bucket.$id, "files.json"), { bucket, files });

    let downloaded = 0;
    let skipped = 0;
    for (const [index, file] of files.entries()) {
      const target = path.join(
        outDir,
        "storage",
        bucket.$id,
        file.$id,
        safeName(file.name, file.$id),
      );
      try {
        if (await sameSizeOnDisk(target, file.sizeOriginal)) {
          skipped += 1;
          continue;
        }
        const data = await storage.getFileDownload(bucket.$id, file.$id);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, Buffer.from(data));
        downloaded += 1;
        process.stdout.write(`\r  ${bucket.$id}: ${index + 1}/${files.length}`);
      } catch (error) {
        errors.push(`file ${bucket.$id}/${file.$id} (${file.name}): ${error.message}`);
      }
    }
    manifest.buckets[bucket.$id] = files.length;
    console.log(
      `\r  ${bucket.$id}: ${files.length} files (${downloaded} downloaded, ${skipped} already on disk)`,
    );
  }
}

async function backupFunctions(manifest) {
  console.log("\n── functions ──");
  const list = await listAll((queries) => functions.list(queries), "functions");

  manifest.functions = {};
  for (const fn of list) {
    const dir = path.join("functions", fn.$id);
    try {
      await writeJson(path.join(dir, "function.json"), fn);

      // Names only. The values are secrets and get set again in Azure.
      const { variables } = await functions.listVariables(fn.$id);
      await writeJson(
        path.join(dir, "variables.json"),
        variables.map(({ key, secret }) => ({ key, secret })),
      );

      const deploymentId = fn.deploymentId || fn.deployment;
      if (deploymentId) {
        const source = await functions.getDeploymentDownload(
          fn.$id,
          deploymentId,
          DeploymentDownloadType.Source,
        );
        await writeFile(path.join(outDir, dir, "source.tar.gz"), Buffer.from(source));
      } else {
        errors.push(`function ${fn.$id} (${fn.name}): no active deployment, source not saved`);
      }

      manifest.functions[fn.$id] = fn.name;
      console.log(`  ${fn.name} (${fn.$id}, ${fn.runtime})`);
    } catch (error) {
      errors.push(`function ${fn.$id} (${fn.name}): ${error.message}`);
      console.error(`  ${fn.name} FAILED: ${error.message}`);
    }
  }
}

async function backupUsers(manifest) {
  console.log("\n── users ──");
  const list = await listAll((queries) => users.list(queries), "users");
  const withoutSecrets = list.map(({ password, hash, hashOptions, ...user }) => user);
  await writeJson("users.json", withoutSecrets);
  manifest.users = list.length;
  console.log(`  ${list.length}`);
}

const manifest = {
  takenAt: new Date().toISOString(),
  endpoint,
  projectId,
  databaseId,
};

console.log(`Backing up Appwrite project ${projectId} to ${outDir}`);

for (const step of [backupDatabase, backupStorage, backupFunctions, backupUsers]) {
  try {
    await step(manifest);
  } catch (error) {
    errors.push(`${step.name}: ${error.message}`);
    console.error(`\n${step.name} FAILED: ${error.message}`);
  }
}

manifest.errors = errors;
await writeJson("manifest.json", manifest);

console.log(`\nManifest written to ${path.join(outDir, "manifest.json")}`);
console.log("Compare the counts above with the Appwrite console before relying on this backup.");

if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s):`);
  for (const error of errors) console.error(`  - ${error}`);
  console.error("\nRe-run to retry; files already downloaded are skipped.");
  process.exit(1);
}
