import { BarItem } from "./BarItem";

interface PortfolioStatsProps {
  theme: "light" | "dark";
  totalProjects: number;
  totalSkills: number;
  totalCertifications: number;
  totalGallery: number;
  totalMessages: number;
}

export const PortfolioStats: React.FC<PortfolioStatsProps> = ({
  theme,
  totalProjects,
  totalSkills,
  totalCertifications,
  totalGallery,
  totalMessages,
}) => {
  const maxVal = Math.max(
    totalProjects,
    totalSkills,
    totalCertifications,
    totalGallery,
    totalMessages,
    10,
  );
  const bars = [
    {
      label: "Proj",
      fullLabel: "Projects",
      value: totalProjects,
      color: "from-oceanic-800 to-oceanic-600",
    },
    {
      label: "Skill",
      fullLabel: "Skills",
      value: totalSkills,
      color: "from-oceanic-700 to-oceanic-500",
    },
    {
      label: "Cert",
      fullLabel: "Certs",
      value: totalCertifications,
      color: "from-oceanic-600 to-oceanic-400",
    },
    {
      label: "Img",
      fullLabel: "Gallery",
      value: totalGallery,
      color: "from-oceanic-500 to-oceanic-300",
    },
    {
      label: "Msg",
      fullLabel: "Messages",
      value: totalMessages,
      color: "from-oceanic-400 to-oceanic-200",
    },
  ];

  return (
    <div className="glass-card p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3
          className={`text-sm sm:text-base font-bold transition-colors duration-300 ${
            theme === "dark" ? "text-white/95" : "text-slate-900"
          }`}
        >
          Portfolio Stats
        </h3>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-end justify-between gap-0.5 xs:gap-1 sm:gap-2 h-28 xs:h-32 sm:h-40">
          {bars.map((bar, idx) => (
            <BarItem key={idx} theme={theme} maxVal={maxVal} {...bar} />
          ))}
        </div>
      </div>
    </div>
  );
};
