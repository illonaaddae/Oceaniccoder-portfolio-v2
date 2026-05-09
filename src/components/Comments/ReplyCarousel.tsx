import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import type { Comment } from "../../types";
import type { StyleVars } from "./types";
import { formatDate } from "./commentUtils";

interface ReplyCarouselProps {
  replies: Comment[];
  replyIndex: number;
  setReplyIndex: React.Dispatch<React.SetStateAction<number>>;
  styles: StyleVars;
}

const ReplyCarousel: React.FC<ReplyCarouselProps> = React.memo(
  ({ replies, replyIndex, setReplyIndex, styles }) => {
    const { cardStyles, textPrimary, textSecondary, textAccent } = styles;
    const reply = replies[replyIndex];
    const len = replies.length;
    const navCls = `p-1.5 rounded-full border transition-all ${cardStyles} hover:bg-[var(--brand-ocean-2)]/10 hover:border-[var(--brand-ocean-2)]/50`;
    const goPrev = () => setReplyIndex((p) => (p - 1 + len) % len);
    const goNext = () => setReplyIndex((p) => (p + 1) % len);

    return (
      <div className="mt-6 pt-6 border-t border-[var(--glass-border)]">
        <div className="flex items-center justify-between mb-4">
          <p className={`text-sm font-medium ${textAccent}`}>
            {len} {len === 1 ? "Reply" : "Replies"}
          </p>
          {len > 1 && (
            <span className={`text-xs ${textAccent}`}>
              {replyIndex + 1} / {len}
            </span>
          )}
        </div>
        <div className="relative">
          <div
            className={`p-4 rounded-xl border ${cardStyles} transition-opacity duration-300`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-[var(--brand-ocean-2)]/20 to-[var(--brand-ocean-3)]/20 text-[var(--brand-ocean-2)]">
                {reply?.authorName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h5 className={`text-sm font-semibold ${textPrimary}`}>
                  {reply?.authorName}
                </h5>
                <p className={`text-xs ${textAccent}`}>
                  {formatDate(reply?.$createdAt)}
                </p>
              </div>
            </div>
            <p className={`text-sm leading-relaxed ${textSecondary}`}>
              {reply?.content}
            </p>
          </div>
          {len > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                type="button"
                onClick={goPrev}
                className={navCls}
                aria-label="Previous reply"
              >
                <FaChevronLeft className={`w-3 h-3 ${textPrimary}`} />
              </button>
              <div className="flex gap-1.5">
                {replies.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReplyIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${idx === replyIndex ? "bg-[var(--brand-ocean-2)] scale-110" : "bg-[var(--glass-border)] hover:bg-[var(--brand-ocean-2)]/50"}`}
                    aria-label={`Go to reply ${idx + 1}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={goNext}
                className={navCls}
                aria-label="Next reply"
              >
                <FaChevronRight className={`w-3 h-3 ${textPrimary}`} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  },
);

ReplyCarousel.displayName = "ReplyCarousel";
export default ReplyCarousel;
