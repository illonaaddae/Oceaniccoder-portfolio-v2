import { FaCog } from "react-icons/fa";

interface ComingSoonCardProps {
  theme: "light" | "dark";
}

export const ComingSoonCard: React.FC<ComingSoonCardProps> = ({ theme }) => {
  return (
    <div
      className={`glass-card border rounded-2xl p-8 text-center transition-colors duration-200 ${
        theme === "dark"
          ? "bg-gray-800/50 border-gray-700/80"
          : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
      }`}
    >
      <FaCog
        className={`text-4xl mx-auto mb-4 transition-colors duration-300 ${
          theme === "dark" ? "text-gray-600" : "text-slate-400/60"
        }`}
      />
      <p
        className={`transition-colors duration-300 ${
          theme === "dark" ? "text-slate-300" : "text-slate-600"
        }`}
      >
        More settings coming soon
      </p>
      <p
        className={`text-sm mt-2 transition-colors duration-300 ${
          theme === "dark" ? "text-slate-400" : "text-slate-500"
        }`}
      >
        Dashboard preferences and configuration options will be available soon
      </p>
    </div>
  );
};
