import type { Dispatch, SetStateAction } from "react";
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

export type LoadDataFn = (showLoading?: boolean) => Promise<void>;

export interface DataSetters {
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setSkills: Dispatch<SetStateAction<Skill[]>>;
  setProjects: Dispatch<SetStateAction<Project[]>>;
  setCertifications: Dispatch<SetStateAction<Certification[]>>;
  setGallery: Dispatch<SetStateAction<GalleryImage[]>>;
  setEducation: Dispatch<SetStateAction<Education[]>>;
  setJourney: Dispatch<SetStateAction<Journey[]>>;
  setAbout: Dispatch<SetStateAction<About | null>>;
  setBlogPosts: Dispatch<SetStateAction<BlogPost[]>>;
  setTestimonials: Dispatch<SetStateAction<Testimonial[]>>;
  setSiteViews: Dispatch<SetStateAction<number>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
}
