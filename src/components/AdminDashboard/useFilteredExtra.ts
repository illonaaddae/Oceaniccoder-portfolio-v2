import { useMemo } from "react";
import type { GalleryImage, Education, Journey, BlogPost } from "@/types";

export function useFilteredExtra(
  searchQuery: string,
  gallery: GalleryImage[],
  education: Education[],
  journey: Journey[],
  blogPosts: BlogPost[],
) {
  const q = searchQuery.toLowerCase();

  const filteredGallery = useMemo(
    () =>
      gallery.filter(
        (img) =>
          img.alt?.toLowerCase().includes(q) ||
          img.caption?.toLowerCase().includes(q),
      ),
    [gallery, q],
  );

  const filteredEducation = useMemo(
    () =>
      education.filter(
        (edu) =>
          edu.institution?.toLowerCase().includes(q) ||
          edu.degree?.toLowerCase().includes(q) ||
          edu.field?.toLowerCase().includes(q) ||
          edu.description?.toLowerCase().includes(q),
      ),
    [education, q],
  );

  const filteredJourney = useMemo(
    () =>
      journey.filter(
        (j) =>
          j.role?.toLowerCase().includes(q) ||
          j.company?.toLowerCase().includes(q) ||
          j.location?.toLowerCase().includes(q) ||
          j.description?.toLowerCase().includes(q),
      ),
    [journey, q],
  );

  const filteredBlogPosts = useMemo(
    () =>
      blogPosts.filter(
        (post) =>
          post.title?.toLowerCase().includes(q) ||
          post.excerpt?.toLowerCase().includes(q) ||
          post.category?.toLowerCase().includes(q) ||
          post.tags?.some((tag) => tag.toLowerCase().includes(q)),
      ),
    [blogPosts, q],
  );

  return {
    filteredGallery,
    filteredEducation,
    filteredJourney,
    filteredBlogPosts,
  };
}
