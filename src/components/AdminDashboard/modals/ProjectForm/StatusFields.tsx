import React from "react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { STATUS_OPTIONS } from "./constants";
import type { FormFieldProps } from "./types";

export const StatusFields: React.FC<FormFieldProps> = ({ form, setForm, theme, labelClass }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
    <div>
      <label className={labelClass}>Status</label>
      <CustomSelect
        value={form.status}
        onChange={(value) => setForm({ ...form, status: value })}
        options={STATUS_OPTIONS}
        theme={theme}
        ariaLabel="Select project status"
      />
    </div>
    <div className="flex items-center pt-8">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.featured}
          onChange={(e) => setForm({ ...form, featured: e.target.checked })}
          className="w-5 h-5 rounded border-2 text-oceanic-500 focus:ring-oceanic-500"
        />
        <span className={`font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
          Featured Project
        </span>
      </label>
    </div>
  </div>
);
