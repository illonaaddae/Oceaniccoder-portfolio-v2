import type { GalleryImage, Education, Journey } from "@/types";

interface ContentSubmitDeps {
  editingEducation: Education | null;
  editingJourney: Journey | null;
  editingGalleryImage: GalleryImage | null;
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
  closeEducationModal: () => void;
  closeJourneyModal: () => void;
  closeGalleryModal: () => void;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}

export function createContentSubmitHandlers(deps: ContentSubmitDeps) {
  const handleEducationSubmit = async (data: Omit<Education, "$id">) => {
    try {
      if (deps.editingEducation) {
        await deps.handleUpdateEducation(deps.editingEducation.$id, data);
        deps.showSuccess("Education updated successfully!");
      } else {
        await deps.handleAddEducation(data);
        deps.showSuccess("Education added successfully!");
      }
      deps.closeEducationModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      deps.showError(`Failed to save education: ${msg}`);
    }
  };

  const handleJourneySubmit = async (data: Omit<Journey, "$id">) => {
    try {
      if (deps.editingJourney) {
        await deps.handleUpdateJourney(deps.editingJourney.$id, data);
        deps.showSuccess("Journey milestone updated successfully!");
      } else {
        await deps.handleAddJourney(data);
        deps.showSuccess("Journey milestone added successfully!");
      }
      deps.closeJourneyModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      deps.showError(`Failed to save journey: ${msg}`);
    }
  };

  const handleGallerySubmit = async (data: Omit<GalleryImage, "$id">) => {
    try {
      if (deps.editingGalleryImage) {
        await deps.handleUpdateGalleryImage(deps.editingGalleryImage.$id, data);
        deps.showSuccess("Gallery image updated successfully!");
      } else {
        await deps.handleAddGalleryImage(data);
        deps.showSuccess("Gallery image added successfully!");
      }
      deps.closeGalleryModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      deps.showError(`Failed to save gallery image: ${msg}`);
    }
  };

  return { handleEducationSubmit, handleJourneySubmit, handleGallerySubmit };
}
