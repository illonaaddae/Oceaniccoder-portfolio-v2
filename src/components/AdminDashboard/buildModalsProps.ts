import type { DashboardModalsProps } from "./DashboardModalsProps";
import type { DashboardState } from "./useDashboardState";

export function buildModalsProps(s: DashboardState): DashboardModalsProps {
  return {
    theme: s.theme,
    showProjectModal: s.modals.showProjectModal,
    editingProject: s.modals.editingProject,
    onCloseProject: s.modals.closeProjectModal,
    onSubmitProject: s.submitHandlers.handleProjectSubmit,
    showSkillModal: s.modals.showSkillModal,
    editingSkill: s.modals.editingSkill,
    onCloseSkill: s.modals.closeSkillModal,
    onSubmitSkill: s.submitHandlers.handleSkillSubmit,
    showCertModal: s.modals.showCertModal,
    editingCertification: s.modals.editingCertification,
    onCloseCert: s.modals.closeCertModal,
    onSubmitCert: s.submitHandlers.handleCertSubmit,
    showEducationModal: s.modals.showEducationModal,
    editingEducation: s.modals.editingEducation,
    onCloseEducation: s.modals.closeEducationModal,
    onSubmitEducation: s.submitHandlers.handleEducationSubmit,
    showJourneyModal: s.modals.showJourneyModal,
    editingJourney: s.modals.editingJourney,
    onCloseJourney: s.modals.closeJourneyModal,
    onSubmitJourney: s.submitHandlers.handleJourneySubmit,
    showGalleryModal: s.modals.showGalleryModal,
    editingGalleryImage: s.modals.editingGalleryImage,
    onCloseGallery: s.modals.closeGalleryModal,
    onSubmitGallery: s.submitHandlers.handleGallerySubmit,
    showTestimonialModal: s.modals.showTestimonialModal,
    editingTestimonial: s.modals.editingTestimonial,
    onCloseTestimonial: s.modals.closeTestimonialModal,
    onSubmitTestimonial: s.handleTestimonialSubmit,
  };
}
