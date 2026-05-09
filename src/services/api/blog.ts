import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import type { BlogPost } from "../../types";

export async function getBlogPosts(): Promise<BlogPost[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.BLOG_POSTS,
    [Query.orderDesc("publishedAt")],
  );
  return response.documents as unknown as BlogPost[];
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.BLOG_POSTS,
    [Query.equal("slug", slug)],
  );
  if (response.documents.length === 0) throw new Error("Blog post not found");
  return response.documents[0] as unknown as BlogPost;
}

export async function createBlogPost(
  post: Omit<BlogPost, "$id">,
): Promise<BlogPost> {
  const cleanedData: Record<string, unknown> = {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
  };
  if (post.category) cleanedData.category = post.category;
  if (post.tags && post.tags.length > 0) cleanedData.tags = post.tags;
  if (post.publishedAt) cleanedData.publishedAt = post.publishedAt;
  if (post.readTime) cleanedData.readTime = post.readTime;
  if (post.image) cleanedData.image = post.image;
  if (post.featured !== undefined) cleanedData.featured = post.featured;
  if (post.published !== undefined) cleanedData.published = post.published;

  const result = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.BLOG_POSTS,
    ID.unique(),
    cleanedData,
  );
  return result as unknown as BlogPost;
}

export async function updateBlogPost(
  postId: string,
  post: Partial<Omit<BlogPost, "$id">>,
): Promise<BlogPost> {
  const cleanedData: Record<string, unknown> = {};
  if (post.title !== undefined) cleanedData.title = post.title;
  if (post.slug !== undefined) cleanedData.slug = post.slug;
  if (post.excerpt !== undefined) cleanedData.excerpt = post.excerpt;
  if (post.content !== undefined) cleanedData.content = post.content;
  if (post.category !== undefined) cleanedData.category = post.category || null;
  if (post.tags !== undefined)
    cleanedData.tags = post.tags && post.tags.length > 0 ? post.tags : [];
  if (post.publishedAt !== undefined)
    cleanedData.publishedAt = post.publishedAt || null;
  if (post.readTime !== undefined) cleanedData.readTime = post.readTime || null;
  if (post.image !== undefined) cleanedData.image = post.image || null;
  if (post.featured !== undefined) cleanedData.featured = post.featured;
  if (post.published !== undefined) cleanedData.published = post.published;

  const result = await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.BLOG_POSTS,
    postId,
    cleanedData,
  );
  return result as unknown as BlogPost;
}

export async function deleteBlogPost(postId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.BLOG_POSTS, postId);
}
