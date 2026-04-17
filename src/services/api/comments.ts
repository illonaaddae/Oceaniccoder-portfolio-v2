import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import type { Comment } from "../../types";

export async function getCommentsByPostId(postId: string): Promise<Comment[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.COMMENTS,
    [
      Query.equal("postId", postId),
      Query.equal("isApproved", true),
      Query.orderDesc("$createdAt"),
    ],
  );
  return response.documents as unknown as Comment[];
}

export async function getAllComments(): Promise<Comment[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.COMMENTS,
    [Query.orderDesc("$createdAt"), Query.limit(100)],
  );
  return response.documents as unknown as Comment[];
}

export async function updateComment(
  commentId: string,
  data: Partial<Comment>,
): Promise<Comment> {
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.COMMENTS,
    commentId,
    data as Record<string, unknown>,
  ) as unknown as Comment;
}

export async function deleteComment(commentId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.COMMENTS, commentId);
}

export async function createComment(
  comment: Omit<Comment, "$id">,
): Promise<Comment> {
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.COMMENTS,
    ID.unique(),
    comment as Record<string, unknown>,
  ) as unknown as Comment;
}
