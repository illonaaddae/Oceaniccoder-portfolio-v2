import React from "react";

interface UrlInputProps {
  value: string;
  onChange: (url: string) => void;
  allowPdf: boolean;
  theme: "light" | "dark";
}

export const UrlInput: React.FC<UrlInputProps> = ({
  value,
  onChange,
  allowPdf,
  theme,
}) => (
  <div className="mt-3">
    <div
      className={`flex items-center gap-2 text-xs mb-1 ${
        theme === "dark" ? "text-gray-500" : "text-slate-500"
      }`}
    >
      <span>Or paste {allowPdf ? "file" : "image"} URL directly:</span>
    </div>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="https://..."
      className={`w-full px-3 py-2 text-sm rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-oceanic-500/50 ${
        theme === "dark"
          ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500 focus:border-oceanic-500/60"
          : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-oceanic-500"
      }`}
    />
  </div>
);
