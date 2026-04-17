import type { EducationFormState } from "./types";

export const months = [
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

export const classHonoursOptions = [
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

export const generateYears = (): number[] => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  // Include 5 years into the future for expected graduation dates
  for (let i = currentYear + 5; i >= currentYear - 50; i--) {
    years.push(i);
  }
  return years;
};

export const initialFormState: EducationFormState = {
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
  isVisible: true,
};
