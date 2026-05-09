import React from "react";
import { FaFilePdf, FaTimes, FaExternalLinkAlt } from "react-icons/fa";

interface FilePreviewProps {
  value: string;
  isPdf: boolean;
  theme: "light" | "dark";
  allowPdf: boolean;
  onClear: () => void;
  onImageError: () => void;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  value,
  isPdf,
  theme,
  allowPdf,
  onClear,
  onImageError,
}) => (
  <div
    className={`mb-3 relative group rounded-lg border overflow-hidden ${
      theme === "dark" ? "border-gray-700" : "border-slate-300"
    }`}
  >
    {isPdf ? (
      <div
        className={`w-full h-40 flex flex-col items-center justify-center gap-3 ${
          theme === "dark" ? "bg-gray-800" : "bg-slate-100"
        }`}
      >
        <FaFilePdf
          className={`text-5xl ${
            theme === "dark" ? "text-red-400" : "text-red-500"
          }`}
        />
        <span
          className={`text-sm ${
            theme === "dark" ? "text-gray-300" : "text-slate-600"
          }`}
        >
          PDF Certificate
        </span>
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            theme === "dark"
              ? "bg-oceanic-500/20 text-oceanic-500 hover:bg-oceanic-500/30"
              : "bg-oceanic-100 text-oceanic-700 hover:bg-oceanic-200"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <FaExternalLinkAlt className="text-xs" />
          View PDF
        </a>
      </div>
    ) : (
      <img
        src={value}
        alt="Preview"
        className="w-full h-40 object-cover"
        onError={() => {
          if (allowPdf) {
            onImageError();
          }
        }}
      />
    )}

    <button
      type="button"
      onClick={onClear}
      className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
      title="Remove file"
    >
      <FaTimes className="w-3 h-3" />
    </button>
  </div>
);
