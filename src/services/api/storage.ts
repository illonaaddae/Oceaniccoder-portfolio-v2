import { storage, STORAGE_BUCKET_ID, ID } from "./client";

export interface StorageStats {
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  usedPercentage: number;
  maxStorageMB: number;
}

const DEFAULT_STATS: StorageStats = {
  totalFiles: 0,
  totalSizeBytes: 0,
  totalSizeMB: 0,
  usedPercentage: 0,
  maxStorageMB: 2048,
};

export async function getStorageStats(): Promise<StorageStats> {
  try {
    const response = await storage.listFiles(STORAGE_BUCKET_ID);
    let totalSizeBytes = 0;
    for (const file of response.files) {
      totalSizeBytes += file.sizeOriginal || 0;
    }
    const totalSizeMB = totalSizeBytes / (1024 * 1024);
    const maxStorageMB = 2048;
    const usedPercentage = Math.min((totalSizeMB / maxStorageMB) * 100, 100);
    return {
      totalFiles: response.total,
      totalSizeBytes,
      totalSizeMB: Math.round(totalSizeMB * 100) / 100,
      usedPercentage: Math.round(usedPercentage * 10) / 10,
      maxStorageMB,
    };
  } catch {
    return DEFAULT_STATS;
  }
}

export async function uploadImage(file: File): Promise<string> {
  try {
    const response = await storage.createFile(STORAGE_BUCKET_ID, ID.unique(), file);
    return storage.getFileView(STORAGE_BUCKET_ID, response.$id).toString();
  } catch (error: unknown) {
    const err = error as { code?: number };
    if (err.code === 401) {
      throw new Error("Storage permission denied. Check bucket permissions.");
    }
    if (err.code === 404) {
      throw new Error("Storage bucket not found. Verify STORAGE_BUCKET_ID.");
    }
    throw error;
  }
}

// Upload a video file (MP4/WebM/Ogg) to the same storage bucket as images.
// Used for project demo videos so we can serve direct video instead of relying
// on YouTube embeds (which sometimes show a bot-check screen).
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB hard cap

export async function uploadVideo(file: File): Promise<string> {
  if (!/^video\/(mp4|webm|ogg)/i.test(file.type)) {
    throw new Error("Unsupported video format. Use MP4, WebM, or Ogg.");
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(`Video too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 50 MB.`);
  }
  try {
    const response = await storage.createFile(STORAGE_BUCKET_ID, ID.unique(), file);
    return storage.getFileView(STORAGE_BUCKET_ID, response.$id).toString();
  } catch (error: unknown) {
    const err = error as { code?: number };
    if (err.code === 401) throw new Error("Storage permission denied.");
    if (err.code === 404) throw new Error("Storage bucket not found.");
    throw error;
  }
}

export async function deleteImage(fileId: string): Promise<void> {
  await storage.deleteFile(STORAGE_BUCKET_ID, fileId);
}

export function getFileIdFromUrl(url: string): string | null {
  try {
    const match = url.match(/\/files\/([^/]+)\/view/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export function getImagePreviewUrl(fileId: string, width?: number, height?: number): string {
  return storage.getFilePreview(STORAGE_BUCKET_ID, fileId, width, height).toString();
}
