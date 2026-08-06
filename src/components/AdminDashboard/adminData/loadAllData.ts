import type {
  Message,
  Skill,
  Project,
  Certification,
  GalleryImage,
  Education,
  Journey,
  About,
  BlogPost,
  Testimonial,
} from "@/types";
import {
  getMessages,
  getSkills,
  getProjects,
  getCertifications,
  getGallery,
  getEducation,
  getJourney,
  getAbout,
  getBlogPosts,
  getTestimonials,
  getSiteViews,
} from "@/services/api";
import { invalidatePublicData } from "@/lib/queryClient";
import type { LoadDataFn, DataSetters } from "./types";

async function safeFetch<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.warn(`Failed to load ${label}:`, err);
    return fallback;
  }
}

export function createLoadData(setters: DataSetters): LoadDataFn {
  return async (showLoading = true) => {
    try {
      if (showLoading) setters.setLoading(true);
      setters.setError(null);

      const [
        messagesData,
        skillsData,
        projectsData,
        certificationsData,
        galleryData,
        educationData,
        journeyData,
        aboutData,
        blogPostsData,
        testimonialsData,
        siteViewsData,
      ] = await Promise.all([
        safeFetch(getMessages, [] as Message[], "messages"),
        safeFetch(getSkills, [] as Skill[], "skills"),
        safeFetch(getProjects, [] as Project[], "projects"),
        safeFetch(getCertifications, [] as Certification[], "certifications"),
        safeFetch(getGallery, [] as GalleryImage[], "gallery"),
        safeFetch(getEducation, [] as Education[], "education"),
        safeFetch(getJourney, [] as Journey[], "journey"),
        safeFetch(getAbout, null as About | null, "about"),
        safeFetch(getBlogPosts, [] as BlogPost[], "blog posts"),
        safeFetch(getTestimonials, [] as Testimonial[], "testimonials"),
        safeFetch(getSiteViews, 0, "site views"),
      ]);

      setters.setMessages(messagesData);
      setters.setSkills(skillsData);
      setters.setProjects(projectsData);
      setters.setCertifications(certificationsData);
      setters.setGallery(galleryData);
      setters.setEducation(educationData);
      setters.setJourney(journeyData);
      setters.setAbout(aboutData);
      setters.setBlogPosts(blogPostsData);
      setters.setTestimonials(testimonialsData);
      setters.setSiteViews(siteViewsData);
      setters.setError(null);

      // Every admin write funnels through here to refresh the dashboard, so
      // this is the one place that also has to tell the public-facing query
      // cache its data is out of date. Without it, a visitor already on the
      // site would keep seeing the pre-edit content until the stale window
      // elapsed.
      void invalidatePublicData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load data";
      setters.setError(errorMessage);
      console.error("Data loading error:", err);
    } finally {
      setters.setLoading(false);
    }
  };
}
