import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import { transformAppwriteSkills } from "../utils/data/skillsTransformer.js";
import { PROJECTS_DATA } from "../utils/data/projects";
import { BLOGS_DATA } from "../utils/data/blogs";
import { getProjects, getCertifications, getSkills } from "../services/api";
import type { Project, Certification, Skill } from "../types";
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
  const [appwriteSkills, setAppwriteSkills] = useState<Skill[]>([]);

  const blogs = BLOGS_DATA;

  // Derive grouped skills: prefer live Appwrite data, fall back to static file
  const skills = useMemo(
    () => transformAppwriteSkills(appwriteSkills),
    [appwriteSkills],
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projectsData, certsData, skillsData] = await Promise.allSettled([
        getProjects(),
        getCertifications(),
        getSkills(),
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
        transformed.sort((a, b) =>
          (b.$createdAt || "").localeCompare(a.$createdAt || ""),
        );
        setProjects(transformed);
      }

      if (certsData.status === "fulfilled") setCertifications(certsData.value);

      if (skillsData.status === "fulfilled" && skillsData.value.length > 0) {
        setAppwriteSkills(skillsData.value);
      } else {
        // Keep empty so useMemo falls back to SKILLS_DATA
        setAppwriteSkills([]);
      }
    } catch (err) {
      console.error("Failed to fetch data from Appwrite:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
