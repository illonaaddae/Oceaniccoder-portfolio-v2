import React from "react";
import { DateSelector } from "./DateSelector";
import { StatusToggle } from "./StatusToggle";
import type { EducationFormState, FormUpdater } from "./types";

interface PeriodSectionProps {
  form: EducationFormState;
  updateForm: FormUpdater;
  years: number[];
  theme: "light" | "dark";
  inputClass: string;
  labelClass: string;
}

export const PeriodSection: React.FC<PeriodSectionProps> = ({
  form,
  updateForm,
  years,
  theme,
  inputClass,
  labelClass,
}) => (
  <div className="space-y-4">
    {/* Status Toggle */}
    <div>
      <label className={labelClass}>Status</label>
      <StatusToggle
        isOngoing={form.isOngoing}
        onChange={(isOngoing) => updateForm({ isOngoing })}
        theme={theme}
      />
    </div>

    {/* Start Date */}
    <div>
      <label className={labelClass}>Start Date *</label>
      <DateSelector
        monthValue={form.startMonth}
        yearValue={form.startYear}
        onMonthChange={(startMonth) => updateForm({ startMonth })}
        onYearChange={(startYear) => updateForm({ startYear })}
        years={years}
        inputClass={inputClass}
        required
        monthLabel="Start month"
        yearLabel="Start year"
      />
    </div>

    {/* End Date — hidden when ongoing */}
    {!form.isOngoing && (
      <div>
        <label className={labelClass}>End Date</label>
        <DateSelector
          monthValue={form.endMonth}
          yearValue={form.endYear}
          onMonthChange={(endMonth) => updateForm({ endMonth })}
          onYearChange={(endYear) => updateForm({ endYear })}
          years={years}
          inputClass={inputClass}
          monthLabel="End month"
          yearLabel="End year"
        />
      </div>
    )}
  </div>
);
