import React, { useState, useEffect, useCallback } from "react";
import { FaTrash, FaSync, FaExclamationTriangle, FaCheckCircle, FaImage } from "react-icons/fa";
import { Query } from "appwrite";
import { storage, STORAGE_BUCKET_ID, databases, DATABASE_ID } from "@/lib/appwrite";
import { deleteImage, getFileIdFromUrl } from "@/services/api/storage";
import { ImageUpload } from "@/components/AdminDashboard/ImageUpload";

interface StorageFile {
  $id: string;
  name: string;
  sizeOriginal: number;
  mimeType: string;
  $createdAt: string;
  url: string;
  isOrphan: boolean;
  usedIn: string[];
}

interface PlatformLogoEntry {
  name: string;
  fileId: string | null;
  currentUrl: string | null;
}

const COLLECTIONS = [
  { id: "projects", fields: ["image", "screenshots"] },
  { id: "certifications", fields: ["image", "platformIconUrl"] },
  { id: "education", fields: ["universityLogo", "logo"] },
  { id: "about", fields: ["profileImage", "resumeUrl"] },
  { id: "gallery", fields: ["src"] },
  { id: "blog_posts", fields: ["image"] },
  { id: "journey", fields: ["logo"] },
  { id: "testimonials", fields: ["image"] },
  { id: "skills", fields: ["icon"] },
];

const BUCKET_BASE = `https://fra.cloud.appwrite.io/v1/storage/buckets/${STORAGE_BUCKET_ID}/files`;

