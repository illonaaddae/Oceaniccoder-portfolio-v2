// Media storage on Azure Blob, shared by the /api/media function and
// scripts/migrate-storage-to-blob.mjs so both name and resize files the same
// way. This folder has no function.json, so the Functions host never exposes
// it as an endpoint.
//
// Layout in the `media` container (anonymous read for single blobs, no
// listing):
//
//   <fileId>/<slug>.<ext>   the original, exactly as uploaded
//   <fileId>/w480.webp      resized copies, raster images only, so pages can
//   <fileId>/w960.webp      load a few dozen KB instead of a multi-MB PNG
//   <fileId>/w1600.webp
//
// Every size is always written, even for an image narrower than it (sharp
// doesn't enlarge, so the copy just stays at the original width). That way the
// browser can build any variant URL without knowing which ones exist.

const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");
const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} = require("@azure/storage-blob");

const VARIANT_WIDTHS = [480, 960, 1600];
const VARIANT_QUALITY = 80;
const CACHE_CONTROL = "public, max-age=31536000, immutable";

// What the dashboard may upload, with a size cap per kind. The SAS URL can't
// limit size, so the cap is checked after upload and an oversized file is
// deleted again. HEIC is left out on purpose: only Safari can display it, and
// the prebuilt sharp can't decode it to make the WebP copies.
const ALLOWED_TYPES = {
  "image/jpeg": 15 * 1024 * 1024,
  "image/png": 15 * 1024 * 1024,
  "image/webp": 15 * 1024 * 1024,
  "image/gif": 15 * 1024 * 1024,
  "image/avif": 15 * 1024 * 1024,
  "image/svg+xml": 2 * 1024 * 1024,
  "application/pdf": 20 * 1024 * 1024,
  "video/mp4": 50 * 1024 * 1024,
  "video/webm": 50 * 1024 * 1024,
  "video/ogg": 50 * 1024 * 1024,
};

// SVG is left as is (it's already small and resizing would rasterise it);
// everything else that's an image gets WebP copies.
const RASTER_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

const VARIANT_NAME = /^w\d+\.webp$/;

function getConfig() {
  const account = process.env.AZURE_STORAGE_ACCOUNT || "oceaniccodermedia";
  const key = process.env.AZURE_STORAGE_KEY;
  const container = process.env.AZURE_STORAGE_CONTAINER || "media";
  if (!key) throw new Error("AZURE_STORAGE_KEY is not configured");
  return { account, key, container };
}

function getContainer() {
  const { account, key, container } = getConfig();
  const credential = new StorageSharedKeyCredential(account, key);
  const service = new BlobServiceClient(`https://${account}.blob.core.windows.net`, credential);
  return { container: service.getContainerClient(container), credential };
}

/** 20 hex chars, the same shape as an Appwrite file id. */
function newFileId() {
  return crypto.randomBytes(10).toString("hex");
}

/**
 * Lowercase, URL-safe file name that keeps its extension, so links stay
 * readable and never need percent-encoding ("Best Student (2).PNG" →
 * "best-student-2.png").
 */
