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
  getMessages,
  updateMessageStatus,
  deleteMessage,
  getSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
  getGallery,
  createGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
  getEducation,
  createEducation,
  updateEducation,
  deleteEducation,
  getJourney,
  createJourney,
  updateJourney,
  deleteJourney,
  getAbout,
  saveAbout,
  getBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} from "@/services/api";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      // Load data individually to identify which one fails
      let messagesData: Message[] = [];
      let skillsData: Skill[] = [];
      let projectsData: Project[] = [];
      let certificationsData: Certification[] = [];

      try {
        messagesData = await getMessages();
      } catch (err) {
        console.warn("Failed to load messages:", err);
      }

      try {
        skillsData = await getSkills();
      } catch (err) {
        console.warn("Failed to load skills:", err);
      }

      try {
        projectsData = await getProjects();
      } catch (err) {
        console.warn("Failed to load projects:", err);
      }

      try {
        certificationsData = await getCertifications();
      } catch (err) {
        console.warn("Failed to load certifications:", err);
      }

      let galleryData: GalleryImage[] = [];
      try {
        galleryData = await getGallery();
      } catch (err) {
        console.warn("Failed to load gallery:", err);
      }

      let educationData: Education[] = [];
      try {
        educationData = await getEducation();
      } catch (err) {
        console.warn("Failed to load education:", err);
      }

      let journeyData: Journey[] = [];
      try {
        journeyData = await getJourney();
      } catch (err) {
        console.warn("Failed to load journey:", err);
      }

      let aboutData: About | null = null;
      try {
        aboutData = await getAbout();
      } catch (err) {
        console.warn("Failed to load about:", err);
      }

      let blogPostsData: BlogPost[] = [];
      try {
        blogPostsData = await getBlogPosts();
      } catch (err) {
        console.warn("Failed to load blog posts:", err);
      }

      let testimonialsData: Testimonial[] = [];
      try {
        testimonialsData = await getTestimonials();
      } catch (err) {
        console.warn("Failed to load testimonials:", err);
      }

      setMessages(messagesData);
      setSkills(skillsData);
      setProjects(projectsData);
      setCertifications(certificationsData);
      setGallery(galleryData);
      setEducation(educationData);
      setJourney(journeyData);
      setAbout(aboutData);
      setBlogPosts(blogPostsData);
      setTestimonials(testimonialsData);
      setError(null); // Clear any previous errors since data loaded
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load data";
      setError(errorMessage);
      console.error("Data loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Message handlers
  const handleStatusChange = async (
    messageId: string,
    status: "new" | "read" | "replied"
  ) => {
    try {
      await updateMessageStatus(messageId, status);
      await loadData(false);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      await loadData(false);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Skill handlers
  const handleDeleteSkill = async (skillId: string) => {
    try {
      await deleteSkill(skillId);
      await loadData(false);
    } catch (err) {
      console.error("Failed to delete skill:", err);
      throw err;
    }
  };

  const handleAddSkill = async (
    skillForm: Omit<Skill, "$id" | "$createdAt">
  ) => {
    try {
      await createSkill(skillForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to add skill:", err);
      throw err;
    }
  };

  const handleUpdateSkill = async (
    skillId: string,
    skillForm: Partial<Omit<Skill, "$id" | "$createdAt">>
  ) => {
    try {
      await updateSkill(skillId, skillForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to update skill:", err);
      throw err;
    }
  };

  // Project handlers
  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm("Delete this project?")) {
      // User cancelled - throw to signal cancellation
      throw new Error("cancelled");
    }
    try {
      await deleteProject(projectId);
      await loadData(false);
    } catch (err) {
      console.error("Failed to delete project:", err);
      throw err;
    }
  };

  const handleAddProject = async (
    projectForm: Omit<Project, "$id" | "$createdAt">
  ) => {
    try {
      const result = await createProject(projectForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to add project:", err);
      throw err;
    }
  };

  const handleUpdateProject = async (
    projectId: string,
    projectForm: Partial<Omit<Project, "$id" | "$createdAt">>
  ) => {
    try {
      const result = await updateProject(projectId, projectForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to update project:", err);
      throw err;
    }
  };

  // Certification handlers
  const handleDeleteCertification = async (certId: string) => {
    if (window.confirm("Delete this certification?")) {
      try {
        await deleteCertification(certId);
        await loadData(false);
      } catch (err) {
        console.error("Failed to delete certification:", err);
        throw err;
      }
    }
  };

  const handleAddCertification = async (
    certForm: Omit<Certification, "$id" | "$createdAt">
  ) => {
    try {
      await createCertification(certForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to add certification:", err);
      throw err;
    }
  };

  const handleUpdateCertification = async (
    certId: string,
    certForm: Partial<Omit<Certification, "$id" | "$createdAt">>
  ) => {
    try {
      await updateCertification(certId, certForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to update certification:", err);
      throw err;
    }
  };

  // Gallery handlers
  const handleAddGalleryImage = async (
    imageForm: Omit<GalleryImage, "$id">
  ) => {
    try {
      await createGalleryImage(imageForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to add gallery image:", err);
      throw err;
    }
  };

  const handleUpdateGalleryImage = async (
    imageId: string,
    imageForm: Partial<Omit<GalleryImage, "$id">>
  ) => {
    try {
      await updateGalleryImage(imageId, imageForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to update gallery image:", err);
      throw err;
    }
  };

  const handleDeleteGalleryImage = async (imageId: string) => {
    try {
      await deleteGalleryImage(imageId);
      await loadData(false);
    } catch (err) {
      console.error("Failed to delete gallery image:", err);
      throw err;
    }
  };

  const handleUpdateGalleryOrder = async (
    imageId: string,
    newOrder: number
  ) => {
    try {
      await updateGalleryImage(imageId, { order: newOrder });
      await loadData(false);
    } catch (err) {
      console.error("Failed to update gallery order:", err);
      throw err;
    }
  };

  const handleToggleGalleryVisibility = async (
    imageId: string,
    isPublic: boolean
  ) => {
    try {
      await updateGalleryImage(imageId, { isPublic });
      await loadData(false);
    } catch (err) {
      console.error("Failed to toggle gallery visibility:", err);
      throw err;
    }
  };

  // Education handlers
  const handleAddEducation = async (eduForm: Omit<Education, "$id">) => {
    try {
      await createEducation(eduForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to add education:", err);
      throw err;
    }
  };

  const handleUpdateEducation = async (
    eduId: string,
    eduForm: Partial<Omit<Education, "$id">>
  ) => {
    try {
      await updateEducation(eduId, eduForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to update education:", err);
      throw err;
    }
  };

  const handleDeleteEducation = async (eduId: string) => {
    try {
      await deleteEducation(eduId);
      await loadData(false);
    } catch (err) {
      console.error("Failed to delete education:", err);
      throw err;
    }
  };

  // Journey handlers
  const handleAddJourney = async (journeyForm: Omit<Journey, "$id">) => {
    try {
      await createJourney(journeyForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to add journey:", err);
      throw err;
    }
  };

  const handleUpdateJourney = async (
    journeyId: string,
    journeyForm: Partial<Omit<Journey, "$id">>
  ) => {
    try {
      await updateJourney(journeyId, journeyForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to update journey:", err);
      throw err;
    }
  };

  const handleDeleteJourney = async (journeyId: string) => {
    try {
      await deleteJourney(journeyId);
      await loadData(false);
    } catch (err) {
      console.error("Failed to delete journey:", err);
      throw err;
    }
  };

  // About handler (uses database)
  const handleSaveAbout = async (aboutForm: Partial<About>) => {
    try {
      const savedAbout = await saveAbout(aboutForm);
      setAbout(savedAbout);
      await loadData(false);
    } catch (err) {
      console.error("Failed to save about:", err);
      throw err;
    }
  };

  // Blog Post handlers
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
    postForm: Partial<Omit<BlogPost, "$id">>
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

  // Testimonial handlers
  const handleAddTestimonial = async (
    testimonialForm: Omit<Testimonial, "$id" | "$createdAt">
  ) => {
    try {
      await createTestimonial(testimonialForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to add testimonial:", err);
      throw err;
    }
  };

  const handleUpdateTestimonial = async (
    testimonialId: string,
    testimonialForm: Partial<Omit<Testimonial, "$id" | "$createdAt">>
  ) => {
    try {
      await updateTestimonial(testimonialId, testimonialForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to update testimonial:", err);
      throw err;
    }
  };

  const handleDeleteTestimonial = async (testimonialId: string) => {
    try {
      await deleteTestimonial(testimonialId);
      await loadData(false);
    } catch (err) {
      console.error("Failed to delete testimonial:", err);
      throw err;
    }
  };

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
    loading,
    error,
    loadData,
    handleStatusChange,
    handleDeleteMessage,
    handleDeleteSkill,
    handleAddSkill,
    handleUpdateSkill,
    handleDeleteProject,
    handleAddProject,
    handleUpdateProject,
    handleDeleteCertification,
    handleAddCertification,
    handleUpdateCertification,
    handleAddGalleryImage,
    handleUpdateGalleryImage,
    handleDeleteGalleryImage,
    handleUpdateGalleryOrder,
    handleToggleGalleryVisibility,
    handleAddEducation,
    handleUpdateEducation,
    handleDeleteEducation,
    handleAddJourney,
    handleUpdateJourney,
    handleDeleteJourney,
    handleSaveAbout,
    handleAddBlogPost,
    handleUpdateBlogPost,
    handleDeleteBlogPost,
    handleAddTestimonial,
    handleUpdateTestimonial,
    handleDeleteTestimonial,
  };
};
