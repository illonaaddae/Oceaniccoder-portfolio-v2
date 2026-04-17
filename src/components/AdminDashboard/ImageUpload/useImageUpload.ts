import { useState, useRef, useEffect } from "react";
import type { ChangeEvent, DragEvent, RefObject } from "react";
import { uploadImage } from "../../../services/api";

interface UseImageUploadOptions {
  value: string;
  onChange: (url: string) => void;
  maxSizeMB: number;
  allowPdf: boolean;
  isPdfValue: boolean;
  accept: string;
}

export interface UseImageUploadReturn {
  uploading: boolean;
  error: string | null;
  dragOver: boolean;
  uploadedAsPdf: boolean;
  imageLoadError: boolean;
  fileInputRef: RefObject<HTMLInputElement>;
  isPdf: boolean;
  acceptTypes: string;
  handleFileSelect: (file: File) => Promise<void>;
  handleInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: DragEvent) => void;
  handleDragOver: (e: DragEvent) => void;
  handleDragLeave: () => void;
  handleClick: () => void;
  handleClear: () => void;
  handleImageError: () => void;
}

export function useImageUpload({
  value,
  onChange,
  maxSizeMB,
  allowPdf,
  isPdfValue,
  accept,
}: UseImageUploadOptions): UseImageUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedAsPdf, setUploadedAsPdf] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset states when value changes externally
  useEffect(() => {
    setImageLoadError(false);
    // If value is cleared, reset uploadedAsPdf
    if (!value) {
      setUploadedAsPdf(false);
    }
  }, [value]);

  // Determine if this is a PDF — check multiple indicators
  const isPdf =
    isPdfValue ||
    uploadedAsPdf ||
    value?.toLowerCase().includes(".pdf") ||
    value?.includes("application/pdf") ||
    imageLoadError; // If image fails to load, it might be a PDF

  const acceptTypes = allowPdf ? "image/*,.pdf,application/pdf" : accept;

  const handleFileSelect = async (file: File): Promise<void> => {
    setError(null);
    setImageLoadError(false);

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

    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    try {
      setUploading(true);
      const url = await uploadImage(file);
      // Track if this upload was a PDF
      setUploadedAsPdf(isPdfFile);
      onChange(url);
    } catch (err: unknown) {
      console.error("Upload error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "Unknown error";
      setError(`Upload failed: ${errorMessage}. Check console for details.`);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: DragEvent): void => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: DragEvent): void => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (): void => {
    setDragOver(false);
  };

  const handleClick = (): void => {
    fileInputRef.current?.click();
  };

  const handleClear = (): void => {
    onChange("");
    setUploadedAsPdf(false);
    setImageLoadError(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageError = (): void => {
    if (allowPdf) {
      setImageLoadError(true);
    }
  };

  return {
    uploading,
    error,
    dragOver,
    uploadedAsPdf,
    imageLoadError,
    fileInputRef,
    isPdf,
    acceptTypes,
    handleFileSelect,
    handleInputChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleClick,
    handleClear,
    handleImageError,
  };
}
