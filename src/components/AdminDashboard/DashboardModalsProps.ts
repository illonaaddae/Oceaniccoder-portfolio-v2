import type {
  Skill,
  Project,
  Certification,
  GalleryImage,
  Education,
  Journey,
  Testimonial,
} from "@/types";

export interface DashboardModalsProps {
  theme: "light" | "dark";
  showProjectModal: boolean;
  editingProject: Project | null;
  onCloseProject: () => void;
  onSubmitProject: (data: Omit<Project, "$id">) => Promise<void>;
  showSkillModal: boolean;
  editingSkill: Skill | null;
  onCloseSkill: () => void;
  onSubmitSkill: (data: Omit<Skill, "$id">) => Promise<void>;
  showCertModal: boolean;
  editingCertification: Certification | null;
  onCloseCert: () => void;
  onSubmitCert: (data: Omit<Certification, "$id">) => Promise<void>;
  showEducationModal: boolean;
  editingEducation: Education | null;
  onCloseEducation: () => void;
  onSubmitEducation: (data: Omit<Education, "$id">) => Promise<void>;
  showJourneyModal: boolean;
  editingJourney: Journey | null;
  onCloseJourney: () => void;
  onSubmitJourney: (data: Omit<Journey, "$id">) => Promise<void>;
  showGalleryModal: boolean;
  editingGalleryImage: GalleryImage | null;
  onCloseGallery: () => void;
  onSubmitGallery: (data: Omit<GalleryImage, "$id">) => Promise<void>;
  showTestimonialModal: boolean;
  editingTestimonial: Testimonial | null;
  onCloseTestimonial: () => void;
  onSubmitTestimonial: (data: Omit<Testimonial, "$id">) => Promise<void>;
}
