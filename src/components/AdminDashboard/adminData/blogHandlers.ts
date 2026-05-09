import type { BlogPost } from "@/types";
import { createBlogPost, updateBlogPost, deleteBlogPost } from "@/services/api";
import type { LoadDataFn } from "./types";

export function createBlogHandlers(loadData: LoadDataFn) {
  const handleAddBlogPost = async (postForm: Omit<BlogPost, "$id">) => {
    try {
      await createBlogPost(postForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to add blog post:", err);
      throw err;
    }
  };

  const handleUpdateBlogPost = async (
    postId: string,
    postForm: Partial<Omit<BlogPost, "$id">>,
  ) => {
    try {
      await updateBlogPost(postId, postForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to update blog post:", err);
      throw err;
    }
  };

  const handleDeleteBlogPost = async (postId: string) => {
    try {
      await deleteBlogPost(postId);
      await loadData(false);
    } catch (err) {
      console.error("Failed to delete blog post:", err);
      throw err;
    }
  };

  return { handleAddBlogPost, handleUpdateBlogPost, handleDeleteBlogPost };
}
