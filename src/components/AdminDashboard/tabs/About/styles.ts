export const getInputClass = (theme: "light" | "dark", isReadOnly: boolean) =>
  `w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-oceanic-500/50 ${
    theme === "dark"
      ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500 focus:border-oceanic-500/60 focus:bg-gray-800"
      : "bg-white/50 border-oceanic-200/50 text-slate-900 placeholder-slate-500"
  } ${isReadOnly ? "cursor-not-allowed opacity-70" : ""}`;

export const getLabelClass = (theme: "light" | "dark") =>
  `text-sm font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`;

export const getCardClass = (_theme: "light" | "dark") => "glass-card p-6";

export const getHeadingClass = (theme: "light" | "dark") =>
  `text-lg font-bold flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-slate-900"}`;
