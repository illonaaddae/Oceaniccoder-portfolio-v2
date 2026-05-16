import React, { useState, useRef, useEffect } from "react";
import { PLATFORMS } from "./constants";
import type { CertificationFormState } from "./types";
import PlatformLogo from "@/components/PlatformLogo";

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
  for (let y = current; y >= current - 20; y--) years.push(y);
  return years;
};

interface PlatformDateFieldsProps {
  form: CertificationFormState;
  updateForm: (updates: Partial<CertificationFormState>) => void;
  inputClass: string;
  labelClass: string;
}

const CUSTOM_VALUE = "__custom__";

export const PlatformDateFields: React.FC<PlatformDateFieldsProps> = ({
  form,
  updateForm,
  inputClass,
  labelClass,
}) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isCustom =
    form.platform === CUSTOM_VALUE ||
    (form.platform && !PLATFORMS.find((p) => p.value === form.platform));
  const displayPlatform = isCustom ? CUSTOM_VALUE : form.platform;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as HTMLElement)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleSelect = (value: string, color: string) => {
    if (value === CUSTOM_VALUE) {
      updateForm({ platform: CUSTOM_VALUE, platformColor: "#6B7280", platformIconUrl: "" });
    } else {
      updateForm({ platform: value, platformColor: color, platformIconUrl: "" });
    }
    setOpen(false);
  };

  const selectedLabel =
    displayPlatform === CUSTOM_VALUE ? "Custom Platform" : form.platform || "Select Platform";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Platform custom dropdown */}
        <div>
          <label className={labelClass}>Platform *</label>
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className={`${inputClass} flex items-center gap-2 text-left w-full`}
              aria-haspopup="listbox"
              aria-expanded={open ? "true" : "false"}
            >
              {form.platform && form.platform !== CUSTOM_VALUE && (
                <PlatformLogo platformName={form.platform} className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="flex-1 truncate">{selectedLabel}</span>
              <svg
                className="w-4 h-4 flex-shrink-0 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {open && (
              <ul
                role="listbox"
                title="Select certification platform"
                className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-gray-700 bg-gray-900 shadow-xl"
              >
                <li
                  role="option"
                  aria-selected={!form.platform ? "true" : "false"}
                  className="px-3 py-2 text-sm text-gray-400 cursor-pointer hover:bg-gray-800"
                  onClick={() => handleSelect("", "#3b82f6")}
                >
                  Select Platform
                </li>
                {PLATFORMS.map((platform) => (
                  <li
                    key={platform.value}
                    role="option"
                    aria-selected={form.platform === platform.value ? "true" : "false"}
                    className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-800 ${
                      form.platform === platform.value ? "bg-gray-800 font-medium" : ""
                    }`}
                    onClick={() => handleSelect(platform.value, platform.color)}
                  >
                    <PlatformLogo platformName={platform.value} className="w-4 h-4 flex-shrink-0" />
                    <span>{platform.value}</span>
                  </li>
                ))}
                <li
                  role="option"
                  aria-selected={displayPlatform === CUSTOM_VALUE ? "true" : "false"}
                  className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-800 border-t border-gray-700 ${
                    displayPlatform === CUSTOM_VALUE ? "bg-gray-800 font-medium" : ""
                  }`}
                  onClick={() => handleSelect(CUSTOM_VALUE, "#6B7280")}
                >
                  <span className="w-4 h-4 flex-shrink-0 inline-flex items-center justify-center text-[10px] font-bold rounded bg-gray-700 text-gray-300">
                    +
                  </span>
                  <span>Custom / Other</span>
                </li>
              </ul>
            )}
          </div>
        </div>

        {/* Date Obtained */}
        <div>
          <label className={labelClass}>Date Obtained *</label>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.dateMonth}
              onChange={(e) => updateForm({ dateMonth: e.target.value })}
              className={inputClass}
              required
              aria-label="Certificate month"
            >
              <option value="">Month</option>
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              value={form.dateYear}
              onChange={(e) => updateForm({ dateYear: e.target.value })}
              className={inputClass}
              required
              aria-label="Certificate year"
            >
              <option value="">Year</option>
              {generateYears().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Custom platform fields */}
      {displayPlatform === CUSTOM_VALUE && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Platform Name *</label>
            <input
              type="text"
              required
              value={isCustom && form.platform !== CUSTOM_VALUE ? form.platform : ""}
              onChange={(e) => updateForm({ platform: e.target.value || CUSTOM_VALUE })}
              className={inputClass}
              placeholder="e.g., Pluralsight"
            />
          </div>
          <div>
            <label className={labelClass}>Platform Icon URL</label>
            <input
              type="url"
              value={form.platformIconUrl}
              onChange={(e) => updateForm({ platformIconUrl: e.target.value })}
              className={inputClass}
              placeholder="https://... (optional)"
            />
          </div>
        </div>
      )}
    </div>
  );
};
