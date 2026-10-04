// Media storage on Azure Blob, through the admin-only /api/media function
// (api/media/index.js).
//
// An upload is three steps, so large files never pass through a function:
//   1. /api/media/upload-url hands back a write-only SAS URL for one new blob;
//   2. the browser PUTs the file straight to Blob with it;
//   3. /api/media/complete checks type and size and, for images, writes the
//      resized WebP copies the site actually serves (see utils/imageOptimizer).
//
// Every call carries a short-lived Appwrite JWT, which the function checks
// against the admin account.
import { adminHeaders } from "./adminHeaders";
import { apiUrl } from "@/utils/apiUrl";
import { getFileIdFromUrl as getMediaFileId } from "@/utils/imageOptimizer";

export interface StorageStats {
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  usedPercentage: number;
  maxStorageMB: number;
}

/** One original in the media container, as /api/media lists it. */
export interface MediaFile {
  fileId: string;
  name: string;
  url: string;
  size: number;
  /** Bytes taken by the resized copies, on top of `size`. */
  variantBytes: number;
  contentType?: string;
  createdAt?: string;
}

// The Storage Usage ring was sized for the Appwrite free bucket. Blob has no
// such cap; 2 GB is kept as a budget so the ring still means something.
const MAX_STORAGE_MB = 2048;

const DEFAULT_STATS: StorageStats = {
  totalFiles: 0,
  totalSizeBytes: 0,
  totalSizeMB: 0,
  usedPercentage: 0,
  maxStorageMB: MAX_STORAGE_MB,
};

const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // matches api/shared/media.js

async function mediaRequest<T>(
  path: string,
  init: { method?: string; body?: string; headers?: Record<string, string> } = {},
): Promise<T> {
  const res = await fetch(apiUrl(`/api/media${path}`), {
    ...init,
    headers: { ...(await adminHeaders()), ...(init.headers || {}) },
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error || `Media request failed (${res.status})`);
  return body;
}

async function uploadFile(file: File): Promise<string> {
  const { blobName, uploadUrl } = await mediaRequest<{ blobName: string; uploadUrl: string }>(
    "/upload-url",
    { method: "POST", body: JSON.stringify({ fileName: file.name, contentType: file.type }) },
  );

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "x-ms-blob-type": "BlockBlob", "Content-Type": file.type },
    body: file,
  });
  if (!put.ok) throw new Error(`Upload to storage failed (${put.status})`);

  const done = await mediaRequest<{ url: string }>("/complete", {
    method: "POST",
    body: JSON.stringify({ blobName }),
  });
  return done.url;
}

export async function listMediaFiles(): Promise<MediaFile[]> {
  const { files } = await mediaRequest<{ files: MediaFile[] }>("");
  return files;
}

export async function getStorageStats(): Promise<StorageStats> {
  try {
    const { totalFiles, totalBytes } = await mediaRequest<{
      totalFiles: number;
      totalBytes: number;
    }>("");
    const totalSizeMB = totalBytes / (1024 * 1024);
    return {
      totalFiles,
      totalSizeBytes: totalBytes,
      totalSizeMB: Math.round(totalSizeMB * 100) / 100,
      usedPercentage: Math.round(Math.min((totalSizeMB / MAX_STORAGE_MB) * 100, 100) * 10) / 10,
      maxStorageMB: MAX_STORAGE_MB,
    };
  } catch {
    // The public read-only /dashboard has no admin session; show an empty ring there.
    return DEFAULT_STATS;
  }
}

export async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
    throw new Error("Unsupported file type. Use an image or a PDF.");
  }
  return uploadFile(file);
}

// Project demo videos are served as files instead of YouTube embeds, which
// sometimes show a bot-check screen.
export async function uploadVideo(file: File): Promise<string> {
  if (!/^video\/(mp4|webm|ogg)/i.test(file.type)) {
    throw new Error("Unsupported video format. Use MP4, WebM, or Ogg.");
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(`Video too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 50 MB.`);
  }
  return uploadFile(file);
}

/** Deletes a file and its resized copies. */
export async function deleteImage(fileId: string): Promise<void> {
  await mediaRequest(`?fileId=${encodeURIComponent(fileId)}`, { method: "DELETE" });
}

export function getFileIdFromUrl(url: string): string | null {
  return getMediaFileId(url);
}