function slugifyFileName(name, fallback) {
  const base = path.basename(String(name || ""));
  const rawExt = path.extname(base);
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9.]/g, "");
  const stem = base
    .slice(0, base.length - rawExt.length)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${stem || fallback}${ext}`;
}

/** "<fileId>/<slug>" names only; anything else is refused. */
function parseBlobName(blobName) {
  const match = /^([a-f0-9]{20})\/([a-z0-9][a-z0-9.-]*)$/.exec(String(blobName || ""));
  if (!match || VARIANT_NAME.test(match[2])) return null;
  return { fileId: match[1], fileName: match[2] };
}

/** A write-only URL for one new blob, valid for ten minutes. */
function createUploadUrl(blobName, contentType) {
  const { container, credential } = getContainer();
  const blob = container.getBlockBlobClient(blobName);
  const sas = generateBlobSASQueryParameters(
    {
      containerName: container.containerName,
      blobName,
      // create + write only: the URL can't read, list, or overwrite another blob.
      permissions: BlobSASPermissions.parse("cw"),
      startsOn: new Date(Date.now() - 60 * 1000),
      expiresOn: new Date(Date.now() + 10 * 60 * 1000),
      contentType,
    },
    credential,
  ).toString();
  return { uploadUrl: `${blob.url}?${sas}`, url: blob.url };
}

/**
 * Writes the WebP copies for one raster image. `source` is the original as a
 * Buffer. Returns the variant URLs keyed by width.
 */
async function writeVariants(container, fileId, source) {
  const variants = {};
  for (const width of VARIANT_WIDTHS) {
    const data = await sharp(source, { animated: false, failOn: "none" })
      .rotate() // apply the EXIF orientation before it's stripped
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: VARIANT_QUALITY })
      .toBuffer();
    const blob = container.getBlockBlobClient(`${fileId}/w${width}.webp`);
    await blob.uploadData(data, {
      blobHTTPHeaders: { blobContentType: "image/webp", blobCacheControl: CACHE_CONTROL },
    });
    variants[width] = blob.url;
  }
  return variants;
}

/**
 * Checks a freshly uploaded original and, for raster images, writes its
 * resized copies. Deletes the upload and throws when it breaks the type or
 * size rules, since the SAS URL couldn't enforce them.
 */
async function completeUpload(blobName) {
  const parsed = parseBlobName(blobName);
  if (!parsed) throw Object.assign(new Error("Invalid blob name"), { status: 400 });

  const { container } = getContainer();
  const blob = container.getBlockBlobClient(blobName);
  const props = await blob.getProperties().catch(() => null);
  if (!props) throw Object.assign(new Error("Upload not found"), { status: 404 });

  const contentType = props.contentType || "";
  const limit = ALLOWED_TYPES[contentType];
  if (!limit || props.contentLength > limit) {
    await blob.deleteIfExists();
    let message = `Unsupported file type: ${contentType || "unknown"}`;
    if (limit) {
      message = `File too large (${(props.contentLength / 1024 / 1024).toFixed(1)} MB). Max ${limit / 1024 / 1024} MB.`;
    } else if (/^image\/hei[cf]$/.test(contentType)) {
      message = "HEIC photos aren't supported. Export it as JPEG or WebP and upload again.";
    }
    throw Object.assign(new Error(message), { status: 400 });
  }

  // Uploads are immutable, so give the original the same long cache the
  // migrated files have.
  await blob.setHTTPHeaders({ blobContentType: contentType, blobCacheControl: CACHE_CONTROL });

  let variants = {};
  if (RASTER_TYPES.has(contentType)) {
    try {
      variants = await writeVariants(container, parsed.fileId, await blob.downloadToBuffer());
    } catch (error) {
      // Pages build w480/w960/w1600 URLs for every raster image, so an image
      // without its copies would show as broken. Remove it and say why.
      await deleteFile(parsed.fileId);
      throw Object.assign(new Error(`Couldn't process this image: ${error.message}`), {
        status: 400,
      });
    }
  }
  return { fileId: parsed.fileId, url: blob.url, contentType, size: props.contentLength, variants };
}

/** Every original in the container (variants are folded into their original). */
async function listFiles() {
  const { container } = getContainer();
  const files = new Map();
  for await (const item of container.listBlobsFlat()) {
    const [fileId, name] = item.name.split("/");
    if (!fileId || !name) continue;
    const entry = files.get(fileId) || { fileId, name: null, url: null, size: 0, variantBytes: 0 };
    if (VARIANT_NAME.test(name)) {
      entry.variantBytes += item.properties.contentLength || 0;
    } else {
      entry.name = name;
      entry.url = container.getBlockBlobClient(item.name).url;
      entry.size = item.properties.contentLength || 0;
      entry.contentType = item.properties.contentType;
      entry.createdAt = item.properties.createdOn;
    }
    files.set(fileId, entry);
  }
  return [...files.values()].filter((f) => f.name);
}

/** Deletes an original and all of its resized copies. */
async function deleteFile(fileId) {
  if (!/^[a-f0-9]{20}$/.test(String(fileId || ""))) {
    throw Object.assign(new Error("Invalid file id"), { status: 400 });
  }
  const { container } = getContainer();
  let deleted = 0;
  for await (const item of container.listBlobsFlat({ prefix: `${fileId}/` })) {
    await container.getBlockBlobClient(item.name).deleteIfExists();
    deleted += 1;
  }
  return deleted;
}

module.exports = {
  VARIANT_WIDTHS,
  CACHE_CONTROL,
  ALLOWED_TYPES,
  RASTER_TYPES,
  getContainer,
  newFileId,
  slugifyFileName,
  parseBlobName,
  createUploadUrl,
  writeVariants,
  completeUpload,
  listFiles,
  deleteFile,
};
