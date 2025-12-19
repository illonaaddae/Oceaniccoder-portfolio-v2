import { useState, useEffect, useCallback } from "react";
import {
  getProjects,
  getFeaturedProjects,
  getCertifications,
  getSkills,
  getEducation,
  getGallery,
  getJourney,
  getAbout,
  getBlogPosts,
} from "@/services/api";
import type {
  Project,
  Certification,
  Skill,
  Education,
  GalleryImage,
  Journey,
  About,
  BlogPost,
} from "@/types";

// Static fallback data (imported from local files as backup)
import { PROJECTS_DATA } from "@/utils/data/projects";
import certifications_static from "@/utils/data/certifications";
import education_static from "@/utils/data/education";
import journey_static from "@/utils/data/journey";
import gallery_static from "@/utils/data/gallery";

interface PortfolioData {
  projects: Project[];
  featuredProjects: Project[];
  certifications: Certification[];
  skills: Skill[];
  education: Education[];
  gallery: GalleryImage[];
  journey: Journey[];
  blogPosts: BlogPost[];
  about: About | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Cache for data
const dataCache: {
  projects?: Project[];
  featuredProjects?: Project[];
  certifications?: Certification[];
  skills?: Skill[];
  education?: Education[];
  gallery?: GalleryImage[];
  journey?: Journey[];
  blogPosts?: BlogPost[];
  about?: About | null;
  timestamp?: number;
} = {};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function usePortfolioData(): PortfolioData {
  const [projects, setProjects] = useState<Project[]>([]);
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [journey, setJourney] = useState<Journey[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [about, setAbout] = useState<About | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCacheValid = () => {
    return (
      dataCache.timestamp && Date.now() - dataCache.timestamp < CACHE_DURATION
    );
  };

  const fetchData = useCallback(async () => {
    // Check cache first
    if (isCacheValid()) {
      setProjects(dataCache.projects || []);
      setFeaturedProjects(dataCache.featuredProjects || []);
      setCertifications(dataCache.certifications || []);
      setSkills(dataCache.skills || []);
      setEducation(dataCache.education || []);
      setGallery(dataCache.gallery || []);
      setJourney(dataCache.journey || []);
      setBlogPosts(dataCache.blogPosts || []);
      setAbout(dataCache.about || null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [
        projectsData,
        featuredData,
        certsData,
        skillsData,
        eduData,
        galleryData,
        journeyData,
        aboutData,
        blogData,
      ] = await Promise.allSettled([
        getProjects(),
        getFeaturedProjects(),
        getCertifications(),
        getSkills(),
        getEducation(),
        getGallery(),
        getJourney(),
        getAbout(),
        getBlogPosts(),
      ]);

      // Handle each result
      const handleResult = <T>(
        result: PromiseSettledResult<T[]>,
        fallback: T[],
        setter: React.Dispatch<React.SetStateAction<T[]>>
      ): T[] => {
        if (result.status === "fulfilled" && result.value.length > 0) {
          setter(result.value);
          return result.value;
        }
        setter(fallback);
        return fallback;
      };

      // Transform static data to match types
      const staticProjects = PROJECTS_DATA.map((p, idx) => ({
        ...p,
        $id: `static-${idx}`,
      })) as unknown as Project[];

      const staticCerts =
        (certifications_static?.map(
          (c: Record<string, unknown>, idx: number) => ({
            ...c,
            $id: `static-cert-${idx}`,
          })
        ) as unknown as Certification[]) || [];

      const staticEducation =
        (education_static?.map((e: Record<string, unknown>, idx: number) => ({
          ...e,
          $id: `static-edu-${idx}`,
        })) as unknown as Education[]) || [];

      const staticJourney =
        (journey_static?.map((j: Record<string, unknown>, idx: number) => ({
          ...j,
          $id: `static-journey-${idx}`,
        })) as unknown as Journey[]) || [];

      const staticGallery =
        (gallery_static?.map((g: Record<string, unknown>, idx: number) => ({
          ...g,
          $id: `static-gallery-${idx}`,
        })) as unknown as GalleryImage[]) || [];

      const fetchedProjects = handleResult(
        projectsData,
        staticProjects,
        setProjects
      );
      const fetchedFeatured = handleResult(
        featuredData,
        staticProjects.filter((p) => p.featured),
        setFeaturedProjects
      );
      handleResult(certsData, staticCerts, setCertifications);
      handleResult(skillsData, [], setSkills);
      handleResult(eduData, staticEducation, setEducation);
      handleResult(galleryData, staticGallery, setGallery);
      handleResult(journeyData, staticJourney, setJourney);

      // Handle blog posts
      if (blogData.status === "fulfilled" && blogData.value) {
        setBlogPosts(blogData.value);
        dataCache.blogPosts = blogData.value;
      } else {
        setBlogPosts([]);
        dataCache.blogPosts = [];
      }

      // Handle about (single document, not array)
      if (aboutData.status === "fulfilled" && aboutData.value) {
        setAbout(aboutData.value);
        dataCache.about = aboutData.value;
      } else {
        setAbout(null);
        dataCache.about = null;
      }

      // Update cache
      dataCache.projects = fetchedProjects;
      dataCache.featuredProjects = fetchedFeatured;
      dataCache.certifications =
        certsData.status === "fulfilled" ? certsData.value : staticCerts;
      dataCache.skills =
        skillsData.status === "fulfilled" ? skillsData.value : [];
      dataCache.education =
        eduData.status === "fulfilled" ? eduData.value : staticEducation;
      dataCache.gallery =
        galleryData.status === "fulfilled" ? galleryData.value : staticGallery;
      dataCache.journey =
        journeyData.status === "fulfilled" ? journeyData.value : staticJourney;
      dataCache.timestamp = Date.now();
    } catch (err) {
      console.error("Failed to fetch portfolio data:", err);
      setError("Failed to load data. Using cached data.");

      // Use static fallback
      const staticProjects = PROJECTS_DATA.map((p, idx) => ({
        ...p,
        $id: `static-${idx}`,
      })) as unknown as Project[];

      setProjects(staticProjects);
      setFeaturedProjects(staticProjects.filter((p) => p.featured));

      // Use static fallback for journey and gallery
      const staticJourneyFallback =
        (journey_static?.map((j: Record<string, unknown>, idx: number) => ({
          ...j,
          $id: `static-journey-${idx}`,
        })) as unknown as Journey[]) || [];
      setJourney(staticJourneyFallback);

      const staticGalleryFallback =
        (gallery_static?.map((g: Record<string, unknown>, idx: number) => ({
          ...g,
          $id: `static-gallery-${idx}`,
        })) as unknown as GalleryImage[]) || [];
      setGallery(staticGalleryFallback);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    projects,
    featuredProjects,
    certifications,
    skills,
    education,
    gallery,
    journey,
    blogPosts,
    about,
    loading,
    error,
    refetch: fetchData,
  };
}

// Individual hooks for specific data
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getProjects();
        setProjects(data);
      } catch (err) {
        console.error("Failed to fetch projects:", err);
        // Fallback to static data
        const staticProjects = PROJECTS_DATA.map((p, idx) => ({
          ...p,
          $id: `static-${idx}`,
        })) as unknown as Project[];
        setProjects(staticProjects);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { projects, loading };
}

export function useFeaturedProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getFeaturedProjects();
        if (data.length > 0) {
          setProjects(data);
        } else {
          // Fallback to static data
          const staticProjects = PROJECTS_DATA.filter((p) => p.featured).map(
            (p, idx) => ({
              ...p,
              $id: `static-${idx}`,
            })
          ) as unknown as Project[];
          setProjects(staticProjects);
        }
      } catch (err) {
        console.error("Failed to fetch featured projects:", err);
        const staticProjects = PROJECTS_DATA.filter((p) => p.featured).map(
          (p, idx) => ({
            ...p,
            $id: `static-${idx}`,
          })
        ) as unknown as Project[];
        setProjects(staticProjects);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { projects, loading };
}

export function useCertifications() {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getCertifications();
        setCertifications(data);
      } catch (err) {
        console.error("Failed to fetch certifications:", err);
        // Fallback
        const staticCerts =
          (certifications_static?.map(
            (c: Record<string, unknown>, idx: number) => ({
              ...c,
              $id: `static-cert-${idx}`,
            })
          ) as unknown as Certification[]) || [];
        setCertifications(staticCerts);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { certifications, loading };
}
