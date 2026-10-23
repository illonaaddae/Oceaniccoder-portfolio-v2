import { COLLECTIONS } from "./collections";
import type { Comment } from "../../types";
import {
  listRows,
  manageDelete,
  manageList,
  manageUpdate,
  readsAsAdmin,
  submitRow,
} from "./dataApi";

/**
 * Approved comments on a post, newest first, without commenter emails
 * (/api/data leaves them out).
 */
export async function getCommentsByPostId(postId: string): Promise<Comment[]> {
  const response = await listRows<Comment>(COLLECTIONS.COMMENTS, {
    where: { postId, isApproved: true },
    orderBy: "$createdAt",
    dir: "desc",
  });
  return response.documents;
}

/** Every comment, with emails. Admin only. */
export async function getAllComments(): Promise<Comment[]> {
  // Commenter emails: the read-only /dashboard shows no comments.
  if (!readsAsAdmin()) return [];
  const response = await manageList<Comment>(COLLECTIONS.COMMENTS, {
    orderBy: "$createdAt",
    dir: "desc",
    limit: 100,
  });
  return response.documents;
}

export async function updateComment(commentId: string, data: Partial<Comment>): Promise<Comment> {
  return manageUpdate<Comment>(COLLECTIONS.COMMENTS, commentId, data);
}

export async function deleteComment(commentId: string): Promise<void> {
  await manageDelete(COLLECTIONS.COMMENTS, commentId);
}

export async function createComment(
  comment: Omit<Comment, "$id">,
  turnstileToken?: string | null,
): Promise<Comment> {
  return submitRow<Comment>(COLLECTIONS.COMMENTS, comment, turnstileToken);
}
