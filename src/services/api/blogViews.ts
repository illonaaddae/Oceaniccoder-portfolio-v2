import { getJson, postJson } from "./dataApi";
import { ensureVisitor } from "./visitor";
import type { BlogViewStats } from "../../types";

const EMPTY: BlogViewStats = { readers: 0, reads: 0 };

/** Readership for one post. Returns zeroes rather than throwing into the UI. */
export async function getPostViewStats(postId: string): Promise<BlogViewStats> {
  try {
    return await getJson<BlogViewStats>(
      `/api/counters/blog-views?postId=${encodeURIComponent(postId)}`,
    );
  } catch {
    return { ...EMPTY };
  }
}

/** Readership for every post, keyed by post id — one round trip for a list. */
export async function getAllBlogViewStats(): Promise<Record<string, BlogViewStats>> {
  try {
    return await getJson<Record<string, BlogViewStats>>("/api/counters/blog-views");
  } catch {
    return {};
  }
}

/**
 * Record that this visitor opened the post: the server counts unique readers
 * (by its signed visitor cookie) and repeat reads. Returns the post's stats
 * after the write so callers can render without a second fetch.
 */
export async function recordBlogView(postId: string): Promise<BlogViewStats | null> {
  try {
    await ensureVisitor();
    return await postJson<BlogViewStats>("/api/counters/blog-view", { postId });
  } catch {
    // A view that fails to record must never break the article.
    return null;
  }
}
