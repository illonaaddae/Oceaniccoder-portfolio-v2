import { useState, useEffect } from "react";
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
  createLoadData,
  createMessageHandlers,
  createSkillHandlers,
  createProjectHandlers,
  createCertificationHandlers,
  createGalleryHandlers,
  createEducationHandlers,
  createJourneyHandlers,
  createAboutHandlers,
  createBlogHandlers,
  createTestimonialHandlers,
} from "./adminData";

export const useAdminData = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [journey, setJourney] = useState<Journey[]>([]);
  const [about, setAbout] = useState<About | null>(null);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [siteViews, setSiteViews] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = createLoadData({
    setMessages,
    setSkills,
    setProjects,
    setCertifications,
    setGallery,
    setEducation,
    setJourney,
    setAbout,
    setBlogPosts,
    setTestimonials,
    setSiteViews,
    setLoading,
    setError,
  });

  useEffect(() => {
    loadData();
  }, []);

  return {
    messages,
    skills,
    projects,
    certifications,
    gallery,
    education,
    journey,
    about,
    blogPosts,
    testimonials,
    siteViews,
    loading,
    error,
    loadData,
    ...createMessageHandlers(loadData),
    ...createSkillHandlers(loadData),
    ...createProjectHandlers(loadData),
    ...createCertificationHandlers(loadData),
    ...createGalleryHandlers(loadData),
    ...createEducationHandlers(loadData),
    ...createJourneyHandlers(loadData),
    ...createAboutHandlers(loadData, setAbout),
    ...createBlogHandlers(loadData),
    ...createTestimonialHandlers(loadData),
  };
};
