import { COLLECTIONS } from "./collections";
import { getJson, manageDelete, postJson } from "./dataApi";
import { ensureVisitor } from "./visitor";

/** /api/counters/reactions: totals plus this visitor's own reaction (from its cookie). */
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

/** This visitor's own reaction to the post, or null. */
export async function getVisitorReaction(postId: string): Promise<BlogReaction["reaction"] | null> {
  try {
    await ensureVisitor();
    const { mine } = await getJson<ReactionState>(
      `/api/counters/reactions?postId=${encodeURIComponent(postId)}`,
    );
    return mine;
  } catch {
    return null;
  }
}

export async function addReaction(postId: string, reaction: "like" | "dislike"): Promise<void> {
  await ensureVisitor();
  await postJson<ReactionState>("/api/counters/reaction", { postId, reaction });
}

export async function removeReaction(reactionId: string): Promise<void> {
  await manageDelete(COLLECTIONS.BLOG_REACTIONS, reactionId);
}
