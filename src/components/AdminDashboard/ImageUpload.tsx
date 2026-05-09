import React from "react";
import type { ImageUploadProps } from "./ImageUpload/types";
import { useImageUpload } from "./ImageUpload/useImageUpload";
import { FilePreview } from "./ImageUpload/FilePreview";
import { DropZone } from "./ImageUpload/DropZone";
import { UrlInput } from "./ImageUpload/UrlInput";

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  label = "Image",
  className = "",
  accept = "image/*",
  maxSizeMB = 5,
  theme = "dark",
  allowPdf = false,
  isPdfValue = false,
}) => {
  const {
    uploading,
    error,
    dragOver,
    isPdf,
    fileInputRef,
    acceptTypes,
    handleInputChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleClick,
    handleClear,
    handleImageError,
  } = useImageUpload({
    value,
    onChange,
    maxSizeMB,
    allowPdf,
    isPdfValue,
    accept,
  });

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

      {value && (
        <FilePreview
          value={value}
          isPdf={isPdf}
          theme={theme}
          allowPdf={allowPdf}
          onClear={handleClear}
          onImageError={handleImageError}
        />
      )}

      <DropZone
        uploading={uploading}
        dragOver={dragOver}
        theme={theme}
        allowPdf={allowPdf}
        maxSizeMB={maxSizeMB}
        acceptTypes={acceptTypes}
        fileInputRef={fileInputRef}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onInputChange={handleInputChange}
      />

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

      <UrlInput
        value={value}
        onChange={onChange}
        allowPdf={allowPdf}
        theme={theme}
      />
    </div>
  );
};

export default ImageUpload;
