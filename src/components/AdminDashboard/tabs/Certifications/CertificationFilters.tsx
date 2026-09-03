import React from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { CustomSelect } from "@/components/ui/CustomSelect";
import type { CertificationFilters as Filters } from "./useCertificationFilters";

interface Props {
  theme: "light" | "dark";
  filters: Filters;
  setFilter: (patch: Partial<Filters>) => void;
  clearFilters: () => void;
  isFiltered: boolean;
  platforms: string[];
  types: string[];
  years: string[];
  shown: number;
  total: number;
}

const ANY = "";

export const CertificationFilters: React.FC<Props> = ({
  theme,
  filters,
  setFilter,
  clearFilters,
  isFiltered,
  platforms,
  types,
  years,
  shown,
  total,
}) => {
  const dark = theme === "dark";
  const options = (values: string[], anyLabel: string) => [
    { value: ANY, label: anyLabel },
    ...values.map((v) => ({ value: v, label: v })),
  ];

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <div
          className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
            dark
              ? "bg-gray-800/80 border border-gray-700 focus-within:border-oceanic-500/60"
              : "bg-white/60 border border-oceanic-200/40 focus-within:border-oceanic-400/60"
          }`}
        >
          <FaSearch className={`flex-shrink-0 ${dark ? "text-gray-500" : "text-slate-500"}`} />
          <label htmlFor="cert-filter-search" className="sr-only">
            Search certifications
          </label>
          <input
            id="cert-filter-search"
            type="text"
            placeholder="Search title, issuer, skill..."
            value={filters.search}
            onChange={(e) => setFilter({ search: e.target.value })}
            className={`flex-1 bg-transparent outline-none ${
              dark ? "text-white placeholder-slate-400" : "text-slate-900 placeholder-slate-500"
            }`}
          />
        </div>

        <CustomSelect
          value={filters.platform}
          onChange={(platform) => setFilter({ platform })}
          options={options(platforms, "All platforms")}
          theme={theme}
          ariaLabel="Filter by platform"
          searchable={platforms.length > 8}
        />
        <CustomSelect
          value={filters.type}
          onChange={(type) => setFilter({ type })}
          options={options(types, "All types")}
          theme={theme}
          ariaLabel="Filter by certification type"
        />
        <CustomSelect
          value={filters.year}
          onChange={(year) => setFilter({ year })}
          options={options(years, "All years")}
          theme={theme}
          ariaLabel="Filter by year"
        />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
          {isFiltered ? `Showing ${shown} of ${total}` : `${total} certifications`}
        </p>
        {isFiltered && (
          <button
            type="button"
            onClick={clearFilters}
            className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border transition ${
              dark
                ? "border-gray-700 text-slate-300 hover:bg-white/10"
                : "border-oceanic-200/50 text-slate-600 hover:bg-slate-900/5"
            }`}
          >
            <FaTimes className="text-[10px]" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};

export default CertificationFilters;
