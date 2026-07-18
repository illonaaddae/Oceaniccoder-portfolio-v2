import { FaFolder, FaCode, FaAward, FaEye } from "react-icons/fa";
import type { OverviewTabProps, StatItem } from "./Overview/types";
import { OverviewHeader } from "./Overview/OverviewHeader";
import { StatsGrid } from "./Overview/StatsGrid";
import { RecentActivity } from "./Overview/RecentActivity";
import { buildRecentActivity } from "./Overview/buildActivity";
import { StorageUsage } from "./Overview/StorageUsage";
import { PortfolioStats } from "./Overview/PortfolioStats";

export type { OverviewTabProps };

export const OverviewTab: React.FC<OverviewTabProps> = ({
  theme,
  totalProjects,
  filteredSkills,
  totalCertifications,
  totalGallery,
  totalMessages,
  activityProjects = [],
  activityMessages = [],
  activityCertifications = [],
  activityGallery = [],
  activityEducation = [],
  activityJourney = [],
  activityBlogPosts = [],
  activityTestimonials = [],
  onNewProject,
  onAddCertification,
  onNavigateToTab,
  isReadOnly = false,
  loading = false,
  siteViews = 0,
}) => {
  const skillCategories = new Set(filteredSkills.map((s) => s.category)).size;
  const activityItems = buildRecentActivity({
    projects: activityProjects,
    messages: activityMessages,
    certifications: activityCertifications,
    skills: filteredSkills,
    gallery: activityGallery,
    education: activityEducation,
    journey: activityJourney,
    blogPosts: activityBlogPosts,
    testimonials: activityTestimonials,
  });
  const stats: StatItem[] = [
    {
      label: "Total Projects",
      value: totalProjects,
      change: "+2 this mo",
      icon: FaFolder,
      bgGradient: "from-oceanic-500 to-oceanic-800",
      tabLink: "projects",
    },
    {
      label: "Active Skills",
      value: filteredSkills.length,
      change: `Across ${skillCategories} categories`,
      icon: FaCode,
      bgGradient: "from-oceanic-600 to-oceanic-800",
      tabLink: "skills",
    },
    {
      label: "Certifications",
      value: totalCertifications,
      change: "Latest: AWS Cloud",
      icon: FaAward,
      bgGradient: "from-oceanic-400 to-oceanic-600",
      tabLink: "certifications",
    },
    {
      label: "Site Views",
      value: siteViews,
      change: "Total page visits",
      icon: FaEye,
      bgGradient: "from-oceanic-600 to-oceanic-500",
      tabLink: null,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <OverviewHeader
        theme={theme}
        isReadOnly={isReadOnly}
        onAddCertification={onAddCertification}
        onNewProject={onNewProject}
      />

      <StatsGrid theme={theme} loading={loading} stats={stats} onNavigateToTab={onNavigateToTab} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <RecentActivity theme={theme} items={activityItems} onNavigateToTab={onNavigateToTab} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-6">
          <StorageUsage theme={theme} onNavigateToTab={onNavigateToTab} />
          <PortfolioStats
            theme={theme}
            totalProjects={totalProjects}
            totalSkills={filteredSkills.length}
            totalCertifications={totalCertifications}
            totalGallery={totalGallery}
            totalMessages={totalMessages}
          />
        </div>
      </div>
    </div>
  );
};
