import { FaFolder, FaCode, FaAward, FaEye } from "react-icons/fa";
import type { OverviewTabProps, StatItem } from "./Overview/types";
import { OverviewHeader } from "./Overview/OverviewHeader";
import { StatsGrid } from "./Overview/StatsGrid";
import { RecentActivity } from "./Overview/RecentActivity";
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
  recentMessages = [],
  recentProjects = [],
  onNewProject,
  onAddCertification,
  onNavigateToTab,
  isReadOnly = false,
  loading = false,
  siteViews = 0,
}) => {
  const skillCategories = new Set(filteredSkills.map((s) => s.category)).size;
  const stats: StatItem[] = [
    { label: "Total Projects", value: totalProjects, change: "+2 this mo", icon: FaFolder, bgGradient: "from-blue-600 to-oceanic-900", tabLink: "projects" },
    { label: "Active Skills", value: filteredSkills.length, change: `Across ${skillCategories} categories`, icon: FaCode, bgGradient: "from-purple-600 to-purple-500", tabLink: "skills" },
    { label: "Certifications", value: totalCertifications, change: "Latest: AWS Cloud", icon: FaAward, bgGradient: "from-amber-600 to-amber-500", tabLink: "certifications" },
    { label: "Site Views", value: siteViews, change: "Total page visits", icon: FaEye, bgGradient: "from-oceanic-600 to-oceanic-500", tabLink: null },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <OverviewHeader
        theme={theme}
        isReadOnly={isReadOnly}
        onAddCertification={onAddCertification}
        onNewProject={onNewProject}
      />

      <StatsGrid
        theme={theme}
        loading={loading}
        stats={stats}
        onNavigateToTab={onNavigateToTab}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <RecentActivity
          theme={theme}
          recentProjects={recentProjects}
          recentMessages={recentMessages}
          onNavigateToTab={onNavigateToTab}
        />

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
