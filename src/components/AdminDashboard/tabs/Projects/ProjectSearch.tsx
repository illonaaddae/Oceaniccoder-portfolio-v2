import { CustomSelect } from "@/components/ui/CustomSelect";

interface ProjectSearchProps {
  theme: "light" | "dark";
}

export const ProjectSearch: React.FC<ProjectSearchProps> = ({ theme }) => (
  <div
    className={`glass-card backdrop-blur-xl border rounded-2xl p-5 transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
      theme === "dark"
        ? "bg-gradient-to-br from-blue-500/10 to-oceanic-500/5 border-blue-400/20"
        : "bg-gradient-to-br from-blue-50/60 to-oceanic-50/40 border-blue-200/60"
    }`}
  >
    <div className="flex-1 w-full sm:w-auto relative">
      <div
        className={`absolute left-3 top-1/2 transform -translate-y-1/2 opacity-50 transition-opacity duration-300 ${
          theme === "dark" ? "text-slate-400" : "text-slate-600"
        }`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </div>
      <input
        type="text"
        placeholder="Search projects, skills..."
        className={`w-full pl-10 pr-4 py-3 rounded-xl transition-all duration-300 border focus:outline-none focus:ring-2 focus:ring-oceanic-500 focus:border-oceanic-500 ${
          theme === "dark"
            ? "bg-white/10 border-white/20 text-white placeholder-slate-400 hover:bg-white/15"
            : "bg-white/40 border-blue-200/50 text-slate-900 placeholder-slate-600 hover:bg-white/50"
        }`}
      />
    </div>
    <div className="flex gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
      <CustomSelect
        value="All Status"
        onChange={() => {}}
        options={[
          { value: "All Status", label: "All Status" },
          { value: "Published", label: "Published" },
          { value: "Draft", label: "Draft" },
          { value: "Archived", label: "Archived" },
        ]}
        theme={theme}
        ariaLabel="Filter by project status"
        className="flex-1 sm:flex-none sm:w-40"
      />
      <CustomSelect
        value="All Tech"
        onChange={() => {}}
        options={[
          { value: "All Tech", label: "All Tech" },
          { value: "React", label: "React" },
          { value: "Vue", label: "Vue" },
          { value: "Node.js", label: "Node.js" },
        ]}
        theme={theme}
        ariaLabel="Filter by technology"
        className="flex-1 sm:flex-none sm:w-40"
      />
    </div>
  </div>
);
