import { useState, useEffect } from "react";
import { getStorageStats, type StorageStats } from "@/services/api";
import { StorageRing } from "./StorageRing";

interface StorageUsageProps {
  theme: "light" | "dark";
  onNavigateToTab?: (tab: string) => void;
}

export const StorageUsage: React.FC<StorageUsageProps> = ({
  theme,
  onNavigateToTab,
}) => {
  const [storageStats, setStorageStats] = useState<StorageStats>({
    totalFiles: 0,
    totalSizeBytes: 0,
    totalSizeMB: 0,
    usedPercentage: 0,
    maxStorageMB: 2048,
  });

  useEffect(() => {
    getStorageStats().then(setStorageStats);
  }, []);

  const sizeLabel =
    storageStats.totalSizeMB < 1024
      ? `${storageStats.totalSizeMB.toFixed(1)} MB`
      : `${(storageStats.totalSizeMB / 1024).toFixed(2)} GB`;

  return (
    <div
      className={`glass-card backdrop-blur-xl border rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-colors duration-300 ${
        theme === "dark"
          ? "bg-gradient-to-br from-white/8 to-white/4 border-white/20"
          : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
      }`}
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3
          className={`text-sm sm:text-base font-bold transition-colors duration-300 ${
            theme === "dark" ? "text-white/95" : "text-slate-900"
          }`}
        >
          Storage Usage
        </h3>
      </div>

      <StorageRing theme={theme} usedPercentage={storageStats.usedPercentage} />

      <p
        className={`text-center text-[10px] xs:text-xs sm:text-sm transition-colors duration-300 ${
          theme === "dark" ? "text-slate-200/90" : "text-slate-700"
        }`}
      >
        {sizeLabel} of {storageStats.maxStorageMB / 1024} GB used
      </p>
      <p
        className={`text-center text-[10px] sm:text-xs transition-colors duration-300 mb-3 sm:mb-4 ${
          theme === "dark" ? "text-slate-400" : "text-slate-600"
        }`}
      >
        {storageStats.totalFiles} files stored in your bucket
      </p>

      <button
        onClick={() => onNavigateToTab?.("gallery")}
        className={`w-full px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition duration-300 border ${
          theme === "dark"
            ? "bg-white/10 border-white/20 text-white hover:bg-white/15 hover:border-white/30"
            : "bg-white/30 border-blue-200/30 text-slate-900 hover:bg-white/40 hover:border-blue-200/40"
        }`}
      >
        Manage Storage
      </button>
    </div>
  );
};
