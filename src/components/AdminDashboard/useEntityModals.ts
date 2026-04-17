import { useState } from "react";
import type { Skill, Project, Certification } from "@/types";

export function useEntityModals(readOnlyGuard: () => boolean) {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editingCertification, setEditingCertification] =
    useState<Certification | null>(null);

  const openNewProject = () => {
    if (readOnlyGuard()) return;
    setEditingProject(null);
    setShowProjectModal(true);
  };
  const openEditProject = (p: Project) => {
    if (readOnlyGuard()) return;
    setEditingProject(p);
    setShowProjectModal(true);
  };
  const closeProjectModal = () => {
    setShowProjectModal(false);
    setEditingProject(null);
  };

  const openNewSkill = () => {
    if (readOnlyGuard()) return;
    setEditingSkill(null);
    setShowSkillModal(true);
  };
  const openEditSkill = (s: Skill) => {
    if (readOnlyGuard()) return;
    setEditingSkill(s);
    setShowSkillModal(true);
  };
  const closeSkillModal = () => {
    setShowSkillModal(false);
    setEditingSkill(null);
  };

  const openNewCertification = () => {
    if (readOnlyGuard()) return;
    setEditingCertification(null);
    setShowCertModal(true);
  };
  const openEditCertification = (c: Certification) => {
    if (readOnlyGuard()) return;
    setEditingCertification(c);
    setShowCertModal(true);
  };
  const closeCertModal = () => {
    setShowCertModal(false);
    setEditingCertification(null);
  };

  return {
    showProjectModal,
    editingProject,
    openNewProject,
    openEditProject,
    closeProjectModal,
    showSkillModal,
    editingSkill,
    openNewSkill,
    openEditSkill,
    closeSkillModal,
    showCertModal,
    editingCertification,
    openNewCertification,
    openEditCertification,
    closeCertModal,
  };
}
