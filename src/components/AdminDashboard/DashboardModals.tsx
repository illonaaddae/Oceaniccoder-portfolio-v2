import React from "react";
import {
  ProjectFormModal,
  SkillFormModal,
  CertificationFormModal,
  EducationFormModal,
  JourneyFormModal,
  GalleryFormModal,
  TestimonialFormModal,
} from "./modals";
import type { DashboardModalsProps } from "./DashboardModalsProps";

export const DashboardModals: React.FC<DashboardModalsProps> = (p) => (
  <>
    <ProjectFormModal
      isOpen={p.showProjectModal}
      onClose={p.onCloseProject}
      onSubmit={p.onSubmitProject}
      theme={p.theme}
      editingProject={p.editingProject}
    />
    <SkillFormModal
      isOpen={p.showSkillModal}
      onClose={p.onCloseSkill}
      onSubmit={p.onSubmitSkill}
      theme={p.theme}
      editingSkill={p.editingSkill}
    />
    <CertificationFormModal
      isOpen={p.showCertModal}
      onClose={p.onCloseCert}
      onSubmit={p.onSubmitCert}
      theme={p.theme}
      editingCertification={p.editingCertification}
    />
    <EducationFormModal
      isOpen={p.showEducationModal}
      onClose={p.onCloseEducation}
      onSubmit={p.onSubmitEducation}
      theme={p.theme}
      editingEducation={p.editingEducation}
    />
    <JourneyFormModal
      isOpen={p.showJourneyModal}
      onClose={p.onCloseJourney}
      onSubmit={p.onSubmitJourney}
      theme={p.theme}
      editingJourney={p.editingJourney}
    />
    <GalleryFormModal
      isOpen={p.showGalleryModal}
      onClose={p.onCloseGallery}
      onSubmit={p.onSubmitGallery}
      theme={p.theme}
      editingImage={p.editingGalleryImage}
    />
    <TestimonialFormModal
      isOpen={p.showTestimonialModal}
      onClose={p.onCloseTestimonial}
      onSubmit={p.onSubmitTestimonial}
      theme={p.theme}
      editingTestimonial={p.editingTestimonial}
    />
  </>
);
