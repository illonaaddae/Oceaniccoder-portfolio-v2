import type { IconType } from "react-icons";
import type {
  Skill,
  Message,
  Project,
  Certification,
  GalleryImage,
  Education,
  Journey,
  BlogPost,
  Testimonial,
} from "@/types";

export interface OverviewTabProps {
  theme: "light" | "dark";
  totalProjects: number;
  filteredSkills: Skill[];
  totalCertifications: number;
  totalGallery: number;
  newMessages: number;
  totalMessages: number;
  /** Data sources for the Recent Activity feed. */
  activityProjects?: Project[];
  activityMessages?: Message[];
  activityCertifications?: Certification[];
  activityGallery?: GalleryImage[];
  activityEducation?: Education[];
  activityJourney?: Journey[];
  activityBlogPosts?: BlogPost[];
  activityTestimonials?: Testimonial[];
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
