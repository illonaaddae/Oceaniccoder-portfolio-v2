import { COLLECTIONS } from "./collections";
import { getJson, manageDelete, postJson } from "./dataApi";

/** /api/counters/reactions: totals plus this visitor's own reaction. */
interface ReactionState {
  likes: number;
  dislikes: number;
  mine: "like" | "dislike" | null;
}
import type { BlogReaction } from "../../types";

export async function getPostReactions(
  postId: string,
): Promise<{ likes: number; dislikes: number }> {
  try {
    const { likes, dislikes } = await getJson<ReactionState>(
      `/api/counters/reactions?postId=${encodeURIComponent(postId)}`,
    );
    return { likes, dislikes };
  } catch {
    return { likes: 0, dislikes: 0 };
  }
}

export async function getVisitorReaction(
  postId: string,
  visitorId: string,
): Promise<BlogReaction | null> {
  try {
    const { mine } = await getJson<ReactionState>(
      `/api/counters/reactions?postId=${encodeURIComponent(postId)}&visitorId=${encodeURIComponent(visitorId)}`,
    );
    // Only `reaction` is read by the UI; the row id stays on the server.
    return mine ? { $id: "", postId, visitorId, reaction: mine } : null;
  } catch {
    return null;
  }
}

export async function addReaction(
  postId: string,
  visitorId: string,
  reaction: "like" | "dislike",
): Promise<BlogReaction> {
  await postJson<ReactionState>("/api/counters/reaction", { postId, visitorId, reaction });
  return { $id: "", postId, visitorId, reaction };
}

export async function removeReaction(reactionId: string): Promise<void> {
  await manageDelete(COLLECTIONS.BLOG_REACTIONS, reactionId);
}
