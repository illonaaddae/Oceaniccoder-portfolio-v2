import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import type { BlogReaction } from "../../types";

export async function getPostReactions(
  postId: string,
): Promise<{ likes: number; dislikes: number }> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.BLOG_REACTIONS,
      [Query.equal("postId", postId)],
    );
    const reactions = response.documents as unknown as BlogReaction[];
    const likes = reactions.filter((r) => r.reaction === "like").length;
    const dislikes = reactions.filter((r) => r.reaction === "dislike").length;
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
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.BLOG_REACTIONS,
      [Query.equal("postId", postId), Query.equal("visitorId", visitorId)],
    );
    return response.documents.length > 0
      ? (response.documents[0] as unknown as BlogReaction)
      : null;
  } catch {
    return null;
  }
}

export async function addReaction(
  postId: string,
  visitorId: string,
  reaction: "like" | "dislike",
): Promise<BlogReaction> {
  const existing = await getVisitorReaction(postId, visitorId);
  if (existing) {
    if (existing.reaction === reaction) {
      await databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.BLOG_REACTIONS,
        existing.$id,
      );
      return existing;
    }
    return databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.BLOG_REACTIONS,
      existing.$id,
      { reaction },
    ) as unknown as BlogReaction;
  }
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.BLOG_REACTIONS,
    ID.unique(),
    { postId, visitorId, reaction },
  ) as unknown as BlogReaction;
}

export async function removeReaction(reactionId: string): Promise<void> {
  await databases.deleteDocument(
    DATABASE_ID,
    COLLECTIONS.BLOG_REACTIONS,
    reactionId,
  );
}
