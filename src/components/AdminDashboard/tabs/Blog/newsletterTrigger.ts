import { BlogPost } from "@/types";

/**
 * Whether saving this post should send the newsletter broadcast.
 *
 * The rule is the *transition* into published, not the published flag itself:
 *
 * - new post, published        → send
 * - new post, draft            → no
 * - draft edited to published  → send  (this is the case that was missing)
 * - published post edited      → no    (typo fixes must not re-blast the list)
 * - published post unpublished → no
 *
 * Previously the send lived only in the "create" branch, so the common
 * workflow — save a draft, publish it later — never emailed anyone.
 *
 * `published` is normalised the same way postToFormData does it: older posts
 * predate the field, and `undefined` there has always meant published.
 */
export function shouldSendNewsletter(
  editingPost: BlogPost | null,
  formData: Partial<BlogPost>,
): boolean {
  const willBePublished = formData.published === true;
  if (!willBePublished) return false;

  if (!editingPost) return true;

  const wasPublished = editingPost.published !== false;
  return !wasPublished;
}
