import React from "react";
import {
  FaThumbsUp,
  FaThumbsDown,
  FaRegThumbsUp,
  FaRegThumbsDown,
} from "react-icons/fa";

/**
 * "Did you find this article helpful?" with like / dislike buttons.
 */
const ReactionsSection = React.memo(
  ({ reactions, userReaction, reactionLoading, handleReaction }) => (
    <div className="glass-card p-6 rounded-2xl mb-10">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <h3 className="text-lg font-semibold text-white mb-1">
            Did you find this article helpful?
          </h3>
          <p className="text-gray-400 text-sm">Let me know your thoughts!</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Like */}
          <button
            type="button"
            onClick={() => handleReaction("like")}
            disabled={reactionLoading}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 cursor-pointer select-none ${
              userReaction === "like"
                ? "bg-emerald-500/30 text-emerald-400 border border-emerald-500/50 scale-105"
                : "bg-white/5 text-gray-300 border border-white/10 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30 hover:scale-105"
            } ${reactionLoading ? "opacity-50 cursor-wait" : ""}`}
          >
            {userReaction === "like" ? (
              <FaThumbsUp className="text-lg" />
            ) : (
              <FaRegThumbsUp className="text-lg" />
            )}
            <span className="font-bold">{reactions.likes}</span>
          </button>

          {/* Dislike */}
          <button
            type="button"
            onClick={() => handleReaction("dislike")}
            disabled={reactionLoading}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 cursor-pointer select-none ${
              userReaction === "dislike"
                ? "bg-red-500/30 text-red-400 border border-red-500/50 scale-105"
                : "bg-white/5 text-gray-300 border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 hover:scale-105"
            } ${reactionLoading ? "opacity-50 cursor-wait" : ""}`}
          >
            {userReaction === "dislike" ? (
              <FaThumbsDown className="text-lg" />
            ) : (
              <FaRegThumbsDown className="text-lg" />
            )}
            <span className="font-bold">{reactions.dislikes}</span>
          </button>
        </div>
      </div>
    </div>
  ),
);

ReactionsSection.displayName = "ReactionsSection";
export { ReactionsSection };
