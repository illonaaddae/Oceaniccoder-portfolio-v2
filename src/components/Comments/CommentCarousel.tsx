import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import type { Comment } from "../../types";
import type { CommentFormState, StyleVars } from "./types";
import CommentItem from "./CommentItem";

interface Props {
  comments: Comment[];
  currentIndex: number;
  replies: Comment[];
  replyIndex: number;
  setReplyIndex: React.Dispatch<React.SetStateAction<number>>;
  isAnimating: boolean;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  form: CommentFormState;
  setForm: React.Dispatch<React.SetStateAction<CommentFormState>>;
  submitting: boolean;
  onSubmit: (e: React.FormEvent, parentId: string) => void;
  goToPrev: () => void;
  goToNext: () => void;
  goToSlide: (i: number) => void;
  styles: StyleVars;
}

const CommentCarousel: React.FC<Props> = React.memo(
  ({
    comments,
    currentIndex,
    replies,
    replyIndex,
    setReplyIndex,
    isAnimating,
    replyingTo,
    setReplyingTo,
    form,
    setForm,
    submitting,
    onSubmit,
    goToPrev,
    goToNext,
    goToSlide,
    styles: s,
  }) => {
    const current = comments[currentIndex];
    const count = comments.length;
    const navCls = `p-2.5 rounded-full border transition-all ${s.cardStyles} hover:bg-[var(--brand-ocean-2)]/10 hover:border-[var(--brand-ocean-2)]/50`;

    return (
      <div className="mb-8">
        <div className="relative">
          <div
            className={`p-6 md:p-8 rounded-2xl border transition-all duration-400 ${s.cardStyles} ${isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
          >
            {current && (
              <CommentItem
                comment={current}
                replies={replies}
                replyIndex={replyIndex}
                setReplyIndex={setReplyIndex}
                isReplying={replyingTo === current.$id}
                onToggleReply={() =>
                  setReplyingTo(replyingTo === current.$id ? null : current.$id)
                }
                form={form}
                setForm={setForm}
                submitting={submitting}
                onReplySubmit={(e) => onSubmit(e, current.$id)}
                onCancelReply={() => setReplyingTo(null)}
                styles={s}
              />
            )}
          </div>
          {count > 1 && (
            <>
              <button
                onClick={goToPrev}
                className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 md:-translate-x-6 ${navCls}`}
                aria-label="Previous comment"
              >
                <FaChevronLeft className={`w-4 h-4 ${s.textPrimary}`} />
              </button>
              <button
                onClick={goToNext}
                className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 md:translate-x-6 ${navCls}`}
                aria-label="Next comment"
              >
                <FaChevronRight className={`w-4 h-4 ${s.textPrimary}`} />
              </button>
            </>
          )}
        </div>
        {count > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            {count <= 10 ? (
              comments.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  className={`transition-all duration-300 rounded-full ${i === currentIndex ? "w-8 h-3 bg-gradient-to-r from-[var(--brand-ocean-2)] to-[var(--brand-ocean-3)]" : "w-3 h-3 bg-[var(--glass-border)] hover:bg-[var(--brand-ocean-2)]/50"}`}
                  aria-label={`Go to comment ${i + 1}`}
                />
              ))
            ) : (
              <p className={`text-sm ${s.textAccent}`}>
                {currentIndex + 1} of {count} comments
              </p>
            )}
          </div>
        )}
      </div>
    );
  },
);

CommentCarousel.displayName = "CommentCarousel";
export default CommentCarousel;
