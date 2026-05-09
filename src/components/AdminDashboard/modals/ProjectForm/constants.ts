export const CATEGORY_OPTIONS = [
  { value: "", label: "Select Category" },
  { value: "Web App", label: "Web App" },
  { value: "Mobile App", label: "Mobile App" },
  { value: "Full Stack", label: "Full Stack" },
  { value: "AI/ML", label: "AI/ML" },
  { value: "Backend", label: "Backend" },
  { value: "Frontend", label: "Frontend" },
  { value: "Other", label: "Other" },
];

export const STATUS_OPTIONS = [
  { value: "Completed", label: "Completed" },
  { value: "In Progress", label: "In Progress" },
  { value: "Planning", label: "Planning" },
  { value: "draft", label: "Draft" },
];

export const getInputClass = (theme: "light" | "dark") =>
  `w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-oceanic-500/50 ${
    theme === "dark"
      ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500 focus:border-oceanic-500/60"
      : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500"
  }`;

export const getLabelClass = (theme: "light" | "dark") =>
  `block text-sm font-semibold mb-2 ${
    theme === "dark" ? "text-slate-200" : "text-slate-700"
  }`;

export const getAddButtonClass = (theme: "light" | "dark") =>
  `px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
    theme === "dark"
      ? "bg-oceanic-500/20 text-oceanic-500 hover:bg-oceanic-500/30"
      : "bg-oceanic-100 text-oceanic-700 hover:bg-oceanic-200"
  }`;
