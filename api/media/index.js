// Admin media endpoint: uploads, resizing, listing and deletes for the files
// the site serves from Azure Blob (see api/shared/media.js for the layout).
//
//   POST   /api/media/upload-url  { fileName, contentType }
//          → { blobName, uploadUrl, url }   write-only SAS URL, 10 minutes
//   POST   /api/media/complete    { blobName }
//          → { fileId, url, contentType, size, variants }
//          Checks type and size, and writes the WebP copies for images.
//   GET    /api/media             → { files, totalFiles, totalBytes }
//   DELETE /api/media?fileId=…    → { deleted }
//
// Files go browser → Blob directly with the SAS URL, so a 50 MB video never
// passes through this function (Static Web Apps functions cap request size
// and time). Only the resize runs here, reading the original back from Blob.
//
// Every route needs the admin's Appwrite JWT.

const { requireAdmin } = require("../shared/adminAuth");
const media = require("../shared/media");

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://oceaniccoder.dev";

const HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-appwrite-jwt",
  Vary: "Origin",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function reply(context, status, body) {
  context.res = { status, headers: HEADERS, body: JSON.stringify(body) };
}

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: HEADERS, body: "" };
    return;
  }

  const auth = await requireAdmin(context, req);
  if (!auth.user) {
    reply(context, auth.status, { error: auth.error });
    return;
  }

  const action = (context.bindingData && context.bindingData.action) || "";
  const body = req.body || {};

  try {
    if (req.method === "POST" && action === "upload-url") {
      const contentType = String(body.contentType || "");
      if (!media.ALLOWED_TYPES[contentType]) {
        reply(context, 400, {
          error: /^image\/hei[cf]$/.test(contentType)
            ? "HEIC photos aren't supported. Export it as JPEG or WebP and upload again."
            : `Unsupported file type: ${contentType || "unknown"}`,
        });
        return;
      }
      const fileId = media.newFileId();
      const blobName = `${fileId}/${media.slugifyFileName(body.fileName, fileId)}`;
      const { uploadUrl, url } = media.createUploadUrl(blobName, contentType);
      reply(context, 200, { blobName, uploadUrl, url });
      return;
    }

    if (req.method === "POST" && action === "complete") {
      reply(context, 200, await media.completeUpload(body.blobName));
      return;
    }

    if (req.method === "GET" && !action) {
      const files = await media.listFiles();
      const totalBytes = files.reduce((sum, f) => sum + f.size + f.variantBytes, 0);
      reply(context, 200, { files, totalFiles: files.length, totalBytes });
      return;
    }

    if (req.method === "DELETE" && !action) {
      const fileId = (req.query && req.query.fileId) || body.fileId;
      reply(context, 200, { deleted: await media.deleteFile(fileId) });
      return;
    }

    reply(context, 404, { error: "Unknown media route" });
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) context.log.error("media:", error);
    reply(context, status, { error: error.message || "Media request failed" });
  }
};
