import { useState, useEffect, useMemo } from "react";
import type { Education } from "@/types";
import type { EducationFormState } from "./types";
import { initialFormState, generateYears } from "./constants";
import { formatPeriod, parseDateString, getInputClass, getLabelClass } from "./utils";

interface UseEducationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (edu: Omit<Education, "$id">) => Promise<void>;
  editingEducation?: Education | null;
  theme: "light" | "dark";
}

export const useEducationForm = ({
  isOpen, onClose, onSubmit, editingEducation, theme,
}: UseEducationFormProps) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<EducationFormState>(initialFormState);
  const [error, setError] = useState<string | null>(null);
  const years = useMemo(() => generateYears(), []);

  useEffect(() => {
    if (editingEducation) {
      const startParsed = parseDateString(editingEducation.startDate);
      const endParsed = parseDateString(editingEducation.endDate);
      const ed = editingEducation;
      setForm({
        institution: ed.institution || "",
        degree: ed.degree || "",
        field: ed.field || "",
        period: ed.period || "",
        description: ed.description || "",
        universityLogo: ed.universityLogo || ed.logo || "",
        initials: ed.initials || "",
        gpa: ed.gpa || "",
        classHonours: ed.classHonours || "",
        startMonth: startParsed.month,
        startYear: startParsed.year,
        endMonth: endParsed.month,
        endYear: endParsed.year,
        isOngoing: ed.isOngoing || false,
        location: ed.location || "",
        isVisible: ed.isVisible !== false,
      });
    } else {
      setForm(initialFormState);
    }
  }, [editingEducation, isOpen]);

  const updateForm = (updates: Partial<EducationFormState>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const startDate = form.startMonth && form.startYear
        ? `${form.startYear}-${form.startMonth}-01` : "";
      const endDate = !form.isOngoing && form.endMonth && form.endYear
        ? `${form.endYear}-${form.endMonth}-01` : "";
      const period = formatPeriod(startDate, endDate, form.isOngoing);

      const { startMonth, startYear, endMonth, endYear, ...rest } = form;
      await onSubmit({
        ...rest,
        period: period || form.period,
        startDate,
        endDate,
      });
      onClose();
    } catch (err) {
      console.error("Error submitting education:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = getInputClass(theme);
  const labelClass = getLabelClass(theme);

  return { form, updateForm, years, loading, error, handleSubmit, inputClass, labelClass };
};
