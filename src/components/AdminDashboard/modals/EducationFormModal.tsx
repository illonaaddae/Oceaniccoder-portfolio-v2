import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "./Modal";
import { FaSave, FaCalendarAlt } from "react-icons/fa";
import type { Education } from "@/types";
import { ImageUpload } from "../ImageUpload";

interface EducationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (edu: Omit<Education, "$id">) => Promise<void>;
  theme: "light" | "dark";
  editingEducation?: Education | null;
}

// Helper to format period from dates
const formatPeriod = (
  startDate: string,
  endDate: string,
  isOngoing: boolean
): string => {
  if (!startDate) return "";
  const start = new Date(startDate);
  const startYear = start.getFullYear();

  if (isOngoing) {
    return `${startYear} - Present`;
  }

  if (!endDate) return String(startYear);
  const end = new Date(endDate);
  const endYear = end.getFullYear();

  return `${startYear} - ${endYear}`;
};

// Generate years for dropdown (current year to 50 years back)
const generateYears = () => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let i = currentYear; i >= currentYear - 50; i--) {
    years.push(i);
  }
  return years;
};

// Generate months
const months = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

// Class Honours options
const classHonoursOptions = [
  { value: "", label: "Select Honours (Optional)" },
  { value: "In Progress", label: "In Progress (Currently Enrolled)" },
  { value: "Pending", label: "Pending (Awaiting Results)" },
  { value: "N/A", label: "Not Applicable" },
  { value: "First Class", label: "First Class Honours" },
  { value: "Second Class Upper", label: "Second Class Upper Division" },
  { value: "Second Class Lower", label: "Second Class Lower Division" },
  { value: "Third Class", label: "Third Class Honours" },
  { value: "Pass", label: "Pass" },
  { value: "Distinction", label: "Distinction" },
  { value: "Merit", label: "Merit" },
  { value: "Cum Laude", label: "Cum Laude" },
  { value: "Magna Cum Laude", label: "Magna Cum Laude" },
  { value: "Summa Cum Laude", label: "Summa Cum Laude" },
];

