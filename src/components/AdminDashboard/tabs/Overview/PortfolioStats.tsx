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
      color: "from-oceanic-500 to-oceanic-900",
    },
    {
      label: "Skill",
      fullLabel: "Skills",
      value: totalSkills,
      color: "from-purple-500 to-purple-400",
    },
    {
      label: "Cert",
      fullLabel: "Certs",
      value: totalCertifications,
      color: "from-amber-500 to-amber-400",
    },
    {
      label: "Img",
      fullLabel: "Gallery",
      value: totalGallery,
      color: "from-green-500 to-green-400",
    },
    {
      label: "Msg",
      fullLabel: "Messages",
      value: totalMessages,
      color: "from-oceanic-500 to-oceanic-400",
    },
  ];

  return (
    <div
      className={`glass-card backdrop-blur-xl border rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-colors duration-300 ${
        theme === "dark"
          ? "bg-gradient-to-br from-white/8 to-white/4 border-white/20"
          : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
      }`}
    >
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
