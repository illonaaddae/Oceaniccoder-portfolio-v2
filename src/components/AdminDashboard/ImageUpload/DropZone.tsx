import React from "react";
import { FaImage, FaFilePdf } from "react-icons/fa";

interface DropZoneProps {
  uploading: boolean;
  dragOver: boolean;
  theme: "light" | "dark";
  allowPdf: boolean;
  maxSizeMB: number;
  acceptTypes: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onClick: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({
  uploading,
  dragOver,
  theme,
  allowPdf,
  maxSizeMB,
  acceptTypes,
  fileInputRef,
  onClick,
  onDrop,
  onDragOver,
  onDragLeave,
  onInputChange,
}) => (
  <div
    onClick={onClick}
    onDrop={onDrop}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    className={`
      relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
      transition-colors duration-200
      ${
        dragOver
          ? theme === "dark"
            ? "border-oceanic-500 bg-oceanic-500/10"
            : "border-oceanic-500 bg-oceanic-50"
          : theme === "dark"
          ? "border-gray-700 hover:border-gray-600 hover:bg-gray-800/50"
          : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
      }
      ${uploading ? "pointer-events-none opacity-60" : ""}
    `}
  >
    <input
      ref={fileInputRef}
      type="file"
      accept={acceptTypes}
      onChange={onInputChange}
      className="hidden"
      aria-label={allowPdf ? "Upload image or PDF file" : "Upload image file"}
      title={allowPdf ? "Upload image or PDF file" : "Upload image file"}
    />

    {uploading ? (
      <div className="flex flex-col items-center gap-2">
        <svg
          className="w-8 h-8 text-oceanic-500 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span
          className={`text-sm ${
            theme === "dark" ? "text-gray-400" : "text-slate-500"
          }`}
        >
          Uploading...
        </span>
      </div>
    ) : (
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <FaImage
            className={`w-6 h-6 ${
              theme === "dark" ? "text-gray-500" : "text-slate-400"
            }`}
          />
          {allowPdf && (
            <FaFilePdf
              className={`w-6 h-6 ${
                theme === "dark" ? "text-gray-500" : "text-slate-400"
              }`}
            />
          )}
        </div>
        <div
          className={`text-sm ${
            theme === "dark" ? "text-gray-400" : "text-slate-500"
          }`}
        >
          <span className="text-oceanic-500 hover:text-oceanic-500 font-medium">
            Click to upload
          </span>{" "}
          or drag and drop
        </div>
        <p
          className={`text-xs ${
            theme === "dark" ? "text-gray-500" : "text-slate-400"
          }`}
        >
          {allowPdf
            ? `PNG, JPG, WebP, PDF up to ${maxSizeMB}MB`
            : `PNG, JPG, WebP up to ${maxSizeMB}MB`}
        </p>
      </div>
    )}
  </div>
);
