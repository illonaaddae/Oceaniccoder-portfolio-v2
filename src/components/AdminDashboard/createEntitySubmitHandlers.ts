import type { Skill, Project, Certification } from "@/types";

interface EntitySubmitDeps {
  editingProject: Project | null;
  editingSkill: Skill | null;
  editingCertification: Certification | null;
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
  closeProjectModal: () => void;
  closeSkillModal: () => void;
  closeCertModal: () => void;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}

export function createEntitySubmitHandlers(deps: EntitySubmitDeps) {
  const handleProjectSubmit = async (data: Omit<Project, "$id">) => {
    try {
      if (deps.editingProject) {
        await deps.handleUpdateProject(deps.editingProject.$id, data);
        deps.showSuccess("Project updated successfully!");
      } else {
        await deps.handleAddProject(data);
        deps.showSuccess("Project created successfully!");
      }
      deps.closeProjectModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      deps.showError(`Failed to save project: ${msg}`);
    }
  };

  const handleSkillSubmit = async (data: Omit<Skill, "$id">) => {
    try {
      if (deps.editingSkill) {
        await deps.handleUpdateSkill(deps.editingSkill.$id, data);
        deps.showSuccess("Skill updated successfully!");
      } else {
        await deps.handleAddSkill(data);
        deps.showSuccess("Skill added successfully!");
      }
      deps.closeSkillModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      deps.showError(`Failed to save skill: ${msg}`);
    }
  };

  const handleCertSubmit = async (data: Omit<Certification, "$id">) => {
    try {
      if (deps.editingCertification) {
        await deps.handleUpdateCertification(
          deps.editingCertification.$id,
          data,
        );
        deps.showSuccess("Certification updated successfully!");
      } else {
        await deps.handleAddCertification(data);
        deps.showSuccess("Certification added successfully!");
      }
      deps.closeCertModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      deps.showError(`Failed to save certification: ${msg}`);
    }
  };

  return { handleProjectSubmit, handleSkillSubmit, handleCertSubmit };
}
