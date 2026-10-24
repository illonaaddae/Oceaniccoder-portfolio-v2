import { COLLECTIONS } from "./collections";
import type { BlogPost } from "../../types";
import { listRows, manageCreate, manageDelete, manageUpdate } from "./dataApi";

export async function getBlogPosts(): Promise<BlogPost[]> {
  const response = await listRows(COLLECTIONS.BLOG_POSTS, { orderBy: "publishedAt", dir: "desc" });
  return response.documents as unknown as BlogPost[];
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost> {
  const response = await listRows(COLLECTIONS.BLOG_POSTS, { where: { slug } });
  if (response.documents.length === 0) throw new Error("Blog post not found");
  return response.documents[0] as unknown as BlogPost;
}

export async function createBlogPost(post: Omit<BlogPost, "$id">): Promise<BlogPost> {
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

  return manageCreate<BlogPost>(COLLECTIONS.BLOG_POSTS, cleanedData);
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
  if (post.publishedAt !== undefined) cleanedData.publishedAt = post.publishedAt || null;
  if (post.readTime !== undefined) cleanedData.readTime = post.readTime || null;
  if (post.image !== undefined) cleanedData.image = post.image || null;
  if (post.featured !== undefined) cleanedData.featured = post.featured;
  if (post.published !== undefined) cleanedData.published = post.published;

  return manageUpdate<BlogPost>(COLLECTIONS.BLOG_POSTS, postId, cleanedData);
}

export async function deleteBlogPost(postId: string): Promise<void> {
  await manageDelete(COLLECTIONS.BLOG_POSTS, postId);
}
