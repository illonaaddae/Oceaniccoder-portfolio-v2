import React from "react";
import { FaPlus, FaTimes } from "react-icons/fa";
import type { CertificationFormState } from "./types";

interface SkillsFieldProps {
  form: CertificationFormState;
  newSkill: string;
  setNewSkill: (value: string) => void;
  onAdd: () => void;
  onRemove: (skill: string) => void;
  inputClass: string;
  labelClass: string;
  theme: "light" | "dark";
}

export const SkillsField: React.FC<SkillsFieldProps> = ({
  form,
  newSkill,
  setNewSkill,
  onAdd,
  onRemove,
  inputClass,
  labelClass,
  theme,
}) => (
  <div>
    <label className={labelClass}>Related Skills</label>
    <div className="flex gap-2 mb-2">
      <input
        type="text"
        value={newSkill}
        onChange={(e) => setNewSkill(e.target.value)}
        onKeyPress={(e) =>
          e.key === "Enter" && (e.preventDefault(), onAdd())
        }
        className={inputClass}
        placeholder="Add skill covered by this cert"
      />
      <button
        type="button"
        onClick={onAdd}
        title="Add skill"
        aria-label="Add skill"
        className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
          theme === "dark"
            ? "bg-oceanic-500/20 text-oceanic-500 hover:bg-oceanic-500/30"
            : "bg-oceanic-100 text-oceanic-700 hover:bg-oceanic-200"
        }`}
      >
        <FaPlus />
      </button>
    </div>
    <div className="flex flex-wrap gap-2">
      {form.skills.map((skill) => (
        <span
          key={skill}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
            theme === "dark"
              ? "bg-purple-500/20 text-purple-300"
              : "bg-purple-100 text-purple-700"
          }`}
        >
          {skill}
          <button
            type="button"
            onClick={() => onRemove(skill)}
            className="hover:text-red-400"
            title={`Remove ${skill}`}
            aria-label={`Remove ${skill}`}
          >
            <FaTimes className="text-xs" />
          </button>
        </span>
      ))}
    </div>
  </div>
);
