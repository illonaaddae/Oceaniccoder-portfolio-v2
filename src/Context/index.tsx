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

interface ProjectData {
  id?: number;
  $id?: string;
  title: string;
  description: string;
  longDescription?: string;
  category: string;
  technologies: string[];
  image?: string;
  liveUrl?: string;
  githubUrl?: string;
  featured?: boolean;
  status?: string;
  year?: string;
}

interface PortfolioContextType {
  activeSection: string;
  setActiveSection: (section: string) => void;
  activeSkillCategory: number;
  setActiveSkillCategory: (index: number) => void;
  activeProjectFilter: string;
  setActiveProjectFilter: (filter: string) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  skills: typeof SKILLS_DATA;
  projects: ProjectData[];
  blogs: typeof BLOGS_DATA;
  certifications: Certification[];
  navigationItems: { label: string; href: string }[];
  projectFilters: string[];
  navItems: { id: string; label: string; href: string }[];
  loading: boolean;
  refetchData: () => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(
  undefined
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

  // Dynamic data from Appwrite (with static fallbacks)
  const [projects, setProjects] = useState<ProjectData[]>(
    PROJECTS_DATA as ProjectData[]
  );
  const [certifications, setCertifications] = useState<Certification[]>([]);

  // Static data
  const skills = SKILLS_DATA;
  const blogs = BLOGS_DATA;

  // Fetch data from Appwrite
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
        // Transform Appwrite data to match expected format
        const transformedProjects: ProjectData[] = projectsData.value.map(
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
          })
        );
        setProjects(transformedProjects);
      }

      if (certsData.status === "fulfilled") {
        setCertifications(certsData.value);
      }
    } catch (err) {
      console.error("Failed to fetch data from Appwrite:", err);
      // Keep static fallback data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Navigation items
  const navItems = [
    { id: "home", label: "Home", href: "/" },
    { id: "about", label: "About", href: "/about" },
    { id: "skills", label: "Skills", href: "/skills" },
    { id: "projects", label: "Projects", href: "/projects" },
    { id: "blog", label: "Blog", href: "/blog" },
    { id: "contact", label: "Contact", href: "/contact" },
  ];

  // Project filters
  const projectFilters = [
    "All",
    "Web Apps",
    "Mobile Apps",
    "AI/ML",
    "Open Source",
  ];

  const value = {
    // State
    activeSection,
    setActiveSection,
    activeSkillCategory,
    setActiveSkillCategory,
    activeProjectFilter,
    setActiveProjectFilter,
    isMenuOpen,
    setIsMenuOpen,

    // Data
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
