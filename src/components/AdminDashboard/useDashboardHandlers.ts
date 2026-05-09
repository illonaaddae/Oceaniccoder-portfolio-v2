import { useModalState } from "./useModalState";
import { useDeleteConfirm } from "./useDeleteConfirm";
import { createSubmitHandlers } from "./useSubmitHandlers";
import { useAdminData } from "./useAdminData";
import type { Testimonial } from "@/types";

type AdminData = ReturnType<typeof useAdminData>;

export function useDashboardHandlers(
  isReadOnly: boolean,
  showError: (msg: string) => void,
  showSuccess: (msg: string) => void,
  adminData: AdminData,
) {
  const modals = useModalState(isReadOnly, showError);

  const deleteConfirmHook = useDeleteConfirm(
    isReadOnly,
    showError,
    showSuccess,
    adminData.handleDeleteMessage,
    adminData.handleDeleteSkill,
    adminData.handleStatusChange,
    adminData.loadData,
  );

  const submitHandlers = createSubmitHandlers({
    editingProject: modals.editingProject,
    editingSkill: modals.editingSkill,
    editingCertification: modals.editingCertification,
    editingEducation: modals.editingEducation,
    editingJourney: modals.editingJourney,
    editingGalleryImage: modals.editingGalleryImage,
    handleAddProject: adminData.handleAddProject,
    handleUpdateProject: adminData.handleUpdateProject,
    handleAddSkill: adminData.handleAddSkill,
    handleUpdateSkill: adminData.handleUpdateSkill,
    handleAddCertification: adminData.handleAddCertification,
    handleUpdateCertification: adminData.handleUpdateCertification,
    handleAddEducation: adminData.handleAddEducation,
    handleUpdateEducation: adminData.handleUpdateEducation,
    handleAddJourney: adminData.handleAddJourney,
    handleUpdateJourney: adminData.handleUpdateJourney,
    handleAddGalleryImage: adminData.handleAddGalleryImage,
    handleUpdateGalleryImage: adminData.handleUpdateGalleryImage,
    closeProjectModal: modals.closeProjectModal,
    closeSkillModal: modals.closeSkillModal,
    closeCertModal: modals.closeCertModal,
    closeEducationModal: modals.closeEducationModal,
    closeJourneyModal: modals.closeJourneyModal,
    closeGalleryModal: modals.closeGalleryModal,
    showSuccess,
    showError,
  });

  const handleTestimonialSubmit = async (data: Omit<Testimonial, "$id">) => {
    try {
      if (modals.editingTestimonial) {
        await adminData.handleUpdateTestimonial(
          modals.editingTestimonial.$id,
          data,
        );
        showSuccess("Testimonial updated successfully");
      } else {
        await adminData.handleAddTestimonial(data);
        showSuccess("Testimonial added successfully");
      }
      modals.closeTestimonialModal();
    } catch {
      showError("Failed to save testimonial");
    }
  };

  return { modals, deleteConfirmHook, submitHandlers, handleTestimonialSubmit };
}
