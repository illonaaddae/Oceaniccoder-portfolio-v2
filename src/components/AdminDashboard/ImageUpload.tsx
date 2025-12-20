import React, { useState, useRef } from "react";
import { uploadImage } from "../../services/api";
import { FaFilePdf, FaImage, FaTimes, FaExternalLinkAlt } from "react-icons/fa";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
  accept?: string;
  maxSizeMB?: number;
  theme?: "light" | "dark";
  allowPdf?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  label = "Image",
  className = "",
  accept = "image/*",
  maxSizeMB = 5,
  theme = "dark",
  allowPdf = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine file type from URL
  const isPdf =
    value?.toLowerCase().includes(".pdf") || value?.includes("application/pdf");

  const handleFileSelect = async (file: File) => {
    setError(null);

    // Validate file type
    const isImage = file.type.startsWith("image/");
    const isPdfFile = file.type === "application/pdf";

    if (!isImage && !(allowPdf && isPdfFile)) {
      setError(
        allowPdf
          ? "Please select an image or PDF file"
          : "Please select an image file"
      );
      return;
    }

    // Validate file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    try {
      setUploading(true);
      console.log("Uploading file:", file.name, file.type, file.size);
      const url = await uploadImage(file);
      console.log("Upload successful, URL:", url);
      onChange(url);
    } catch (err: unknown) {
      console.error("Upload error:", err);
      // Show more detailed error message
      const errorMessage =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "Unknown error";
      setError(`Upload failed: ${errorMessage}. Check console for details.`);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const acceptTypes = allowPdf ? "image/*,.pdf,application/pdf" : accept;

  return (
    <div className={className}>
      {label && (
        <label
          className={`block text-sm font-medium mb-2 ${
            theme === "dark" ? "text-gray-300" : "text-slate-700"
          }`}
        >
          {label}
        </label>
      )}

      {/* Preview */}
      {value && (
        <div
          className={`mb-3 relative group rounded-lg border overflow-hidden ${
            theme === "dark" ? "border-gray-700" : "border-slate-300"
          }`}
        >
          {isPdf ? (
            // PDF Preview
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
                    ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                    : "bg-cyan-100 text-cyan-700 hover:bg-cyan-200"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <FaExternalLinkAlt className="text-xs" />
                View PDF
              </a>
            </div>
          ) : (
            // Image Preview
            <img
              src={value}
              alt="Preview"
              className="w-full h-40 object-cover"
            />
          )}
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove file"
          >
            <FaTimes className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Upload Area */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${
            dragOver
              ? theme === "dark"
                ? "border-cyan-500 bg-cyan-500/10"
                : "border-cyan-500 bg-cyan-50"
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
          onChange={handleInputChange}
          className="hidden"
          aria-label={
            allowPdf ? "Upload image or PDF file" : "Upload image file"
          }
          title={allowPdf ? "Upload image or PDF file" : "Upload image file"}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <svg
              className="w-8 h-8 text-cyan-500 animate-spin"
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
              <span className="text-cyan-500 hover:text-cyan-400 font-medium">
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

      {/* Error Message */}
      {error && (
        <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}

      {/* Manual URL Input (fallback) */}
      <div className="mt-3">
        <div
          className={`flex items-center gap-2 text-xs mb-1 ${
            theme === "dark" ? "text-gray-500" : "text-slate-500"
          }`}
        >
          <span>Or paste {allowPdf ? "file" : "image"} URL directly:</span>
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className={`w-full px-3 py-2 text-sm rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
            theme === "dark"
              ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500 focus:border-cyan-500/60"
              : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500"
          }`}
        />
      </div>
    </div>
  );
};

export default ImageUpload;
