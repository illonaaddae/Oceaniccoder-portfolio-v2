import type { Project } from "@/types";
import { createProject, updateProject, deleteProject } from "@/services/api";
import type { LoadDataFn } from "./types";

export function createProjectHandlers(loadData: LoadDataFn) {
  const handleAddProject = async (
    projectForm: Omit<Project, "$id" | "$createdAt">,
  ) => {
    try {
      await createProject(projectForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to add project:", err);
      throw err;
    }
  };

  const handleUpdateProject = async (
    projectId: string,
    projectForm: Partial<Omit<Project, "$id" | "$createdAt">>,
  ) => {
    try {
      await updateProject(projectId, projectForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to update project:", err);
      throw err;
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm("Delete this project?")) {
      throw new Error("cancelled");
    }
    try {
      await deleteProject(projectId);
      await loadData(false);
    } catch (err) {
      console.error("Failed to delete project:", err);
      throw err;
    }
  };

  return { handleAddProject, handleUpdateProject, handleDeleteProject };
}
