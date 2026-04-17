import React from "react";
import { FaTimes, FaCloudUploadAlt } from "react-icons/fa";
import type { TestimonialFormData } from "./types";

interface ImageUploadFieldProps {
  formData: TestimonialFormData;
  setFormData: React.Dispatch<React.SetStateAction<TestimonialFormData>>;
  imagePreview: string | null;
  setImagePreview: React.Dispatch<React.SetStateAction<string | null>>;
  uploadingImage: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputId: string;
}

const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  formData,
  setFormData,
  imagePreview,
  setImagePreview,
  uploadingImage,
  fileInputRef,
  onImageUpload,
  inputId,
}) => (
  <div>
    <label
      htmlFor={inputId}
      className="block text-sm font-medium text-[var(--text-primary)] mb-2"
    >
      Profile Image
    </label>
    <div className="flex items-start gap-4">
      {(imagePreview || formData.image) && (
        <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-[var(--glass-border)] flex-shrink-0">
          <img
            src={imagePreview || formData.image}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() => {
              setImagePreview(null);
              setFormData((prev) => ({ ...prev, image: "" }));
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors touch-manipulation"
            title="Remove image"
            aria-label="Remove image"
          >
            <FaTimes className="text-xs" />
          </button>
        </div>
      )}
      <div className="flex-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onImageUpload}
          className="hidden"
          id={inputId}
        />
        <label
          htmlFor={inputId}
          className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed cursor-pointer transition-all touch-manipulation ${
            uploadingImage
              ? "border-oceanic-500 bg-oceanic-500/10"
              : "border-[var(--glass-border)] hover:border-oceanic-500 hover:bg-[var(--glass-border)]/50"
          }`}
        >
          {uploadingImage ? (
            <>
              <div className="w-5 h-5 border-2 border-oceanic-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-oceanic-500 text-sm">Uploading...</span>
            </>
          ) : (
            <>
              <FaCloudUploadAlt className="text-[var(--text-secondary)]" />
              <span className="text-[var(--text-secondary)] text-sm">
                {imagePreview || formData.image
                  ? "Change Image"
                  : "Upload Photo"}
              </span>
            </>
          )}
        </label>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-[var(--text-accent)]">
            or paste URL:
          </span>
          <input
            type="url"
            value={formData.image}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, image: e.target.value }));
              setImagePreview(null);
            }}
            className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-accent)] focus:border-oceanic-500 focus:ring-1 focus:ring-oceanic-500 transition-all outline-none"
            placeholder="https://..."
          />
        </div>
        <p className="text-xs text-[var(--text-accent)] mt-1">
          Optional - Max 5MB (JPG, PNG, GIF)
        </p>
      </div>
    </div>
  </div>
);

export default ImageUploadField;
