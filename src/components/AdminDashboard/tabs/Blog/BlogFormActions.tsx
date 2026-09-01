import React from "react";
import { FaTimes, FaSave, FaPaperPlane } from "react-icons/fa";

interface BlogFormActionsProps {
  theme: "light" | "dark";
  submitting: boolean;
  isEditing: boolean;
  onCancel: () => void;
  onSendTest: () => void;
}

export const BlogFormActions: React.FC<BlogFormActionsProps> = ({
  theme,
  submitting,
  isEditing,
  onCancel,
  onSendTest,
}) => {
  const [testing, setTesting] = React.useState(false);

  const handleTest = async () => {
    setTesting(true);
    try {
      await onSendTest();
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      className={`flex flex-col-reverse sm:flex-row sm:items-center gap-3 pt-4 border-t ${
        theme === "dark" ? "border-white/10" : "border-oceanic-200/30"
      }`}
    >
      {/* Sends the post as it stands to your own address only, so the real email
        can be checked in an inbox before it ever reaches the list. */}
      <button
        type="button"
        onClick={handleTest}
        disabled={testing || submitting}
        title="Send this post to your own address only"
        className={`w-full sm:w-auto sm:mr-auto px-5 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 border disabled:opacity-50 disabled:cursor-not-allowed ${
          theme === "dark"
            ? "bg-transparent text-oceanic-300 hover:bg-white/10 border-white/20"
            : "bg-transparent text-oceanic-700 hover:bg-oceanic-50 border-oceanic-300"
        }`}
      >
        <FaPaperPlane className="text-xs" /> {testing ? "Sending test…" : "Send test email"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className={`w-full sm:w-auto px-5 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 border ${
          theme === "dark"
            ? "bg-white/10 text-white hover:bg-white/20 border-white/20"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300"
        }`}
      >
        <FaTimes /> Cancel
      </button>
      <button
        type="submit"
        className={`w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-oceanic-500 to-oceanic-700 text-white rounded-xl hover:from-oceanic-600 hover:to-oceanic-800 transition-all font-medium shadow-lg shadow-oceanic-500/20 flex items-center justify-center gap-2 ${
          submitting ? "opacity-50 cursor-not-allowed" : ""
        }`}
        disabled={submitting}
      >
        {submitting ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Saving...
          </>
        ) : (
          <>
            <FaSave /> {isEditing ? "Update" : "Create"} Post
          </>
        )}
      </button>
    </div>
  );
};
