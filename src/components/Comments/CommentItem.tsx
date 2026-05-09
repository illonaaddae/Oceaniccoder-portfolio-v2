import React from "react";
import { FaReply, FaUser, FaClock } from "react-icons/fa";
import type { Comment } from "../../types";
import type { CommentFormState, StyleVars } from "./types";
import { formatDate } from "./commentUtils";
import ReplyForm from "./ReplyForm";
import ReplyCarousel from "./ReplyCarousel";

interface CommentItemProps {
  comment: Comment;
  replies: Comment[];
  replyIndex: number;
  setReplyIndex: React.Dispatch<React.SetStateAction<number>>;
  isReplying: boolean;
  onToggleReply: () => void;
  form: CommentFormState;
  setForm: React.Dispatch<React.SetStateAction<CommentFormState>>;
  submitting: boolean;
  onReplySubmit: (e: React.FormEvent) => void;
  onCancelReply: () => void;
  styles: StyleVars;
}

const CommentItem: React.FC<CommentItemProps> = React.memo(
  ({
    comment,
    replies,
    replyIndex,
    setReplyIndex,
    isReplying,
    onToggleReply,
    form,
    setForm,
    submitting,
    onReplySubmit,
    onCancelReply,
    styles,
  }) => {
    const { textPrimary, textSecondary, textAccent } = styles;

    return (
      <>
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold bg-gradient-to-br from-[var(--brand-ocean-2)]/20 to-[var(--brand-ocean-3)]/20 text-[var(--brand-ocean-2)] flex-shrink-0">
            {comment.authorName?.charAt(0).toUpperCase() || <FaUser />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`font-semibold text-lg ${textPrimary}`}>
              {comment.authorName}
            </h4>
            <p className={`text-sm flex items-center gap-1.5 ${textAccent}`}>
              <FaClock className="text-xs" />
              {formatDate(comment.$createdAt)}
            </p>
          </div>
        </div>
        <blockquote
          className={`text-base md:text-lg leading-relaxed mb-6 ${textSecondary}`}
        >
          &ldquo;{comment.content}&rdquo;
        </blockquote>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleReply();
          }}
          className="flex items-center gap-1.5 text-sm font-medium transition-colors text-[var(--brand-ocean-2)] hover:text-[var(--brand-ocean-3)]"
        >
          <FaReply className="text-xs" />
          {isReplying ? "Cancel" : "Reply"}
        </button>
        {isReplying && (
          <ReplyForm
            form={form}
            setForm={setForm}
            submitting={submitting}
            onSubmit={onReplySubmit}
            onCancel={onCancelReply}
            styles={styles}
          />
        )}
        {replies.length > 0 && (
          <ReplyCarousel
            replies={replies}
            replyIndex={replyIndex}
            setReplyIndex={setReplyIndex}
            styles={styles}
          />
        )}
      </>
    );
  },
);

CommentItem.displayName = "CommentItem";
export default CommentItem;
