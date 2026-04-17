import { useState, useEffect, useCallback } from "react";
import {
  getPostReactions,
  getVisitorReaction,
  addReaction,
} from "../../services/api";
import { getVisitorId } from "./utils";

/**
 * Manages like / dislike reactions for a single blog post.
 * Includes optimistic UI updates with rollback on error.
 */
export const useReactions = (postId) => {
  const [reactions, setReactions] = useState({ likes: 0, dislikes: 0 });
  const [userReaction, setUserReaction] = useState(null);
  const [reactionLoading, setReactionLoading] = useState(false);

  const loadReactions = useCallback(async () => {
    if (!postId) return;
    try {
      const [reactionsData, visitorReaction] = await Promise.all([
        getPostReactions(postId),
        getVisitorReaction(postId, getVisitorId()),
      ]);
      setReactions(reactionsData);
      setUserReaction(visitorReaction?.reaction || null);
    } catch (error) {
      console.error("Error loading reactions:", error);
    }
  }, [postId]);

  useEffect(() => {
    loadReactions();
  }, [loadReactions]);

  const handleReaction = async (reactionType) => {
    if (reactionLoading || !postId) return;

    setReactionLoading(true);
    const visitorId = getVisitorId();
    const previousReaction = userReaction;
    const previousReactions = { ...reactions };

    // Optimistic update
    if (userReaction === reactionType) {
      setUserReaction(null);
      setReactions((prev) => ({
        ...prev,
        [reactionType === "like" ? "likes" : "dislikes"]: Math.max(
          0,
          prev[reactionType === "like" ? "likes" : "dislikes"] - 1,
        ),
      }));
    } else {
      if (userReaction) {
        setReactions((prev) => ({
          likes:
            reactionType === "like"
              ? prev.likes + 1
              : Math.max(0, prev.likes - 1),
          dislikes:
            reactionType === "dislike"
              ? prev.dislikes + 1
              : Math.max(0, prev.dislikes - 1),
        }));
      } else {
        setReactions((prev) => ({
          ...prev,
          [reactionType === "like" ? "likes" : "dislikes"]:
            prev[reactionType === "like" ? "likes" : "dislikes"] + 1,
        }));
      }
      setUserReaction(reactionType);
    }

    try {
      await addReaction(postId, visitorId, reactionType);
    } catch (error) {
      console.error("Error adding reaction:", error);
      setUserReaction(previousReaction);
      setReactions(previousReactions);
    } finally {
      setReactionLoading(false);
    }
  };

  return { reactions, userReaction, reactionLoading, handleReaction };
};
