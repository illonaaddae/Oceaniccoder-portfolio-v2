import type {
  Skill,
  Project,
  Certification,
  GalleryImage,
  Education,
  Journey,
} from "@/types";
import { createEntitySubmitHandlers } from "./createEntitySubmitHandlers";
import { createContentSubmitHandlers } from "./createContentSubmitHandlers";

interface SubmitHandlersDeps {
  editingProject: Project | null;
  editingSkill: Skill | null;
  editingCertification: Certification | null;
  editingEducation: Education | null;
  editingJourney: Journey | null;
  editingGalleryImage: GalleryImage | null;
  handleAddProject: (data: Omit<Project, "$id">) => Promise<void>;
  handleUpdateProject: (
    id: string,
    data: Omit<Project, "$id">,
  ) => Promise<void>;
  handleAddSkill: (data: Omit<Skill, "$id">) => Promise<void>;
  handleUpdateSkill: (id: string, data: Omit<Skill, "$id">) => Promise<void>;
  handleAddCertification: (data: Omit<Certification, "$id">) => Promise<void>;
  handleUpdateCertification: (
    id: string,
    data: Omit<Certification, "$id">,
  ) => Promise<void>;
  handleAddEducation: (data: Omit<Education, "$id">) => Promise<void>;
  handleUpdateEducation: (
    id: string,
    data: Omit<Education, "$id">,
  ) => Promise<void>;
  handleAddJourney: (data: Omit<Journey, "$id">) => Promise<void>;
  handleUpdateJourney: (
    id: string,
    data: Omit<Journey, "$id">,
  ) => Promise<void>;
  handleAddGalleryImage: (data: Omit<GalleryImage, "$id">) => Promise<void>;
  handleUpdateGalleryImage: (
    id: string,
    data: Omit<GalleryImage, "$id">,
  ) => Promise<void>;
  closeProjectModal: () => void;
  closeSkillModal: () => void;
  closeCertModal: () => void;
  closeEducationModal: () => void;
  closeJourneyModal: () => void;
  closeGalleryModal: () => void;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}

export function createSubmitHandlers(deps: SubmitHandlersDeps) {
  const entity = createEntitySubmitHandlers(deps);
  const content = createContentSubmitHandlers(deps);
  return { ...entity, ...content };
}
