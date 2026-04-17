import React from "react";
import { FaStar, FaPaperPlane } from "react-icons/fa";
import type { TestimonialFormData } from "./types";
import ImageUploadField from "./ImageUploadField";

interface SubmissionFormProps {
  formData: TestimonialFormData;
  setFormData: React.Dispatch<React.SetStateAction<TestimonialFormData>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  submitting: boolean;
  uploadingImage: boolean;
  imagePreview: string | null;
  setImagePreview: React.Dispatch<React.SetStateAction<string | null>>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  titleId: string;
  imageInputId: string;
}

const SubmissionForm: React.FC<SubmissionFormProps> = ({
  formData,
  setFormData,
  onSubmit,
  onImageUpload,
  submitting,
  uploadingImage,
  imagePreview,
  setImagePreview,
  fileInputRef,
  titleId,
  imageInputId,
}) => (
  <>
    <h3
      id={titleId}
      className="text-2xl font-bold text-[var(--text-primary)] mb-2"
    >
      Share Your Experience
    </h3>
    <p className="text-[var(--text-secondary)] mb-6 text-sm">
      Your feedback helps others understand what it&apos;s like working with me.
    </p>
    <form onSubmit={onSubmit} className="space-y-4">
      <ImageUploadField
        formData={formData}
        setFormData={setFormData}
        imagePreview={imagePreview}
        setImagePreview={setImagePreview}
        uploadingImage={uploadingImage}
        fileInputRef={fileInputRef}
        onImageUpload={onImageUpload}
        inputId={imageInputId}
      />
      <div>
        <label
          htmlFor="testimonial-name"
          className="block text-sm font-medium text-[var(--text-primary)] mb-1"
        >
          Your Name *
        </label>
        <input
          id="testimonial-name"
          type="text"
          required
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-accent)] focus:border-oceanic-500 focus:ring-1 focus:ring-oceanic-500 transition-all outline-none"
          placeholder="John Doe"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="testimonial-role"
            className="block text-sm font-medium text-[var(--text-primary)] mb-1"
          >
            Your Role *
          </label>
          <input
            id="testimonial-role"
            type="text"
            required
            value={formData.role}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, role: e.target.value }))
            }
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-accent)] focus:border-oceanic-500 focus:ring-1 focus:ring-oceanic-500 transition-all outline-none"
            placeholder="CEO"
          />
        </div>
        <div>
          <label
            htmlFor="testimonial-company"
            className="block text-sm font-medium text-[var(--text-primary)] mb-1"
          >
            Company
          </label>
          <input
            id="testimonial-company"
            type="text"
            value={formData.company}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, company: e.target.value }))
            }
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-accent)] focus:border-oceanic-500 focus:ring-1 focus:ring-oceanic-500 transition-all outline-none"
            placeholder="Acme Inc"
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="testimonial-rating"
          className="block text-sm font-medium text-[var(--text-primary)] mb-1"
        >
          Your Rating *
        </label>
        <div id="testimonial-rating" className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, rating: star }))}
              className="p-1 transition-transform hover:scale-110 active:scale-95 touch-manipulation"
              aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            >
              <FaStar
                className={`w-6 h-6 ${star <= formData.rating ? "text-yellow-400" : "text-[var(--text-accent)]"}`}
              />
            </button>
          ))}
        </div>
      </div>
      <div>
        <label
          htmlFor="testimonial-content"
          className="block text-sm font-medium text-[var(--text-primary)] mb-1"
        >
          Your Testimonial *
        </label>
        <textarea
          id="testimonial-content"
          required
          rows={4}
          value={formData.content}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, content: e.target.value }))
          }
          className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-accent)] focus:border-oceanic-500 focus:ring-1 focus:ring-oceanic-500 transition-all outline-none resize-none"
          placeholder="Share your experience working with me..."
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-oceanic-600 to-oceanic-900 text-white font-medium hover:from-oceanic-500 hover:to-oceanic-900 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
      >
        {submitting ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <FaPaperPlane className="text-sm" />
            Submit Testimonial
          </>
        )}
      </button>
    </form>
  </>
);

export default SubmissionForm;
