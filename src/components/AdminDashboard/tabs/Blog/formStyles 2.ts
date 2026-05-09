export const inputClass = (theme: "light" | "dark") =>
  `w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-oceanic-500 ${
    theme === "dark"
      ? "bg-white/10 border-white/20 text-white placeholder-slate-400"
      : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500"
  }`;

export const labelClass = (theme: "light" | "dark") =>
  `block text-sm font-semibold mb-2 ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`;
