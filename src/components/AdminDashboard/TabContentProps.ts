import type { TabType } from "./types";
import type {
  Skill,
  Project,
  Certification,
  GalleryImage,
  Education,
  Journey,
  About,
  BlogPost,
  Testimonial,
  Message,
} from "@/types";

export interface TabContentProps {
  activeTab: TabType;
  theme: "light" | "dark";
  loading: boolean;
  isReadOnly: boolean;
  searchQuery: string;
  filteredMessages: Message[];
  filteredSkills: Skill[];
  filteredProjects: Project[];
  filteredCertifications: Certification[];
  filteredGallery: GalleryImage[];
  filteredEducation: Education[];
  filteredJourney: Journey[];
  filteredBlogPosts: BlogPost[];
  newMessages: number;
  totalMessages: number;
  totalProjects: number;
  totalCertifications: number;
  totalGallery: number;
  siteViews: number;
  onSearchChange: (q: string) => void;
  onTabChange: (tab: TabType) => void;
  openNewProject: () => void;
  openEditProject: (p: Project) => void;
  openNewSkill: () => void;
  openEditSkill: (s: Skill) => void;
  openNewCertification: () => void;
  openEditCertification: (c: Certification) => void;
  openNewEducation: () => void;
  openEditEducation: (e: Education) => void;
  openNewJourney: () => void;
  openEditJourney: (j: Journey) => void;
  openNewGalleryImage: () => void;
  openEditGalleryImage: (img: GalleryImage) => void;
  handleMessageStatusChange: (
    id: string,
    status: "new" | "read" | "replied",
  ) => void;
  requestDeleteMessage: (id: string) => void;
  requestDeleteSkill: (id: string, name?: string) => void;
  handleDeleteProject: (id: string) => Promise<void>;
  handleDeleteCertification: (id: string) => Promise<void>;
  handleDeleteGalleryImage: (id: string) => Promise<void>;
  handleUpdateGalleryOrder: (id: string, order: number) => Promise<void>;
  handleToggleGalleryVisibility: (
    id: string,
    visible: boolean,
  ) => Promise<void>;
  handleDeleteEducation: (id: string) => Promise<void>;
  handleDeleteJourney: (id: string) => Promise<void>;
  about: About | null;
  handleSaveAbout: (data: Partial<About>) => Promise<void>;
  handleAddBlogPost: (post: Partial<BlogPost>) => Promise<void>;
  handleUpdateBlogPost: (id: string, data: Partial<BlogPost>) => Promise<void>;
  handleDeleteBlogPost: (id: string) => Promise<void>;
  testimonials: Testimonial[];
  handleDeleteTestimonial: (id: string) => Promise<void>;
  handleUpdateTestimonial: (
    id: string,
    data: Omit<Testimonial, "$id">,
  ) => Promise<void>;
  handleAddTestimonial: (data: Omit<Testimonial, "$id">) => Promise<void>;
  setEditingTestimonial: (t: Testimonial | null) => void;
  setShowTestimonialModal: (show: boolean) => void;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}
