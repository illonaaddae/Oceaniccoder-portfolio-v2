import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { SKILLS_DATA } from "../utils/data/skills.jsx";
import { PROJECTS_DATA } from "../utils/data/projects";
import { BLOGS_DATA } from "../utils/data/blogs";
import { getProjects, getCertifications } from "../services/api";
import type { Project, Certification } from "../types";
import type { ProjectData, PortfolioContextType } from "./types";
import { navItems, projectFilters } from "./navData";

const PortfolioContext = createContext<PortfolioContextType | undefined>(
  undefined,
);

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error("usePortfolio must be used within a PortfolioProvider");
  }
  return context;
};

export const PortfolioProvider = ({ children }: { children: ReactNode }) => {
  const [activeSection, setActiveSection] = useState("home");
  const [activeSkillCategory, setActiveSkillCategory] = useState(0);
  const [activeProjectFilter, setActiveProjectFilter] = useState("All");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectData[]>(
    PROJECTS_DATA as ProjectData[],
  );
  const [certifications, setCertifications] = useState<Certification[]>([]);

  const skills = SKILLS_DATA;
  const blogs = BLOGS_DATA;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projectsData, certsData] = await Promise.allSettled([
        getProjects(),
        getCertifications(),
      ]);

      if (
        projectsData.status === "fulfilled" &&
        projectsData.value.length > 0
      ) {
        const transformed: ProjectData[] = projectsData.value.map(
          (p: Project) => ({
            id: parseInt(p.$id.replace(/\D/g, "")) || Math.random() * 1000,
            $id: p.$id,
            title: p.title,
            description: p.description,
            longDescription: p.longDescription,
            category: p.category,
            technologies: p.technologies || [],
            image: p.image,
            liveUrl: p.liveUrl,
            githubUrl: p.githubUrl,
            featured: p.featured,
            status: p.status,
            year: p.year,
            $createdAt: p.$createdAt,
          }),
        );
        // Sort newest first (API already orders this way, but guard the fallback too)
        transformed.sort((a, b) =>
          (b.$createdAt || "").localeCompare(a.$createdAt || ""),
        );
        setProjects(transformed);
      }

      if (certsData.status === "fulfilled") setCertifications(certsData.value);
    } catch (err) {
      console.error("Failed to fetch data from Appwrite:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const value = {
    activeSection,
    setActiveSection,
    activeSkillCategory,
    setActiveSkillCategory,
    activeProjectFilter,
    setActiveProjectFilter,
    isMenuOpen,
    setIsMenuOpen,
    skills,
    projects,
    blogs,
    certifications,
    navItems,
    projectFilters,
    navigationItems: navItems,
    loading,
    refetchData: fetchData,
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};
