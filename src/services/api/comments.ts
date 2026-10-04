import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import type { Comment } from "../../types";
import { listRows, manageDelete, manageList, manageUpdate, submitRow, usesCosmos } from "./dataApi";

export async function getCommentsByPostId(postId: string): Promise<Comment[]> {
  if (usesCosmos) {
    const response = await listRows<Comment>(COLLECTIONS.COMMENTS, {
      where: { postId, isApproved: true },
      orderBy: "$createdAt",
      dir: "desc",
    });
    return response.documents;
  }
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.COMMENTS, [
    Query.equal("postId", postId),
    Query.equal("isApproved", true),
    Query.orderDesc("$createdAt"),
  ]);
  return response.documents as unknown as Comment[];
}

export async function getAllComments(): Promise<Comment[]> {
  const response = usesCosmos
    ? await manageList(COLLECTIONS.COMMENTS, { orderBy: "$createdAt", dir: "desc", limit: 100 })
    : await databases.listDocuments(DATABASE_ID, COLLECTIONS.COMMENTS, [
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ]);
  return response.documents as unknown as Comment[];
}

export async function updateComment(commentId: string, data: Partial<Comment>): Promise<Comment> {
  return (usesCosmos
    ? manageUpdate(COLLECTIONS.COMMENTS, commentId, data as Record<string, unknown>)
    : databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.COMMENTS,
        commentId,
        data as Record<string, unknown>,
      )) as unknown as Comment;
}

export async function deleteComment(commentId: string): Promise<void> {
  await (usesCosmos
    ? manageDelete(COLLECTIONS.COMMENTS, commentId)
    : databases.deleteDocument(DATABASE_ID, COLLECTIONS.COMMENTS, commentId));
}

export async function createComment(
  comment: Omit<Comment, "$id">,
  turnstileToken?: string | null,
): Promise<Comment> {
  if (usesCosmos) return submitRow<Comment>(COLLECTIONS.COMMENTS, comment, turnstileToken);
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.COMMENTS,
    ID.unique(),
    comment as Record<string, unknown>,
  ) as unknown as Comment;
}
