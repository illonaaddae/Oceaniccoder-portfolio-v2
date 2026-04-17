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
    const response = await storage.createFile(
      STORAGE_BUCKET_ID,
      ID.unique(),
      file,
    );
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

export function getImagePreviewUrl(
  fileId: string,
  width?: number,
  height?: number,
): string {
  return storage
    .getFilePreview(STORAGE_BUCKET_ID, fileId, width, height)
    .toString();
}
