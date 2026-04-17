import type { IconType } from "react-icons";
import type { Skill, Message, Project } from "@/types";

export interface OverviewTabProps {
  theme: "light" | "dark";
  totalProjects: number;
  filteredSkills: Skill[];
  totalCertifications: number;
  totalGallery: number;
  newMessages: number;
  totalMessages: number;
  recentMessages?: Message[];
  recentProjects?: Project[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onNewProject?: () => void;
  onAddCertification?: () => void;
  onNavigateToTab?: (tab: string) => void;
  isReadOnly?: boolean;
  loading?: boolean;
  siteViews?: number;
}

export interface StatItem {
  label: string;
  value: number;
  change: string;
  icon: IconType;
  bgGradient: string;
  tabLink: string | null;
}
