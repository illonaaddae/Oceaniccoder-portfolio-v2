import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import type { Comment } from "../../types";
import { getJson, listRows, submitRow, usesCosmos, type DocumentList } from "./dataApi";

/**
 * Approved comments on a post, newest first, without commenter emails. Goes
 * through the server in both backends; reading the Appwrite collection from
 * the browser would hand every visitor every commenter's email.
 */
export async function getCommentsByPostId(postId: string): Promise<Comment[]> {
  const response = usesCosmos
    ? await listRows<Comment>(COLLECTIONS.COMMENTS, {
        where: { postId, isApproved: true },
        orderBy: "$createdAt",
        dir: "desc",
      })
    : await getJson<DocumentList<Comment>>(`/api/comments?postId=${encodeURIComponent(postId)}`);
  return response.documents;
}

/** Every comment, with emails. Admin only: needs the admin's Appwrite session. */
export async function getAllComments(): Promise<Comment[]> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.COMMENTS, [
    Query.orderDesc("$createdAt"),
    Query.limit(100),
  ]);
  return response.documents as unknown as Comment[];
}

export async function updateComment(commentId: string, data: Partial<Comment>): Promise<Comment> {
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
