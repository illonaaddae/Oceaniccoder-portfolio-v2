import React from "react";
import { FaPaperPlane } from "react-icons/fa";
import type { CommentFormState, StyleVars } from "./types";

interface ReplyFormProps {
  form: CommentFormState;
  setForm: React.Dispatch<React.SetStateAction<CommentFormState>>;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  styles: StyleVars;
}

const ReplyForm: React.FC<ReplyFormProps> = React.memo(
  ({ form, setForm, submitting, onSubmit, onCancel, styles }) => {
    const { cardStyles, textAccent, inputStyles } = styles;

    return (
      <form
        onSubmit={onSubmit}
        className={`mt-4 p-4 rounded-xl border ${cardStyles}`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input
            type="text"
            placeholder="Your name *"
            value={form.authorName}
            onChange={(e) =>
              setForm((f) => ({ ...f, authorName: e.target.value }))
            }
            required
            className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${inputStyles} focus:outline-none`}
          />
          <input
            type="email"
            placeholder="Email (optional)"
            value={form.authorEmail}
            onChange={(e) =>
              setForm((f) => ({ ...f, authorEmail: e.target.value }))
            }
            className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${inputStyles} focus:outline-none`}
          />
        </div>
        <textarea
          placeholder="Write your reply..."
          value={form.content}
          onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          required
          rows={2}
          className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors resize-none mb-3 ${inputStyles} focus:outline-none`}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${textAccent} hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-oceanic-600 to-oceanic-900 text-white text-sm font-medium rounded-lg hover:from-oceanic-500 hover:to-oceanic-900 transition-all disabled:opacity-50"
          >
            <FaPaperPlane className="text-xs" />
            {submitting ? "Posting..." : "Post Reply"}
          </button>
        </div>
      </form>
    );
  },
);

ReplyForm.displayName = "ReplyForm";
export default ReplyForm;
