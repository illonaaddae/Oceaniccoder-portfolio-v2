import { BLOGS_DATA } from "../utils/data/blogs";
import type { Certification } from "../types";

export interface SkillEntry {
  name: string;
  level: number;
  icon: React.ReactNode;
}

export interface SkillCategory {
  category: string;
  skills: SkillEntry[];
}

export interface ProjectData {
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
  $createdAt?: string;
}

export interface PortfolioContextType {
  activeSection: string;
  setActiveSection: (section: string) => void;
  activeSkillCategory: number;
  setActiveSkillCategory: (index: number) => void;
  activeProjectFilter: string;
  setActiveProjectFilter: (filter: string) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  skills: SkillCategory[];
  projects: ProjectData[];
  blogs: typeof BLOGS_DATA;
  certifications: Certification[];
  navigationItems: { label: string; href: string }[];
  projectFilters: string[];
  navItems: { id: string; label: string; href: string }[];
  loading: boolean;
  refetchData: () => Promise<void>;
}
