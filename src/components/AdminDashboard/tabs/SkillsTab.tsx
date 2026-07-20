import { useMemo, useState } from "react";
import { FaCode, FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import type { Skill } from "@/types";
import { CATEGORY_ORDER } from "@/utils/data/skillsTransformer";
import { renderIconByComponent } from "@/utils/data/skillIconRegistry.jsx";
import { FilterPills } from "@/components/ui/FilterPills";

interface SkillsTabProps {
  theme: "light" | "dark";
  loading: boolean;
  filteredSkills: Skill[];
  onDelete: (skillId: string) => void;
  onEdit: (skill: Skill) => void;
  onShowForm: () => void;
  isReadOnly?: boolean;
}

const OTHER_CATEGORY = "Other";

// Same ordering rule the public site uses: known categories in preferred
// order, unknown ones alphabetically after.
const orderCategories = (categories: string[]): string[] =>
  [...categories].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

export const SkillsTab: React.FC<SkillsTabProps> = ({
  theme,
  loading,
  filteredSkills,
  onDelete,
  onEdit,
  onShowForm,
  isReadOnly = false,
}) => {
  // Group the flat skills list by category, ordered like the public site.
  const groups = useMemo(() => {
    const grouped: Record<string, Skill[]> = {};
    for (const skill of filteredSkills) {
      const cat = skill.category || OTHER_CATEGORY;
      (grouped[cat] ||= []).push(skill);
    }
    for (const cat of Object.keys(grouped)) {
      grouped[cat].sort((a, b) => b.percentage - a.percentage);
    }
    return orderCategories(Object.keys(grouped)).map((category) => ({
      category,
      skills: grouped[category],
    }));
  }, [filteredSkills]);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Keep the active tab valid as the underlying data (search/CRUD) changes.
  const activeGroup = groups.find((g) => g.category === activeCategory) ?? groups[0] ?? null;
  const activeSkills = activeGroup?.skills ?? [];
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${
              theme === "dark" ? "text-white" : "text-slate-900"
            }`}
          >
            Skills
          </h1>
          <p
            className={`text-sm sm:text-base transition-colors duration-300 ${
              theme === "dark" ? "text-slate-200/90" : "text-slate-700/80"
            }`}
          >
            Manage your technical skills
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={onShowForm}
            className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2 rounded-xl font-bold text-sm sm:text-base transition duration-200 border shadow-lg ${
              theme === "dark"
                ? "bg-gradient-to-r from-oceanic-600 to-oceanic-900 border-oceanic-500/50 text-white hover:from-oceanic-500 hover:to-oceanic-900 shadow-oceanic-500/20"
                : "bg-gradient-to-r from-oceanic-500 to-oceanic-900 border-oceanic-500/50 text-white hover:from-oceanic-400 hover:to-oceanic-800 shadow-oceanic-500/20"
            }`}
          >
            <FaPlus className="text-sm" />
            Add Skill
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p
            className={`transition-colors duration-300 ${
              theme === "dark" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Loading skills...
          </p>
        </div>
      ) : filteredSkills.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <FaCode
            className={`text-4xl mx-auto mb-4 transition-colors duration-300 ${
              theme === "dark" ? "text-gray-600" : "text-slate-400/60"
            }`}
          />
          <p
            className={`transition-colors duration-300 ${
              theme === "dark" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            No skills added yet
          </p>
        </div>
      ) : (
        <>
          <FilterPills
            tabs={groups.map((group) => ({
              key: group.category,
              label: group.category,
              count: group.skills.length,
            }))}
            active={activeGroup?.category ?? ""}
            onChange={setActiveCategory}
            theme={theme}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {activeSkills.map((skill) => (
              <div key={skill.$id} className="glass-card card-hover p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p
                      className={`flex items-center gap-2 text-sm font-bold transition-colors duration-300 ${
                        theme === "dark" ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {renderIconByComponent(skill.icon) && (
                        <span aria-hidden="true">{renderIconByComponent(skill.icon)}</span>
                      )}
                      {skill.name}
                    </p>
                    <p
                      className={`text-xs transition-colors duration-300 ${
                        theme === "dark" ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      {skill.category}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-lg ${
                      theme === "dark"
                        ? "bg-oceanic-500/30 text-oceanic-100"
                        : "bg-oceanic-400/20 text-oceanic-700"
                    }`}
                  >
                    {skill.percentage}%
                  </span>
                </div>

                <div className="mb-4">
                  <div
                    className={`w-full h-2 rounded-full overflow-hidden transition-colors duration-300 ${
                      theme === "dark" ? "bg-white/10" : "bg-oceanic-100"
                    }`}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-oceanic-500 to-oceanic-400"
                      style={{ width: `${skill.percentage}%` }}
                    />
                  </div>
                </div>

                {!isReadOnly && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(skill)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 border rounded-lg transition text-sm ${
                        theme === "dark"
                          ? "bg-oceanic-500/20 border-oceanic-500/30 text-oceanic-200 hover:bg-oceanic-500/30"
                          : "bg-oceanic-400/20 border-oceanic-300/30 text-oceanic-700 hover:bg-oceanic-400/30"
                      }`}
                    >
                      <FaEdit className="text-sm" />
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(skill.$id)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 border rounded-lg transition text-sm ${
                        theme === "dark"
                          ? "bg-red-500/20 border-red-400/30 text-red-200 hover:bg-red-500/30"
                          : "bg-red-400/20 border-red-300/30 text-red-700 hover:bg-red-400/30"
                      }`}
                    >
                      <FaTrash className="text-sm" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
