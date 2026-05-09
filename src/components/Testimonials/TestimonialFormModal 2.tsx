import React from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import type { TestimonialFormData } from "./types";
import SuccessMessage from "./SuccessMessage";
import SubmissionForm from "./SubmissionForm";

interface TestimonialFormModalProps {
  formData: TestimonialFormData;
  setFormData: React.Dispatch<React.SetStateAction<TestimonialFormData>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onBackdropClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  submitting: boolean;
  submitSuccess: boolean;
  uploadingImage: boolean;
  imagePreview: string | null;
  setImagePreview: React.Dispatch<React.SetStateAction<string | null>>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  titleId: string;
  imageInputId: string;
}

const TestimonialFormModal: React.FC<TestimonialFormModalProps> = ({
  formData,
  setFormData,
  onSubmit,
  onImageUpload,
  onClose,
  onBackdropClick,
  submitting,
  submitSuccess,
  uploadingImage,
  imagePreview,
  setImagePreview,
  fileInputRef,
  titleId,
  imageInputId,
}) =>
  createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 dark:bg-black/95 backdrop-blur-md"
      onClick={onBackdropClick}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
      <div
        className="rounded-2xl p-6 md:p-8 w-full max-w-md relative animate-fadeIn max-h-[90vh] overflow-y-auto bg-[var(--bg-primary)] border border-[var(--glass-border)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[var(--glass-border)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] touch-manipulation z-10"
          aria-label="Close form"
        >
          <FaTimes />
        </button>
        {submitSuccess ? (
          <SuccessMessage />
        ) : (
          <SubmissionForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={onSubmit}
            onImageUpload={onImageUpload}
            submitting={submitting}
            uploadingImage={uploadingImage}
            imagePreview={imagePreview}
            setImagePreview={setImagePreview}
            fileInputRef={fileInputRef}
            titleId={titleId}
            imageInputId={imageInputId}
          />
        )}
      </div>
    </div>,
    document.body,
  );

export default TestimonialFormModal;
