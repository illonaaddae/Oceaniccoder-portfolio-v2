// Copies every file from an Appwrite backup into Azure Blob Storage and makes
// the resized WebP copies the site serves instead of the originals.
//
// Why this exists: the Appwrite project is deleted when the student
// organization it lives in expires, and with it every image, certificate and
// video the site links to. This moves those files to the `media` container of
// the `oceaniccodermedia` storage account (anonymous read for single blobs, no
// container listing), which is where the site serves them from afterwards.
//
// Appwrite resized images on request (/preview?width=…); Blob can't, and some
// originals are 2–3 MB PNGs. So every raster image also gets w480/w960/w1600
// WebP copies, made by the same code the /api/media function runs on new
// uploads (api/shared/media.js), so old and new files look alike.
//
// It reads the files from a backup made by scripts/backup-appwrite.mjs, so it
// never talks to Appwrite. Each file becomes
//
//   media/<appwriteFileId>/<slugified-original-name>
//   media/<appwriteFileId>/w480.webp, w960.webp, w1600.webp   (raster images)
//
// Keeping the Appwrite file id in the path keeps every name unique and makes
// the old and new URLs easy to match; keeping the extension lets the video
// detection in the app recognise .mp4/.webm/.ogg links.
//
// It also writes <backup>/blob-map.json, mapping each Appwrite file id to its
// blob URL. The URL rewrite (rows in the database and links in src/) reads it.
//
// Re-running skips originals that already exist with the right size and
// images whose copies are already there.
//
// Usage (needs `npm install` in api/ first, for sharp and the Blob SDK):
//   AZURE_STORAGE_KEY=... node scripts/migrate-storage-to-blob.mjs
//   AZURE_STORAGE_KEY=... node scripts/migrate-storage-to-blob.mjs --backup backup/2026-10-02
//
// Get the key with:
//   az storage account keys list -n oceaniccodermedia -g oceaniccoder-portfolio \
//     --subscription <SLINT Tech subscription> --query "[0].value" -o tsv

import { readdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const media = require("../api/shared/media.js");

if (!process.env.AZURE_STORAGE_KEY) {
  console.error("AZURE_STORAGE_KEY is required");
  process.exit(1);
}

/** The newest backup/<date> folder, unless --backup says otherwise. */
async function resolveBackupDir() {
  const flag = process.argv.indexOf("--backup");
  if (flag !== -1 && process.argv[flag + 1]) return path.resolve(process.argv[flag + 1]);
  const dates = (await readdir("backup")).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if (dates.length === 0) throw new Error("no backup/<date> folder; run backup-appwrite.mjs first");
  return path.resolve("backup", dates[dates.length - 1]);
}

const backupDir = await resolveBackupDir();
const storageRoot = path.join(backupDir, "storage");
const buckets = await readdir(storageRoot);
const { container } = media.getContainer();
const largestWidth = media.VARIANT_WIDTHS[media.VARIANT_WIDTHS.length - 1];

console.log(`Uploading ${backupDir} → ${container.url}`);

const map = {};
const errors = [];
const counts = { uploaded: 0, skipped: 0, resized: 0, resizeSkipped: 0, total: 0 };

for (const bucketId of buckets) {
  const { files } = JSON.parse(
    await readFile(path.join(storageRoot, bucketId, "files.json"), "utf8"),
  );
  counts.total += files.length;

  for (const [index, file] of files.entries()) {
    process.stdout.write(`\r  ${index + 1}/${files.length}`);
    const [localName] = await readdir(path.join(storageRoot, bucketId, file.$id));
    const localPath = path.join(storageRoot, bucketId, file.$id, localName);
    const blobName = `${file.$id}/${media.slugifyFileName(file.name, file.$id)}`;
    const blob = container.getBlockBlobClient(blobName);

    try {
      const existing = await blob.getProperties().catch(() => null);
      if (existing?.contentLength === file.sizeOriginal) {
        counts.skipped += 1;
      } else {
        await blob.uploadFile(localPath, {
          blobHTTPHeaders: {
            blobContentType: file.mimeType || "application/octet-stream",
            blobCacheControl: media.CACHE_CONTROL,
          },
        });
        counts.uploaded += 1;
      }
    } catch (error) {
      errors.push(`${file.$id} (${file.name}): upload failed: ${error.message}`);
      continue;
    }

    let variants = false;
    if (media.RASTER_TYPES.has(file.mimeType)) {
      const last = container.getBlockBlobClient(`${file.$id}/w${largestWidth}.webp`);
      if (await last.exists()) {
        counts.resizeSkipped += 1;
        variants = true;
      } else {
        try {
          await media.writeVariants(container, file.$id, await readFile(localPath));
          counts.resized += 1;
          variants = true;
        } catch (error) {
          errors.push(`${file.$id} (${file.name}): resize failed: ${error.message}`);
        }
      }
    }

    map[file.$id] = { url: blob.url, name: file.name, mimeType: file.mimeType, bucketId, variants };
  }
}

await writeFile(path.join(backupDir, "blob-map.json"), JSON.stringify(map, null, 2));

console.log(
  `\r  ${Object.keys(map).length}/${counts.total} originals in Blob ` +
    `(${counts.uploaded} uploaded, ${counts.skipped} already there)`,
);
console.log(
  `  ${counts.resized + counts.resizeSkipped} images with resized copies ` +
    `(${counts.resized} made now, ${counts.resizeSkipped} already there)`,
);
console.log(`Map written to ${path.join(backupDir, "blob-map.json")}`);

if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
