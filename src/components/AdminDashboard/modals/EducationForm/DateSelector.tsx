import React from "react";
import { months } from "./constants";

interface DateSelectorProps {
  monthValue: string;
  yearValue: string;
  onMonthChange: (value: string) => void;
  onYearChange: (value: string) => void;
  years: number[];
  inputClass: string;
  required?: boolean;
  monthLabel: string;
  yearLabel: string;
}

export const DateSelector: React.FC<DateSelectorProps> = ({
  monthValue,
  yearValue,
  onMonthChange,
  onYearChange,
  years,
  inputClass,
  required,
  monthLabel,
  yearLabel,
}) => (
  <div className="grid grid-cols-2 gap-3">
    <select
      value={monthValue}
      onChange={(e) => onMonthChange(e.target.value)}
      className={inputClass}
      required={required}
      aria-label={monthLabel}
    >
      <option value="">Month</option>
      {months.map((month) => (
        <option key={month.value} value={month.value}>
          {month.label}
        </option>
      ))}
    </select>
    <select
      value={yearValue}
      onChange={(e) => onYearChange(e.target.value)}
      className={inputClass}
      required={required}
      aria-label={yearLabel}
    >
      <option value="">Year</option>
      {years.map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  </div>
);
