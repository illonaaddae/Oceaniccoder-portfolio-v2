import React from "react";
import { FaBriefcase, FaCheckCircle } from "react-icons/fa";
import type { JourneyFormState } from "./types";

const MONTHS = [
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

const generateYears = () => {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current + 2; y >= current - 30; y--) years.push(y);
  return years;
};

interface PeriodLocationFieldsProps {
  form: JourneyFormState;
  setForm: React.Dispatch<React.SetStateAction<JourneyFormState>>;
  inputClass: string;
  labelClass: string;
  theme: "light" | "dark";
}

export const PeriodLocationFields: React.FC<PeriodLocationFieldsProps> = ({
  form,
  setForm,
  inputClass,
  labelClass,
  theme,
}) => {
  const years = generateYears();

  const update = (updates: Partial<JourneyFormState>) =>
    setForm((prev) => ({ ...prev, ...updates }));

  const toggleClass = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
      active
        ? theme === "dark"
          ? "bg-oceanic-600 text-white shadow-md"
          : "bg-oceanic-500 text-white shadow-md"
        : theme === "dark"
          ? "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
    }`;

  return (
    <div className="space-y-4">
      {/* Ongoing toggle */}
      <div>
        <label className={labelClass}>Status</label>
        <div
          className={`flex gap-2 p-1 rounded-xl ${theme === "dark" ? "bg-gray-800" : "bg-gray-100"}`}
        >
          <button
            type="button"
            className={toggleClass(form.isOngoing)}
            onClick={() => update({ isOngoing: true })}
          >
            <FaBriefcase className="w-3.5 h-3.5" />
            Current Role
          </button>
          <button
            type="button"
            className={toggleClass(!form.isOngoing)}
            onClick={() => update({ isOngoing: false })}
          >
            <FaCheckCircle className="w-3.5 h-3.5" />
            Completed
          </button>
        </div>
      </div>

      {/* Start date */}
      <div>
        <label className={labelClass}>Start Date *</label>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={form.startMonth}
            onChange={(e) => update({ startMonth: e.target.value })}
            className={inputClass}
            aria-label="Start month"
          >
            <option value="">Month</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={form.startYear}
            onChange={(e) => update({ startYear: e.target.value })}
            className={inputClass}
            required
            aria-label="Start year"
          >
            <option value="">Year</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* End date — hidden when ongoing */}
      {!form.isOngoing && (
        <div>
          <label className={labelClass}>End Date</label>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.endMonth}
              onChange={(e) => update({ endMonth: e.target.value })}
              className={inputClass}
              aria-label="End month"
            >
              <option value="">Month</option>
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              value={form.endYear}
              onChange={(e) => update({ endYear: e.target.value })}
              className={inputClass}
              aria-label="End year"
            >
              <option value="">Year</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Location */}
      <div>
        <label className={labelClass}>Location</label>
        <input
          type="text"
          value={form.location}
          onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
          className={inputClass}
          placeholder="e.g., Accra, Ghana"
        />
      </div>
    </div>
  );
};
