import React from "react";
import { months } from "./constants";
import { CustomSelect } from "@/components/ui/CustomSelect";

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
  theme: "light" | "dark";
}

export const DateSelector: React.FC<DateSelectorProps> = ({
  monthValue,
  yearValue,
  onMonthChange,
  onYearChange,
  years,
  monthLabel,
  yearLabel,
  theme,
}) => (
  <div className="grid grid-cols-2 gap-3">
    <CustomSelect
      value={monthValue}
      onChange={(value) => onMonthChange(value)}
      options={months}
      theme={theme}
      placeholder="Month"
      ariaLabel={monthLabel}
    />
    <CustomSelect
      value={yearValue}
      onChange={(value) => onYearChange(value)}
      options={years.map((year) => ({ value: String(year), label: String(year) }))}
      theme={theme}
      placeholder="Year"
      ariaLabel={yearLabel}
      searchable
    />
  </div>
);
