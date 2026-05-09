import { StatSkeleton } from "./StatSkeleton";
import { StatCard } from "./StatCard";
import type { StatItem } from "./types";

interface StatsGridProps {
  theme: "light" | "dark";
  loading: boolean;
  stats: StatItem[];
  onNavigateToTab?: (tab: string) => void;
}

export const StatsGrid: React.FC<StatsGridProps> = ({
  theme,
  loading,
  stats,
  onNavigateToTab,
}) => (
  <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
    {loading ? (
      <>
        <StatSkeleton theme={theme} />
        <StatSkeleton theme={theme} />
        <StatSkeleton theme={theme} />
        <StatSkeleton theme={theme} />
      </>
    ) : (
      stats.map((stat, idx) => (
        <StatCard
          key={idx}
          stat={stat}
          index={idx}
          theme={theme}
          onNavigateToTab={onNavigateToTab}
        />
      ))
    )}
  </div>
);