const PLATFORM_LOGOS: PlatformLogoEntry[] = [
  { name: "Coursera", fileId: "69444cf7002630d6e37f", currentUrl: null },
  { name: "Codecademy", fileId: "69444cf9000034490b06", currentUrl: null },
  { name: "Scrimba", fileId: "69444cfa002656e07bf5", currentUrl: null },
  { name: "AWS", fileId: "69444cf8000fb4abc729", currentUrl: null },
  { name: "Frontend Masters", fileId: "69444cf90028bcba5187", currentUrl: null },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface StorageCleanupTabProps {
  theme: "light" | "dark";
}

export const StorageCleanupTab: React.FC<StorageCleanupTabProps> = ({ theme }) => {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [platformLogos, setPlatformLogos] = useState<PlatformLogoEntry[]>(PLATFORM_LOGOS);
  const [replacingLogo, setReplacingLogo] = useState<string | null>(null);

  const card =
    theme === "dark" ? "bg-gray-800/60 border border-gray-700" : "bg-white border border-gray-200";
  const text = theme === "dark" ? "text-white" : "text-slate-900";
  const sub = theme === "dark" ? "text-slate-400" : "text-slate-500";
  const badge = (orphan: boolean) =>
    orphan
      ? "bg-red-500/20 text-red-400 border border-red-500/30"
      : "bg-green-500/20 text-green-400 border border-green-500/30";

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const collectAllUrls = useCallback(async (): Promise<Set<string>> => {
    const urls = new Set<string>();
    await Promise.allSettled(
      COLLECTIONS.map(async ({ id, fields }) => {
        try {
          const res = await databases.listDocuments(DATABASE_ID, id, [Query.limit(500)]);
          for (const doc of res.documents) {
            for (const field of fields) {
              const val = doc[field];
              if (!val) continue;
              if (Array.isArray(val)) {
                val.forEach((v: string) => v && urls.add(v));
              } else {
                urls.add(String(val));
              }
            }
          }
        } catch {
          // collection may not exist or have no docs — skip
        }
      }),
    );
    return urls;
  }, []);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [filesRes, referencedUrls] = await Promise.all([
        storage.listFiles(STORAGE_BUCKET_ID, [Query.limit(500)]),
        collectAllUrls(),
      ]);

      const mapped: StorageFile[] = filesRes.files.map((f) => {
        const url = `${BUCKET_BASE}/${f.$id}/view?project=${import.meta.env.VITE_APPWRITE_PROJECT_ID}`;
        const usedIn: string[] = [];
        let isOrphan = true;

        for (const refUrl of referencedUrls) {
          if (refUrl.includes(f.$id)) {
            isOrphan = false;
            const collMatch = COLLECTIONS.find(({ id }) => refUrl.includes(id));
            if (collMatch && !usedIn.includes(collMatch.id)) usedIn.push(collMatch.id);
          }
        }

        // Platform logos are always "in use" even if not in a collection doc
        const isPlatformLogo = PLATFORM_LOGOS.some((p) => p.fileId === f.$id);
        if (isPlatformLogo) {
          isOrphan = false;
          usedIn.push("platform-logo");
        }

        return {
          $id: f.$id,
          name: f.name,
          sizeOriginal: f.sizeOriginal,
          mimeType: f.mimeType,
          $createdAt: f.$createdAt,
          url,
          isOrphan,
          usedIn,
        };
      });

      mapped.sort((a, b) => (a.isOrphan === b.isOrphan ? 0 : a.isOrphan ? -1 : 1));
      setFiles(mapped);

      // Populate platform logo current URLs
      setPlatformLogos(
        PLATFORM_LOGOS.map((p) => ({
          ...p,
          currentUrl: p.fileId
            ? `${BUCKET_BASE}/${p.fileId}/view?project=${import.meta.env.VITE_APPWRITE_PROJECT_ID}`
            : null,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load storage files");
    } finally {
      setLoading(false);
    }
  }, [collectAllUrls]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!window.confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    setDeleting(fileId);
    try {
      await deleteImage(fileId);
      setFiles((prev) => prev.filter((f) => f.$id !== fileId));
      showSuccess(`Deleted "${fileName}"`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  const handleReplaceLogo = async (platformName: string, newFileUrl: string) => {
    // newFileUrl is already uploaded by ImageUpload — extract fileId and update platformLogos state
    const newFileId = getFileIdFromUrl(newFileUrl);
    setPlatformLogos((prev) =>
      prev.map((p) =>
        p.name === platformName ? { ...p, currentUrl: newFileUrl, fileId: newFileId } : p,
      ),
    );
    setReplacingLogo(null);
    showSuccess(`${platformName} logo updated — deploy to apply changes`);
    // Reload file list to reflect new file
    await loadFiles();
  };

  const orphans = files.filter((f) => f.isOrphan);
  const inUse = files.filter((f) => !f.isOrphan);
  const orphanSize = orphans.reduce((s, f) => s + f.sizeOriginal, 0);

  const sectionHeader = `text-lg font-bold mb-4 ${text}`;
  const subText = `text-sm ${sub}`;

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${text}`}>Storage Cleanup</h2>
          <p className={subText}>
            {files.length} files · {orphans.length} orphaned · {formatBytes(orphanSize)} reclaimable
          </p>
        </div>
        <button
          onClick={loadFiles}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-oceanic-600 text-white text-sm font-medium hover:bg-oceanic-500 transition-colors disabled:opacity-50"
        >
          <FaSync className={loading ? "animate-spin" : ""} />
          {loading ? "Scanning…" : "Refresh"}
        </button>
      </div>

      {/* Toast messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-sm">
          <FaExclamationTriangle /> {error}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/20 text-green-400 border border-green-500/30 text-sm">
          <FaCheckCircle /> {successMsg}
        </div>
      )}

      {/* Platform Logos Manager */}
      <div className={`rounded-2xl p-6 ${card}`}>
        <h3 className={sectionHeader}>Platform Logos</h3>
        <p className={`${subText} mb-4`}>
          Replace logos shown on certification cards. Upload any PNG, JPG, or SVG.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {platformLogos.map((p) => (
            <div
              key={p.name}
              className={`rounded-xl p-4 space-y-3 ${theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"}`}
            >
              <div className="flex items-center gap-3">
                {p.currentUrl ? (
                  <img
                    src={p.currentUrl}
                    alt={p.name}
                    className="w-8 h-8 object-contain rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-gray-600 flex items-center justify-center">
                    <FaImage className="text-gray-400 w-4 h-4" />
                  </div>
                )}
                <span className={`font-medium text-sm ${text}`}>{p.name}</span>
              </div>
              {replacingLogo === p.name ? (
                <div>
                  <ImageUpload
                    value=""
                    onChange={(url) => handleReplaceLogo(p.name, url)}
                    label={`${p.name} logo`}
                    theme={theme}
                    maxSizeMB={2}
                    accept="image/*"
                  />
                  <button
                    onClick={() => setReplacingLogo(null)}
                    className={`text-xs mt-2 ${sub} hover:text-red-400`}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setReplacingLogo(p.name)}
                  className="w-full text-xs py-1.5 px-3 rounded-lg border border-oceanic-500/40 text-oceanic-400 hover:bg-oceanic-500/10 transition-colors"
                >
                  Replace Logo
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Orphaned Files */}
      <div className={`rounded-2xl p-6 ${card}`}>
        <h3 className={sectionHeader}>
          Orphaned Files{" "}
          {orphans.length > 0 && (
            <span className="text-sm font-normal text-red-400 ml-2">
              ({orphans.length} · {formatBytes(orphanSize)})
            </span>
          )}
        </h3>
        {loading ? (
          <p className={subText}>Scanning…</p>
        ) : orphans.length === 0 ? (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <FaCheckCircle /> No orphaned files — storage is clean.
          </div>
        ) : (
          <div className="space-y-2">
            {orphans.map((f) => (
              <div
                key={f.$id}
                className={`flex items-center gap-3 p-3 rounded-xl ${theme === "dark" ? "bg-gray-700/40" : "bg-gray-50"}`}
              >
                {f.mimeType.startsWith("image/") ? (
                  <img
                    src={f.url}
                    alt={f.name}
                    className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-600 flex items-center justify-center flex-shrink-0">
                    <FaImage className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${text}`}>{f.name}</p>
                  <p className={`text-xs ${sub}`}>
                    {formatBytes(f.sizeOriginal)} · {f.mimeType}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${badge(true)}`}>Orphan</span>
                <button
                  onClick={() => handleDelete(f.$id, f.name)}
                  disabled={deleting === f.$id}
                  className="flex-shrink-0 p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  title="Delete file"
                >
                  {deleting === f.$id ? (
                    <FaSync className="animate-spin w-4 h-4" />
                  ) : (
                    <FaTrash className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* In-Use Files */}
      <div className={`rounded-2xl p-6 ${card}`}>
        <h3 className={sectionHeader}>In-Use Files ({inUse.length})</h3>
        <p className={`${subText} mb-4`}>These are referenced by your database. Safe to keep.</p>
        {loading ? (
          <p className={subText}>Loading…</p>
        ) : (
          <div className="space-y-2">
            {inUse.map((f) => (
              <div
                key={f.$id}
                className={`flex items-center gap-3 p-3 rounded-xl ${theme === "dark" ? "bg-gray-700/20" : "bg-gray-50"}`}
              >
                {f.mimeType.startsWith("image/") || f.mimeType === "application/pdf" ? (
                  <img
                    src={f.mimeType.startsWith("image/") ? f.url : ""}
                    alt={f.name}
                    className="w-10 h-10 object-cover rounded-lg flex-shrink-0 bg-gray-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-600 flex items-center justify-center flex-shrink-0">
                    <FaImage className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${text}`}>{f.name}</p>
                  <p className={`text-xs ${sub}`}>
                    {formatBytes(f.sizeOriginal)} · used in: {f.usedIn.join(", ")}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${badge(false)}`}>In use</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StorageCleanupTab;
