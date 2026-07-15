import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { useThemeDetector } from "./BlogPost/useThemeDetector";
import { useBlogPost } from "./BlogPost/useBlogPost";
import { useReactions } from "./BlogPost/useReactions";
import { LoadingState } from "./BlogPost/LoadingState";
import { NotFoundState } from "./BlogPost/NotFoundState";
import { BlogPostHeader } from "./BlogPost/BlogPostHeader";
import { FeaturedImage } from "./BlogPost/FeaturedImage";
import { MarkdownRenderer } from "./BlogPost/MarkdownRenderer";
import { ReactionsSection } from "./BlogPost/ReactionsSection";
import { PostNavigation } from "./BlogPost/PostNavigation";
import { RelatedPosts } from "./BlogPost/RelatedPosts";
import BlogComments from "./BlogComments";

const BlogPost = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isDark = useThemeDetector();

  const { post, loading, isSearching, relatedPosts, prevPost, nextPost } = useBlogPost(slug);
  const { reactions, userReaction, reactionLoading, handleReaction } = useReactions(post?.$id);

  if (loading || isSearching) return <LoadingState />;
  if (!post) return <NotFoundState />;

  return (
    <section
      className="min-h-screen pt-28 pb-20 relative"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-primary) 50%, var(--bg-secondary) 100%)",
      }}
    >
      <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-4xl">
        {/* Back button */}
        <button
          onClick={() => navigate("/blog")}
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-8 transition-colors"
        >
          <FaArrowLeft /> Back to Blog
        </button>

        <BlogPostHeader post={post} />
        <FeaturedImage image={post.image} title={post.title} />
        <MarkdownRenderer content={post.content} isDark={isDark} />

        <ReactionsSection
          reactions={reactions}
          userReaction={userReaction}
          reactionLoading={reactionLoading}
          handleReaction={handleReaction}
        />

        <BlogComments postId={post.$id} isDark={true} />
        <PostNavigation prevPost={prevPost} nextPost={nextPost} />
        <RelatedPosts posts={relatedPosts} />
      </div>
    </section>
  );
};

export default BlogPost;
