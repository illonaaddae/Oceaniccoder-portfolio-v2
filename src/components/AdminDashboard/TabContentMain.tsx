import React from "react";
import { OverviewTab } from "./tabs/OverviewTab";
import { MessagesTab } from "./tabs/MessagesTab";
import { CommentsTab } from "./tabs/CommentsTab";
import { SkillsTab } from "./tabs/SkillsTab";
import { ProjectsTab } from "./tabs/ProjectsTab";
import { CertificationsTab } from "./tabs/CertificationsTab";
import type { TabType } from "./types";
import type { TabContentProps } from "./TabContentProps";

export const TabContentMain: React.FC<TabContentProps> = (props) => {
  const { activeTab, theme, loading, isReadOnly, searchQuery } = props;
  return (
    <>
      {activeTab === "overview" && (
        <OverviewTab
          theme={theme}
          totalProjects={
            searchQuery ? props.filteredProjects.length : props.totalProjects
          }
          filteredSkills={props.filteredSkills}
          totalCertifications={
            searchQuery
              ? props.filteredCertifications.length
              : props.totalCertifications
          }
          totalGallery={
            searchQuery ? props.filteredGallery.length : props.totalGallery
          }
          newMessages={props.newMessages}
          totalMessages={
            searchQuery ? props.filteredMessages.length : props.totalMessages
          }
          recentMessages={props.filteredMessages.slice(0, 3)}
          recentProjects={props.filteredProjects.slice(0, 5)}
          searchQuery={searchQuery}
          onSearchChange={props.onSearchChange}
          onNewProject={props.openNewProject}
          onAddCertification={props.openNewCertification}
          onNavigateToTab={(tab) => props.onTabChange(tab as TabType)}
          isReadOnly={isReadOnly}
          loading={loading}
          siteViews={props.siteViews}
        />
      )}
      {activeTab === "messages" && (
        <MessagesTab
          theme={theme}
          loading={loading}
          filteredMessages={props.filteredMessages}
          onStatusChange={props.handleMessageStatusChange}
          onDelete={props.requestDeleteMessage}
          isReadOnly={isReadOnly}
        />
      )}
      {activeTab === "comments" && (
        <CommentsTab theme={theme} isReadOnly={isReadOnly} />
      )}
      {activeTab === "skills" && (
        <SkillsTab
          theme={theme}
          loading={loading}
          filteredSkills={props.filteredSkills}
          onDelete={props.requestDeleteSkill}
          onEdit={props.openEditSkill}
          onShowForm={props.openNewSkill}
          isReadOnly={isReadOnly}
        />
      )}
      {activeTab === "projects" && (
        <ProjectsTab
          theme={theme}
          loading={loading}
          filteredProjects={props.filteredProjects}
          onDelete={props.handleDeleteProject}
          onEdit={props.openEditProject}
          onShowForm={props.openNewProject}
          isReadOnly={isReadOnly}
        />
      )}
      {activeTab === "certifications" && (
        <CertificationsTab
          theme={theme}
          loading={loading}
          filteredCertifications={props.filteredCertifications}
          onDelete={props.handleDeleteCertification}
          onEdit={props.openEditCertification}
          onShowForm={props.openNewCertification}
          isReadOnly={isReadOnly}
        />
      )}
    </>
  );
};
