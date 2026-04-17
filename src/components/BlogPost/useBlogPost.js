import { useState, useEffect, useMemo } from "react";
import { usePortfolioData } from "../../hooks/usePortfolioData";
import { getBlogPostBySlug } from "../../services/api";
import { fallbackPosts } from "./fallbackPosts";

/**
 * Finds the current blog post by slug, computes related / prev / next posts,
 * and exposes loading flags.
 */
export const useBlogPost = (slug) => {
  const { blogPosts, loading } = usePortfolioData();

  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [postNotFound, setPostNotFound] = useState(false);
  const [isSearching, setIsSearching] = useState(true);

  const allPosts = useMemo(
    () => (blogPosts && blogPosts.length > 0 ? blogPosts : fallbackPosts),
    [blogPosts],
  );

  useEffect(() => {
    if (loading) {
      setIsSearching(true);
      return;
    }

    const findPost = async () => {
      let foundPost = allPosts.find((p) => p.slug === slug || p.$id === slug);

      if (!foundPost && slug) {
        try {
          foundPost = await getBlogPostBySlug(slug);
        } catch (err) {
          console.warn("Could not fetch blog post by slug:", err);
        }
      }

      if (foundPost) {
        setPost(foundPost);
        setPostNotFound(false);

        const related = allPosts
          .filter(
            (p) =>
              p.$id !== foundPost.$id &&
              (p.category === foundPost.category ||
                p.tags?.some((t) => foundPost.tags?.includes(t))),
          )
          .slice(0, 3);
        setRelatedPosts(related);
      } else {
        setPost(null);
        setPostNotFound(true);
      }

      setIsSearching(false);
    };

    findPost();
  }, [slug, allPosts, loading]);

  const currentIndex = allPosts.findIndex(
    (p) => p.slug === slug || p.$id === slug,
  );
  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const nextPost =
    currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;

  return {
    post,
    loading,
    isSearching,
    postNotFound,
    relatedPosts,
    prevPost,
    nextPost,
    allPosts,
  };
};
