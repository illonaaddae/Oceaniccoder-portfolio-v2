/**
 * Main portfolio data hook - fetches all data with cache
 * @module hooks/portfolioData/usePortfolioData
 */

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
import { dataCache, isCacheValid } from "./types";
import type { PortfolioData } from "./types";
import {
  getStaticProjects,
  getStaticCertifications,
  getStaticEducation,
  getStaticJourney,
  getStaticGallery,
} from "./fallbacks";

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

  const fetchData = useCallback(async () => {
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
      const results = await Promise.allSettled([
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

      const handle = <T>(
        r: PromiseSettledResult<T[]>,
        fb: T[],
        setter: React.Dispatch<React.SetStateAction<T[]>>,
      ): T[] => {
        if (r.status === "fulfilled" && r.value.length > 0) {
          setter(r.value);
          return r.value;
        }
        setter(fb);
        return fb;
      };

      const sp = getStaticProjects();
      const cached = {
        projects: handle(results[0], sp, setProjects),
        featuredProjects: handle(
          results[1],
          sp.filter((p) => p.featured),
          setFeaturedProjects,
        ),
        certifications: handle(
          results[2],
          getStaticCertifications(),
          setCertifications,
        ),
        skills: handle(results[3], [], setSkills),
        education: handle(results[4], getStaticEducation(), setEducation),
        gallery: handle(results[5], getStaticGallery(), setGallery),
        journey: handle(results[6], getStaticJourney(), setJourney),
      };

      const blogResult = results[8];
      if (blogResult.status === "fulfilled" && blogResult.value) {
        setBlogPosts(blogResult.value as BlogPost[]);
        dataCache.blogPosts = blogResult.value as BlogPost[];
      } else {
        setBlogPosts([]);
        dataCache.blogPosts = [];
      }

      const aboutResult = results[7];
      if (aboutResult.status === "fulfilled" && aboutResult.value) {
        setAbout(aboutResult.value as About);
        dataCache.about = aboutResult.value as About;
      } else {
        setAbout(null);
        dataCache.about = null;
      }

      Object.assign(dataCache, cached, { timestamp: Date.now() });
    } catch (err) {
      console.error("Failed to fetch portfolio data:", err);
      setError("Failed to load data. Using cached data.");
      setProjects(getStaticProjects());
      setFeaturedProjects(getStaticProjects().filter((p) => p.featured));
      setJourney(getStaticJourney());
      setGallery(getStaticGallery());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const publicGallery = gallery.filter((img) => img.isPublic !== false);

  return {
    projects,
    featuredProjects,
    certifications,
    skills,
    education,
    gallery: publicGallery,
    journey,
    blogPosts,
    about,
    loading,
    error,
    refetch: fetchData,
  };
}
