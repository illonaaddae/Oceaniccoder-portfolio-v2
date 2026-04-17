import React from "react";
import { FaPaperPlane } from "react-icons/fa";
import type { CommentFormState, StyleVars } from "./types";

interface CommentFormProps {
  form: CommentFormState;
  setForm: React.Dispatch<React.SetStateAction<CommentFormState>>;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  styles: StyleVars;
}

const CommentForm: React.FC<CommentFormProps> = React.memo(
  ({ form, setForm, submitting, onSubmit, styles }) => {
    const { cardStyles, textPrimary, textSecondary, textAccent, inputStyles } =
      styles;

    return (
      <form
        onSubmit={onSubmit}
        className={`p-5 md:p-6 rounded-2xl border ${cardStyles}`}
      >
        <h3 className={`text-lg font-semibold mb-4 ${textPrimary}`}>
          Leave a Comment
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label
              className={`block text-sm font-medium mb-1.5 ${textSecondary}`}
            >
              Name <span className="text-[var(--brand-ocean-2)]">*</span>
            </label>
            <input
              type="text"
              placeholder="Your name"
              value={form.authorName}
              onChange={(e) =>
                setForm((f) => ({ ...f, authorName: e.target.value }))
              }
              required
              className={`w-full px-4 py-2.5 rounded-xl border transition-colors ${inputStyles} focus:outline-none focus:ring-2 focus:ring-[var(--brand-ocean-2)]/20`}
            />
          </div>
          <div>
            <label
              className={`block text-sm font-medium mb-1.5 ${textSecondary}`}
            >
              Email <span className={textAccent}>(optional)</span>
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              value={form.authorEmail}
              onChange={(e) =>
                setForm((f) => ({ ...f, authorEmail: e.target.value }))
              }
              className={`w-full px-4 py-2.5 rounded-xl border transition-colors ${inputStyles} focus:outline-none focus:ring-2 focus:ring-[var(--brand-ocean-2)]/20`}
            />
          </div>
        </div>
        <div className="mb-4">
          <label
            className={`block text-sm font-medium mb-1.5 ${textSecondary}`}
          >
            Comment <span className="text-[var(--brand-ocean-2)]">*</span>
          </label>
          <textarea
            placeholder="Share your thoughts..."
            value={form.content}
            onChange={(e) =>
              setForm((f) => ({ ...f, content: e.target.value }))
            }
            required
            rows={4}
            className={`w-full px-4 py-3 rounded-xl border transition-colors resize-none ${inputStyles} focus:outline-none focus:ring-2 focus:ring-[var(--brand-ocean-2)]/20`}
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={
              submitting || !form.authorName.trim() || !form.content.trim()
            }
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-oceanic-600 to-oceanic-900 text-white font-semibold rounded-xl hover:from-oceanic-500 hover:to-oceanic-900 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-oceanic-500/25"
          >
            <FaPaperPlane />
            {submitting ? "Posting..." : "Post Comment"}
          </button>
        </div>
      </form>
    );
  },
);

CommentForm.displayName = "CommentForm";
export default CommentForm;
