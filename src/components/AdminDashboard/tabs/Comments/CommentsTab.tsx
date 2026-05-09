import {
  FaComment,
  FaTimes,
  FaCheckCircle,
  FaExclamationCircle,
  FaLock,
} from "react-icons/fa";
import { useCommentsData } from "./useCommentsData";
import { CommentsStats } from "./CommentsStats";
import { CommentCard } from "./CommentCard";

interface CommentsTabProps {
  theme: "light" | "dark";
  isReadOnly?: boolean;
}

export const CommentsTab: React.FC<CommentsTabProps> = ({
  theme,
  isReadOnly = false,
}) => {
  const {
    loading,
    filter,
    setFilter,
    deleteConfirm,
    setDeleteConfirm,
    toast,
    setToast,
    filteredComments,
    totalComments,
    pendingComments,
    approvedComments,
    getPostTitle,
    getPostSlug,
    formatDate,
    handleToggleApproval,
    handleDelete,
  } = useCommentsData(isReadOnly);

  const cardStyles =
    theme === "dark"
      ? "glass-card bg-gray-800/50 border-gray-700/80"
      : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40";
  const textPrimary = theme === "dark" ? "text-white" : "text-slate-900";
  const textSecondary =
    theme === "dark" ? "text-slate-200/90" : "text-slate-700/80";
  const textMuted = theme === "dark" ? "text-gray-400" : "text-slate-600";

  return (
    <div className="space-y-4 sm:space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg ${toast.type === "success" ? (theme === "dark" ? "bg-green-500/20 border-green-400/50 text-green-300" : "bg-green-50 border-green-200 text-green-700") : theme === "dark" ? "bg-red-500/20 border-red-400/50 text-red-300" : "bg-red-50 border-red-200 text-red-700"}`}
        >
          {toast.type === "success" ? (
            <FaCheckCircle className="text-lg flex-shrink-0" />
          ) : (
            <FaExclamationCircle className="text-lg flex-shrink-0" />
          )}
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className="p-1 rounded-lg hover:bg-black/10 transition-colors"
            aria-label="Dismiss"
          >
            <FaTimes className="text-xs" />
          </button>
        </div>
      )}

      <div>
        <h1
          className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${textPrimary}`}
        >
          Comments
        </h1>
        <p
          className={`text-sm sm:text-base transition-colors duration-300 ${textSecondary}`}
        >
          {isReadOnly
            ? "Overview of blog comment activity"
            : "Manage blog post comments and moderation"}
        </p>
      </div>

      {isReadOnly && (
        <div
          className={`rounded-xl p-4 border ${theme === "dark" ? "bg-amber-500/10 border-amber-500/30 text-amber-200" : "bg-amber-50 border-amber-200 text-amber-800"}`}
        >
          <p className="text-sm font-medium flex items-center gap-2">
            <FaLock className="w-4 h-4 flex-shrink-0" />
            Comment moderation is only available to the admin. This is a
            read-only view of comment statistics.
          </p>
        </div>
      )}

      <CommentsStats
        {...{
          totalComments,
          pendingComments,
          approvedComments,
          cardStyles,
          textPrimary,
          textMuted,
        }}
      />

      <div className="flex gap-2">
        {(["all", "pending", "approved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${filter === f ? "bg-gradient-to-r from-oceanic-600 to-oceanic-900 text-white shadow-lg shadow-oceanic-500/20" : theme === "dark" ? "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50" : "bg-slate-200/60 text-slate-600 hover:bg-slate-300/60"}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === "pending" && pendingComments > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs">
                {pendingComments}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-3 border-oceanic-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={textMuted}>Loading comments...</p>
        </div>
      ) : filteredComments.length === 0 ? (
        <div
          className={`${cardStyles} border rounded-2xl p-12 text-center transition-colors duration-200`}
        >
          <FaComment className={`text-4xl mx-auto mb-4 ${textMuted}`} />
          <p className={textMuted}>
            {filter === "pending"
              ? "No pending comments"
              : filter === "approved"
                ? "No approved comments"
                : "No comments yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComments.map((comment) => (
            <CommentCard
              key={comment.$id}
              comment={comment}
              theme={theme}
              isReadOnly={isReadOnly}
              cardStyles={cardStyles}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textMuted={textMuted}
              deleteConfirm={deleteConfirm}
              setDeleteConfirm={setDeleteConfirm}
              getPostTitle={getPostTitle}
              getPostSlug={getPostSlug}
              formatDate={formatDate}
              onToggleApproval={handleToggleApproval}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentsTab;
