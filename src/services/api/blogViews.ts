import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import type { BlogView, BlogViewStats } from "../../types";

/** Appwrite's per-request document ceiling. */
const PAGE_SIZE = 100;

const EMPTY: BlogViewStats = { readers: 0, reads: 0 };

/**
 * One document per (post, visitor): `reads` counts that person's repeat
 * visits, so the row count is unique readers and the sum of `reads` is total
 * reads. Storing it this way keeps a refresh from inflating reach while still
 * showing how often a post gets re-opened.
 */
function aggregate(views: BlogView[]): Record<string, BlogViewStats> {
  const stats: Record<string, BlogViewStats> = {};
  for (const view of views) {
    const current = stats[view.postId] ?? { readers: 0, reads: 0 };
    stats[view.postId] = {
      readers: current.readers + 1,
      reads: current.reads + Math.max(1, view.reads ?? 1),
    };
  }
  return stats;
}

/** Walk every page of a query — counts are only right with the whole set. */
async function listAll(queries: string[]): Promise<BlogView[]> {
  const all: BlogView[] = [];
  let cursor: string | null = null;

  for (;;) {
    const paged = [...queries, Query.limit(PAGE_SIZE)];
    if (cursor) paged.push(Query.cursorAfter(cursor));

    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.BLOG_VIEWS, paged);
    const documents = response.documents as unknown as BlogView[];
    all.push(...documents);

    if (documents.length < PAGE_SIZE) return all;
    cursor = documents[documents.length - 1].$id;
  }
}

/** Readership for one post. Returns zeroes rather than throwing into the UI. */
export async function getPostViewStats(postId: string): Promise<BlogViewStats> {
  try {
    const views = await listAll([Query.equal("postId", postId)]);
    return aggregate(views)[postId] ?? { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

/** Readership for every post, keyed by post id — one round trip for a list. */
export async function getAllBlogViewStats(): Promise<Record<string, BlogViewStats>> {
  try {
    return aggregate(await listAll([]));
  } catch {
    return {};
  }
}

/**
 * Record that this visitor opened the post: a new row the first time, an
 * incremented `reads` on every later visit. Returns the post's stats after
 * the write so callers can render without a second fetch.
 */
export async function recordBlogView(
  postId: string,
  visitorId: string,
): Promise<BlogViewStats | null> {
  try {
    const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.BLOG_VIEWS, [
      Query.equal("postId", postId),
      Query.equal("visitorId", visitorId),
      Query.limit(1),
    ]);

    if (existing.documents.length > 0) {
      const doc = existing.documents[0] as unknown as BlogView;
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.BLOG_VIEWS, doc.$id, {
        reads: Math.max(1, doc.reads ?? 1) + 1,
        lastReadAt: new Date().toISOString(),
      });
    } else {
      await databases.createDocument(DATABASE_ID, COLLECTIONS.BLOG_VIEWS, ID.unique(), {
        postId,
        visitorId,
        reads: 1,
        lastReadAt: new Date().toISOString(),
      });
    }

    return getPostViewStats(postId);
  } catch {
    // A view that fails to record must never break the article.
    return null;
  }
}