export const EducationFormModal: React.FC<EducationFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  theme,
  editingEducation,
}) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    institution: "",
    degree: "",
    field: "",
    period: "",
    description: "",
    universityLogo: "",
    initials: "",
    gpa: "",
    classHonours: "",
    startMonth: "",
    startYear: "",
    endMonth: "",
    endYear: "",
    isOngoing: false,
    location: "",
  });

  const years = useMemo(() => generateYears(), []);

  // Parse existing date strings to extract month/year
  const parseDateString = (
    dateStr: string | undefined
  ): { month: string; year: string } => {
    if (!dateStr) return { month: "", year: "" };
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return { month: "", year: "" };
      return {
        month: String(date.getMonth() + 1).padStart(2, "0"),
        year: String(date.getFullYear()),
      };
    } catch {
      return { month: "", year: "" };
    }
  };

  useEffect(() => {
    if (editingEducation) {
      const startParsed = parseDateString(editingEducation.startDate);
      const endParsed = parseDateString(editingEducation.endDate);

      setForm({
        institution: editingEducation.institution || "",
        degree: editingEducation.degree || "",
        field: editingEducation.field || "",
        period: editingEducation.period || "",
        description: editingEducation.description || "",
        universityLogo:
          editingEducation.universityLogo || editingEducation.logo || "",
        initials: editingEducation.initials || "",
        gpa: editingEducation.gpa || "",
        classHonours: editingEducation.classHonours || "",
        startMonth: startParsed.month,
        startYear: startParsed.year,
        endMonth: endParsed.month,
        endYear: endParsed.year,
        isOngoing: editingEducation.isOngoing || false,
        location: editingEducation.location || "",
      });
    } else {
      setForm({
        institution: "",
        degree: "",
        field: "",
        period: "",
        description: "",
        universityLogo: "",
        initials: "",
        gpa: "",
        classHonours: "",
        startMonth: "",
        startYear: "",
        endMonth: "",
        endYear: "",
        isOngoing: false,
        location: "",
      });
    }
  }, [editingEducation, isOpen]);

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Build start and end dates from month/year selections
      const startDate =
        form.startMonth && form.startYear
          ? `${form.startYear}-${form.startMonth}-01`
          : "";
      const endDate =
        !form.isOngoing && form.endMonth && form.endYear
          ? `${form.endYear}-${form.endMonth}-01`
          : "";

      // Generate period string from dates
      const period = formatPeriod(startDate, endDate, form.isOngoing);

      const submissionData = {
        institution: form.institution,
        degree: form.degree,
        field: form.field,
        period: period || form.period,
        description: form.description,
        universityLogo: form.universityLogo,
        initials: form.initials,
        gpa: form.gpa,
        classHonours: form.classHonours,
        startDate,
        endDate,
        isOngoing: form.isOngoing,
        location: form.location,
      };

      await onSubmit(submissionData);
      onClose();
    } catch (err) {
      console.error("Error submitting education:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
    theme === "dark"
      ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500 focus:border-cyan-500/60"
      : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500"
  }`;

  const labelClass = `block text-sm font-semibold mb-2 ${
    theme === "dark" ? "text-slate-200" : "text-slate-700"
  }`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingEducation ? "Edit Education" : "Add New Education"}
      theme={theme}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Institution */}
          <div>
            <label className={labelClass}>Institution *</label>
            <input
              type="text"
              required
              value={form.institution}
              onChange={(e) =>
                setForm({ ...form, institution: e.target.value })
              }
              className={inputClass}
              placeholder="University/School name"
            />
          </div>

          {/* Location */}
          <div>
            <label className={labelClass}>Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className={inputClass}
              placeholder="e.g., Accra, Ghana"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Degree */}
          <div>
            <label className={labelClass}>Degree *</label>
            <input
              type="text"
              required
              value={form.degree}
              onChange={(e) => setForm({ ...form, degree: e.target.value })}
              className={inputClass}
              placeholder="e.g., Bachelor of Science"
            />
          </div>

          {/* Field of Study */}
          <div>
            <label className={labelClass}>Field of Study</label>
            <input
              type="text"
              value={form.field}
              onChange={(e) => setForm({ ...form, field: e.target.value })}
              className={inputClass}
              placeholder="e.g., Computer Science"
            />
          </div>
        </div>

        {/* GPA */}
        <div>
          <label className={labelClass}>GPA</label>
          <input
            type="text"
            value={form.gpa}
            onChange={(e) => setForm({ ...form, gpa: e.target.value })}
            className={inputClass}
            placeholder="e.g., 3.8/4.0 or 3.8"
          />
        </div>

        {/* Class Honours */}
        <div>
          <label className={labelClass}>Class Honours</label>
          <select
            value={form.classHonours}
            onChange={(e) => setForm({ ...form, classHonours: e.target.value })}
            className={inputClass}
            aria-label="Class Honours"
          >
            {classHonoursOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Period Selection */}
        <div
          className={`p-4 rounded-xl border ${
            theme === "dark"
              ? "bg-gray-800/50 border-gray-700"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-4">
            <FaCalendarAlt
              className={theme === "dark" ? "text-cyan-400" : "text-blue-500"}
            />
            <span className={labelClass + " mb-0"}>Study Period *</span>
          </div>

          {/* Start Date */}
          <div className="mb-4">
            <label
              className={`text-xs font-medium mb-2 block ${
                theme === "dark" ? "text-gray-400" : "text-slate-500"
              }`}
            >
              Start Date
            </label>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.startMonth}
                onChange={(e) =>
                  setForm({ ...form, startMonth: e.target.value })
                }
                className={inputClass}
                required
                aria-label="Start Month"
              >
                <option value="">Month</option>
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <select
                value={form.startYear}
                onChange={(e) =>
                  setForm({ ...form, startYear: e.target.value })
                }
                className={inputClass}
                required
                aria-label="Start Year"
              >
                <option value="">Year</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ongoing Toggle */}
          <div className="mb-4">
            <label
              className={`flex items-center gap-3 cursor-pointer ${
                theme === "dark" ? "text-slate-200" : "text-slate-700"
              }`}
            >
              <input
                type="checkbox"
                checked={form.isOngoing}
                onChange={(e) =>
                  setForm({ ...form, isOngoing: e.target.checked })
                }
                className="w-5 h-5 rounded border-2 border-cyan-500 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm font-medium">
                Currently studying here (Ongoing)
              </span>
            </label>
          </div>

          {/* End Date - Only show if not ongoing */}
          {!form.isOngoing && (
            <div>
              <label
                className={`text-xs font-medium mb-2 block ${
                  theme === "dark" ? "text-gray-400" : "text-slate-500"
                }`}
              >
                End Date
              </label>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.endMonth}
                  onChange={(e) =>
                    setForm({ ...form, endMonth: e.target.value })
                  }
                  className={inputClass}
                  required={!form.isOngoing}
                  aria-label="End Month"
                >
                  <option value="">Month</option>
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <select
                  value={form.endYear}
                  onChange={(e) =>
                    setForm({ ...form, endYear: e.target.value })
                  }
                  className={inputClass}
                  required={!form.isOngoing}
                  aria-label="End Year"
                >
                  <option value="">Year</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Preview period */}
          {form.startMonth && form.startYear && (
            <div
              className={`mt-4 pt-3 border-t ${
                theme === "dark" ? "border-gray-700" : "border-slate-200"
              }`}
            >
              <span
                className={`text-xs ${
                  theme === "dark" ? "text-gray-400" : "text-slate-500"
                }`}
              >
                Period preview:{" "}
              </span>
              <span
                className={`text-sm font-semibold ${
                  theme === "dark" ? "text-cyan-400" : "text-blue-600"
                }`}
              >
                {formatPeriod(
                  `${form.startYear}-${form.startMonth}-01`,
                  form.isOngoing ? "" : `${form.endYear}-${form.endMonth}-01`,
                  form.isOngoing
                )}
              </span>
            </div>
          )}
        </div>

        {/* Institution Logo and Initials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <ImageUpload
              value={form.universityLogo}
              onChange={(url) => setForm({ ...form, universityLogo: url })}
              label="Institution Logo"
            />
          </div>

          {/* Initials */}
          <div>
            <label className={labelClass}>
              Institution Initials
              <span
                className={`font-normal text-xs ml-2 ${
                  theme === "dark" ? "text-gray-400" : "text-slate-500"
                }`}
              >
                (e.g., IU, ATU, MIT)
              </span>
            </label>
            <input
              type="text"
              value={form.initials}
              onChange={(e) =>
                setForm({ ...form, initials: e.target.value.toUpperCase() })
              }
              className={inputClass}
              placeholder="e.g., IU, ATU"
              maxLength={10}
            />
            <p
              className={`text-xs mt-1 ${
                theme === "dark" ? "text-gray-400" : "text-slate-500"
              }`}
            >
              Shown next to the logo. Auto-generated from institution name if
              left empty.
            </p>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
            placeholder="Brief description of your studies, achievements..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              theme === "dark"
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              loading
                ? "opacity-50 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-cyan-400 text-white hover:from-blue-600 hover:to-cyan-500"
            }`}
          >
            <FaSave />
            {loading ? "Saving..." : editingEducation ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
