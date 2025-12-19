import React, { useState, useMemo } from "react";
import useTheme from "@/hooks/useTheme";
import { useAdminData } from "./useAdminData";
import { Sidebar } from "./Sidebar";
import { OverviewTab } from "./tabs/OverviewTab";
import { MessagesTab } from "./tabs/MessagesTab";
import { SkillsTab } from "./tabs/SkillsTab";
import { ProjectsTab } from "./tabs/ProjectsTab";
import { CertificationsTab } from "./tabs/CertificationsTab";
import { SettingsTab } from "./tabs/SettingsTab";
import { GalleryTab } from "./tabs/GalleryTab";
import { EducationTab } from "./tabs/EducationTab";
import { JourneyTab } from "./tabs/JourneyTab";
import { AboutTab } from "./tabs/AboutTab";
import BlogTab from "./tabs/BlogTab";
import {
  ProjectFormModal,
  SkillFormModal,
  CertificationFormModal,
  EducationFormModal,
  JourneyFormModal,
  GalleryFormModal,
} from "./modals";
import { ToastContainer, useToast } from "./Toast";
import { FaBell, FaSearch } from "react-icons/fa";
import type {
  Skill,
  Project,
  Certification,
  GalleryImage,
  Education,
  Journey,
  About,
  BlogPost,
} from "@/types";

type TabType =
  | "overview"
  | "messages"
  | "skills"
  | "projects"
  | "certifications"
  | "gallery"
  | "education"
  | "journey"
  | "about"
  | "blog"
  | "settings";

