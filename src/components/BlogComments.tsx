import React from "react";
import { FaComment } from "react-icons/fa";
import type { BlogCommentsProps } from "./Comments/types";
import { getStyles } from "./Comments/commentUtils";
import { useComments } from "./Comments/useComments";
import { useCarousel } from "./Comments/useCarousel";
import Toast from "./Comments/Toast";
import CommentHeader from "./Comments/CommentHeader";
import CommentCarousel from "./Comments/CommentCarousel";
import CommentForm from "./Comments/CommentForm";

const BlogComments: React.FC<BlogCommentsProps> = ({
  postId,
  isDark = true,
}) => {
  const s = getStyles(isDark);
  const {
    loading,
    submitting,
    replyingTo,
    setReplyingTo,
    toast,
    setToast,
    form,
    setForm,
    topLevelComments,
    getReplies,
    handleSubmit,
  } = useComments(postId);
  const {
    currentIndex,
    setCurrentIndex,
    replyIndex,
    setReplyIndex,
    isAnimating,
    goToNext,
    goToPrev,
    goToSlide,
  } = useCarousel(topLevelComments.length);

  const current = topLevelComments[currentIndex];
  const replies = current ? getReplies(current.$id) : [];

  const onSubmit = (e: React.FormEvent, parentId?: string) => {
    handleSubmit(e, parentId, (nc) => {
      setTimeout(() => {
        const top = [...topLevelComments, nc].filter((c) => !c.parentId);
        setCurrentIndex(top.length - 1);
      }, 100);
    });
  };

  return (
    <div className="mt-16 mb-16">
      <CommentHeader
        count={topLevelComments.length}
        textPrimary={s.textPrimary}
        textAccent={s.textAccent}
      />
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-3 border-[var(--brand-ocean-2)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={s.textAccent}>Loading comments...</p>
        </div>
      ) : topLevelComments.length === 0 ? (
        <div
          className={`text-center py-12 rounded-2xl border mb-8 ${s.cardStyles}`}
        >
          <FaComment className={`text-4xl mx-auto mb-4 ${s.textAccent}`} />
          <p className={`text-lg font-medium mb-2 ${s.textPrimary}`}>
            No comments yet
          </p>
          <p className={s.textAccent}>Be the first to share your thoughts!</p>
        </div>
      ) : (
        <CommentCarousel
          comments={topLevelComments}
          currentIndex={currentIndex}
          replies={replies}
          replyIndex={replyIndex}
          setReplyIndex={setReplyIndex}
          isAnimating={isAnimating}
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
          form={form}
          setForm={setForm}
          submitting={submitting}
          onSubmit={onSubmit}
          goToPrev={goToPrev}
          goToNext={goToNext}
          goToSlide={goToSlide}
          styles={s}
        />
      )}
      <CommentForm
        form={form}
        setForm={setForm}
        submitting={submitting}
        onSubmit={(e) => onSubmit(e)}
        styles={s}
      />
    </div>
  );
};

export default BlogComments;
