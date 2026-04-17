import React from "react";
import { FaChartBar, FaUsers, FaMicrophone, FaStar } from "react-icons/fa";
import type { AboutForm } from "./useAboutForm";
import { SaveButton } from "./SaveButton";
import {
  getInputClass,
  getLabelClass,
  getCardClass,
  getHeadingClass,
} from "./styles";

interface Props {
  form: AboutForm;
  setForm: React.Dispatch<React.SetStateAction<AboutForm>>;
  theme: "light" | "dark";
  isReadOnly: boolean;
  saving: string | null;
  saved: string | null;
  onSaveField: (field: keyof AboutForm) => void;
}

const statFields = [
  {
    key: "studentsMentored" as const,
    icon: FaUsers,
    color: "text-green-400",
    label: "Students Mentored",
    placeholder: "40",
  },
  {
    key: "techTalks" as const,
    icon: FaMicrophone,
    color: "text-purple-400",
    label: "Tech Talks Given",
    placeholder: "2",
  },
  {
    key: "yearsExperience" as const,
    icon: FaStar,
    color: "text-orange-400",
    label: "Years Experience",
    placeholder: "2",
  },
];

export const StatsSection: React.FC<Props> = ({
  form,
  setForm,
  theme,
  isReadOnly,
  saving,
  saved,
  onSaveField,
}) => {
  const inputClass = getInputClass(theme, isReadOnly);
  return (
    <div className={getCardClass(theme)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={getHeadingClass(theme)}>
          <FaChartBar className="text-oceanic-500" />
          Stats (Displayed on About Page)
        </h3>
      </div>
      <p
        className={`text-sm mb-4 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
      >
        These stats are shown on your About page. The "Projects Completed" count
        is automatically calculated from your projects in the database.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statFields.map(({ key, icon: Icon, color, label, placeholder }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-2">
              <label
                className={`flex items-center gap-2 ${getLabelClass(theme)}`}
              >
                <Icon className={color} />
                {label}
              </label>
              <SaveButton
                field={key}
                label="Save"
                saving={saving}
                saved={saved}
                onSave={onSaveField}
                isReadOnly={isReadOnly}
                theme={theme}
              />
            </div>
            <input
              type="number"
              min="0"
              value={form[key]}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  [key]: parseInt(e.target.value) || 0,
                }))
              }
              className={inputClass}
              placeholder={placeholder}
              readOnly={isReadOnly}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsSection;