interface AdminDashboardProps {
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const {
    toasts,
    removeToast,
    success: showSuccess,
    error: showError,
  } = useToast();
  // Modal states
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editingCertification, setEditingCertification] =
    useState<Certification | null>(null);
  const [editingEducation, setEditingEducation] = useState<Education | null>(
    null
  );
  const [editingJourney, setEditingJourney] = useState<Journey | null>(null);
  const [editingGalleryImage, setEditingGalleryImage] =
    useState<GalleryImage | null>(null);

  const { theme: rawTheme, toggleTheme } = useTheme();
  const theme = (
    rawTheme === "light" || rawTheme === "dark" ? rawTheme : "dark"
  ) as "light" | "dark";
  const {
    messages,
    skills,
    projects,
    certifications,
    loading,
    error,
    loadData,
    handleStatusChange,
    handleDeleteMessage,
    handleDeleteSkill,
    handleAddSkill,
    handleUpdateSkill,
    handleDeleteProject,
    handleAddProject,
    handleUpdateProject,
    handleDeleteCertification,
    handleAddCertification,
    handleUpdateCertification,
    gallery,
    education,
    journey,
    about,
    handleAddGalleryImage,
    handleUpdateGalleryImage,
    handleDeleteGalleryImage,
    handleAddEducation,
    handleUpdateEducation,
    handleDeleteEducation,
    handleAddJourney,
    handleUpdateJourney,
    handleDeleteJourney,
    handleSaveAbout,
    blogPosts,
    handleAddBlogPost,
    handleUpdateBlogPost,
    handleDeleteBlogPost,
  } = useAdminData();

  // Filtering functions
  const filteredMessages = useMemo(
    () =>
      messages.filter(
        (msg) =>
          msg.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          msg.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          msg.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          msg.message?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [messages, searchQuery]
  );

  const filteredSkills = useMemo(
    () =>
      skills.filter(
        (skill) =>
          skill.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          skill.category?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [skills, searchQuery]
  );

  const filteredProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          project.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.description
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          project.technologies?.some((tech) =>
            tech.toLowerCase().includes(searchQuery.toLowerCase())
          )
      ),
    [projects, searchQuery]
  );

  const filteredCertifications = useMemo(
    () =>
      certifications.filter(
        (cert) =>
          cert.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cert.issuer?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [certifications, searchQuery]
  );

  // Modal handlers
  const openNewProject = () => {
    setEditingProject(null);
    setShowProjectModal(true);
  };

  const openEditProject = (project: Project) => {
    setEditingProject(project);
    setShowProjectModal(true);
  };

  const closeProjectModal = () => {
    setShowProjectModal(false);
    setEditingProject(null);
  };

  const openNewSkill = () => {
    setEditingSkill(null);
    setShowSkillModal(true);
  };

  const openEditSkill = (skill: Skill) => {
    setEditingSkill(skill);
    setShowSkillModal(true);
  };

  const closeSkillModal = () => {
    setShowSkillModal(false);
    setEditingSkill(null);
  };

  const openNewCertification = () => {
    setEditingCertification(null);
    setShowCertModal(true);
  };

  const openEditCertification = (cert: Certification) => {
    setEditingCertification(cert);
    setShowCertModal(true);
  };

  const closeCertModal = () => {
    setShowCertModal(false);
    setEditingCertification(null);
  };

  const openNewEducation = () => {
    setEditingEducation(null);
    setShowEducationModal(true);
  };

  const openEditEducation = (edu: Education) => {
    setEditingEducation(edu);
    setShowEducationModal(true);
  };

  const closeEducationModal = () => {
    setShowEducationModal(false);
    setEditingEducation(null);
  };

  const openNewJourney = () => {
    setEditingJourney(null);
    setShowJourneyModal(true);
  };

  const openEditJourney = (journey: Journey) => {
    setEditingJourney(journey);
    setShowJourneyModal(true);
  };

  const closeJourneyModal = () => {
    setShowJourneyModal(false);
    setEditingJourney(null);
  };

  const openNewGalleryImage = () => {
    setEditingGalleryImage(null);
    setShowGalleryModal(true);
  };

  const openEditGalleryImage = (image: GalleryImage) => {
    setEditingGalleryImage(image);
    setShowGalleryModal(true);
  };

  const closeGalleryModal = () => {
    setShowGalleryModal(false);
    setEditingGalleryImage(null);
  };

  // Submit handlers
  const handleProjectSubmit = async (data: Omit<Project, "$id">) => {
    try {
      if (editingProject) {
        await handleUpdateProject(editingProject.$id, data);
        showSuccess("Project updated successfully!");
      } else {
        await handleAddProject(data);
        showSuccess("Project created successfully!");
      }
      closeProjectModal();
    } catch (err) {
      console.error("Failed to save project:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      showError(`Failed to save project: ${errorMessage}`);
    }
  };

  const handleSkillSubmit = async (data: Omit<Skill, "$id">) => {
    try {
      if (editingSkill) {
        await handleUpdateSkill(editingSkill.$id, data);
        showSuccess("Skill updated successfully!");
      } else {
        await handleAddSkill(data);
        showSuccess("Skill added successfully!");
      }
      closeSkillModal();
    } catch (err) {
      console.error("Failed to save skill:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      showError(`Failed to save skill: ${errorMessage}`);
    }
  };

  const handleCertSubmit = async (data: Omit<Certification, "$id">) => {
    try {
      if (editingCertification) {
        await handleUpdateCertification(editingCertification.$id, data);
        showSuccess("Certification updated successfully!");
      } else {
        await handleAddCertification(data);
        showSuccess("Certification added successfully!");
      }
      closeCertModal();
    } catch (err) {
      console.error("Failed to save certification:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      showError(`Failed to save certification: ${errorMessage}`);
    }
  };

  const handleEducationSubmit = async (data: Omit<Education, "$id">) => {
    try {
      if (editingEducation) {
        await handleUpdateEducation(editingEducation.$id, data);
        showSuccess("Education updated successfully!");
      } else {
        await handleAddEducation(data);
        showSuccess("Education added successfully!");
      }
      closeEducationModal();
    } catch (err) {
      console.error("Failed to save education:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      showError(`Failed to save education: ${errorMessage}`);
    }
  };

  const handleJourneySubmit = async (data: Omit<Journey, "$id">) => {
    try {
      if (editingJourney) {
        await handleUpdateJourney(editingJourney.$id, data);
        showSuccess("Journey milestone updated successfully!");
      } else {
        await handleAddJourney(data);
        showSuccess("Journey milestone added successfully!");
      }
      closeJourneyModal();
    } catch (err) {
      console.error("Failed to save journey:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      showError(`Failed to save journey: ${errorMessage}`);
    }
  };

  const handleGallerySubmit = async (data: Omit<GalleryImage, "$id">) => {
    try {
      if (editingGalleryImage) {
        await handleUpdateGalleryImage(editingGalleryImage.$id, data);
        showSuccess("Gallery image updated successfully!");
      } else {
        await handleAddGalleryImage(data);
        showSuccess("Gallery image added successfully!");
      }
      closeGalleryModal();
    } catch (err) {
      console.error("Failed to save gallery image:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      showError(`Failed to save gallery image: ${errorMessage}`);
    }
  };

  const newMessages = messages.filter((m) => m.status === "new").length;
  const totalProjects = projects.length;
  const totalCertifications = certifications.length;
  const totalGallery = gallery.length;

  return (
    <div
      className={`flex h-screen overflow-hidden transition-colors duration-300 ${
        theme === "dark"
          ? "bg-[#0a0f1a]"
          : "bg-gradient-to-br from-blue-50 via-white to-cyan-50"
      }`}
    >
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        theme={theme}
        onThemeToggle={toggleTheme}
        onLogout={onLogout}
      />

      {/* Main Content */}
      <main
        className={`flex-1 flex flex-col h-screen overflow-hidden relative z-30 ml-0 lg:ml-64 transition-all duration-300 ${
          theme === "dark" ? "" : ""
        }`}
      >
        {/* Top Header */}
        <header
          className={`glass-card transition-all duration-300 border-b px-4 sm:px-8 py-4 flex items-center justify-between gap-4 sm:gap-6 z-30 ${
            theme === "dark"
              ? "bg-[#111827]/90 backdrop-blur-xl border-gray-800 shadow-lg shadow-black/20"
              : "bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-xl border-blue-200/30 shadow-lg shadow-blue-100/20"
          }`}
        >
          {/* Spacer for mobile menu button */}
          <div className="w-12 lg:hidden" />

          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <div
              className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-xl transition-all duration-300 ${
                theme === "dark"
                  ? "bg-gray-800/80 border border-gray-700 focus-within:border-cyan-500/60 focus-within:bg-gray-800 focus-within:ring-1 focus-within:ring-cyan-500/30"
                  : "bg-white/60 border border-blue-200/40 focus-within:border-blue-400/60 focus-within:bg-white/80 focus-within:ring-1 focus-within:ring-blue-400/30"
              }`}
            >
              <FaSearch
                className={`transition-colors duration-300 flex-shrink-0 ${
                  theme === "dark" ? "text-white/60" : "text-slate-600/60"
                }`}
              />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`flex-1 bg-transparent outline-none placeholder-opacity-60 transition-colors duration-300 text-sm min-w-0 ${
                  theme === "dark"
                    ? "text-white placeholder-slate-300"
                    : "text-slate-900 placeholder-slate-600"
                }`}
              />
            </div>
          </div>

          <button
            onClick={() => setActiveTab("messages")}
            title={
              newMessages > 0
                ? `${newMessages} new message${newMessages > 1 ? "s" : ""}`
                : "No new messages"
            }
            className={`relative p-2 rounded-lg transition flex-shrink-0 ${
              theme === "dark"
                ? "text-slate-200 hover:text-cyan-300 hover:bg-white/10"
                : "text-slate-700 hover:text-blue-600 hover:bg-white/40"
            }`}
          >
            <FaBell className="text-xl" />
            {newMessages > 0 && (
              <span
                className={`absolute top-0 right-0 w-5 h-5 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg ${
                  theme === "dark"
                    ? "bg-gradient-to-r from-red-500 to-pink-500 shadow-red-500/50"
                    : "bg-gradient-to-r from-red-400 to-pink-400 shadow-red-400/50"
                }`}
              >
                {newMessages}
              </span>
            )}
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeTab === "overview" && (
            <OverviewTab
              theme={theme}
              totalProjects={totalProjects}
              filteredSkills={filteredSkills}
              totalCertifications={totalCertifications}
              totalGallery={totalGallery}
              newMessages={newMessages}
              recentMessages={messages.slice(0, 3)}
              recentProjects={projects.slice(0, 5)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onNewProject={openNewProject}
              onAddCertification={openNewCertification}
              onNavigateToTab={(tab) => setActiveTab(tab as TabType)}
            />
          )}

          {activeTab === "messages" && (
            <MessagesTab
              theme={theme}
              loading={loading}
              filteredMessages={filteredMessages}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteMessage}
            />
          )}

          {activeTab === "skills" && (
            <SkillsTab
              theme={theme}
              loading={loading}
              filteredSkills={filteredSkills}
              onDelete={handleDeleteSkill}
              onEdit={openEditSkill}
              onShowForm={openNewSkill}
            />
          )}

          {activeTab === "projects" && (
            <ProjectsTab
              theme={theme}
              loading={loading}
              filteredProjects={filteredProjects}
              onDelete={handleDeleteProject}
              onEdit={openEditProject}
              onShowForm={openNewProject}
            />
          )}

          {activeTab === "certifications" && (
            <CertificationsTab
              theme={theme}
              loading={loading}
              filteredCertifications={filteredCertifications}
              onDelete={handleDeleteCertification}
              onEdit={openEditCertification}
              onShowForm={openNewCertification}
            />
          )}

          {activeTab === "gallery" && (
            <GalleryTab
              theme={theme}
              loading={loading}
              gallery={gallery}
              onShowForm={openNewGalleryImage}
              onEdit={openEditGalleryImage}
              onDelete={handleDeleteGalleryImage}
            />
          )}

          {activeTab === "education" && (
            <EducationTab
              theme={theme}
              loading={loading}
              education={education}
              onShowForm={openNewEducation}
              onEdit={openEditEducation}
              onDelete={handleDeleteEducation}
            />
          )}

          {activeTab === "journey" && (
            <JourneyTab
              theme={theme}
              loading={loading}
              journey={journey}
              onShowForm={openNewJourney}
              onEdit={openEditJourney}
              onDelete={handleDeleteJourney}
            />
          )}

          {activeTab === "about" && (
            <AboutTab
              theme={theme}
              loading={loading}
              about={about}
              onSave={handleSaveAbout}
            />
          )}

          {activeTab === "blog" && (
            <BlogTab
              blogPosts={blogPosts}
              onAdd={async (post) => {
                await handleAddBlogPost(post as Omit<BlogPost, "$id">);
              }}
              onEdit={handleUpdateBlogPost}
              onDelete={handleDeleteBlogPost}
              loading={loading}
              theme={theme}
            />
          )}

          {activeTab === "settings" && <SettingsTab theme={theme} />}
        </div>
      </main>

      {/* Modals */}
      <ProjectFormModal
        isOpen={showProjectModal}
        onClose={closeProjectModal}
        onSubmit={handleProjectSubmit}
        theme={theme}
        editingProject={editingProject}
      />

      <SkillFormModal
        isOpen={showSkillModal}
        onClose={closeSkillModal}
        onSubmit={handleSkillSubmit}
        theme={theme}
        editingSkill={editingSkill}
      />

      <CertificationFormModal
        isOpen={showCertModal}
        onClose={closeCertModal}
        onSubmit={handleCertSubmit}
        theme={theme}
        editingCertification={editingCertification}
      />

      <EducationFormModal
        isOpen={showEducationModal}
        onClose={closeEducationModal}
        onSubmit={handleEducationSubmit}
        theme={theme}
        editingEducation={editingEducation}
      />

      <JourneyFormModal
        isOpen={showJourneyModal}
        onClose={closeJourneyModal}
        onSubmit={handleJourneySubmit}
        theme={theme}
        editingJourney={editingJourney}
      />

      <GalleryFormModal
        isOpen={showGalleryModal}
        onClose={closeGalleryModal}
        onSubmit={handleGallerySubmit}
        theme={theme}
        editingImage={editingGalleryImage}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} theme={theme} />
    </div>
  );
};

export default AdminDashboard;
