import React from "react";
import { FaComment } from "react-icons/fa";

interface CommentHeaderProps {
  count: number;
  textPrimary: string;
  textAccent: string;
}

const CommentHeader: React.FC<CommentHeaderProps> = React.memo(
  ({ count, textPrimary, textAccent }) => (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-[var(--brand-ocean-2)]/20 to-[var(--brand-ocean-3)]/20">
          <FaComment className="text-[var(--brand-ocean-2)]" />
        </div>
        <h2 className={`text-2xl font-bold ${textPrimary}`}>
          Comments
          {count > 0 && (
            <span className={`ml-2 text-lg font-normal ${textAccent}`}>
              ({count})
            </span>
          )}
        </h2>
      </div>
    </div>
  ),
);

CommentHeader.displayName = "CommentHeader";
export default CommentHeader;
