/**
 * Individual data hooks for specific domains
 * @module hooks/portfolioData/individualHooks
 */

import { useState, useEffect } from "react";
import {
  getProjects,
  getFeaturedProjects,
  getCertifications,
} from "@/services/api";
import type { Project, Certification } from "@/types";
import { getStaticProjects, getStaticCertifications } from "./fallbacks";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await getProjects();
        setProjects(data);
      } catch (err) {
        console.error("Failed to fetch projects:", err);
        setProjects(getStaticProjects());
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  return { projects, loading };
}

export function useFeaturedProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const data = await getFeaturedProjects();
        if (data.length > 0) {
          setProjects(data);
        } else {
          setProjects(getStaticProjects().filter((p) => p.featured));
        }
      } catch (err) {
        console.error("Failed to fetch featured projects:", err);
        setProjects(getStaticProjects().filter((p) => p.featured));
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  return { projects, loading };
}

export function useCertifications() {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCerts = async () => {
      try {
        const data = await getCertifications();
        setCertifications(data);
      } catch (err) {
        console.error("Failed to fetch certifications:", err);
        setCertifications(getStaticCertifications());
      } finally {
        setLoading(false);
      }
    };
    fetchCerts();
  }, []);

  return { certifications, loading };
}
