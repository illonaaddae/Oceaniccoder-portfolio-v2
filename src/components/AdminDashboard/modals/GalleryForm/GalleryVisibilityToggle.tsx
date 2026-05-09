import React from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

interface GalleryVisibilityToggleProps {
  isPublic: boolean;
  onToggle: () => void;
  theme: "light" | "dark";
  labelClass: string;
}

export const GalleryVisibilityToggle: React.FC<GalleryVisibilityToggleProps> = ({
  isPublic,
  onToggle,
  theme,
  labelClass,
}) => {
  return (
    <div>
      <label className={labelClass}>Visibility</label>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${
          isPublic
            ? theme === "dark"
              ? "bg-green-500/20 border-green-500/50 text-green-400"
              : "bg-green-50 border-green-300 text-green-700"
            : theme === "dark"
            ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
            : "bg-yellow-50 border-yellow-300 text-yellow-700"
        }`}
      >
        <div className="flex items-center gap-3">
          {isPublic ? (
            <FaEye className="text-lg" />
          ) : (
            <FaEyeSlash className="text-lg" />
          )}
          <span className="font-medium">{isPublic ? "Public" : "Hidden"}</span>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-lg ${
            isPublic
              ? theme === "dark"
                ? "bg-green-500/30"
                : "bg-green-100"
              : theme === "dark"
              ? "bg-yellow-500/30"
              : "bg-yellow-100"
          }`}
        >
          {isPublic ? "Visible to everyone" : "Admin only"}
        </span>
      </button>
      <p
        className={`text-xs mt-1 ${
          theme === "dark" ? "text-slate-400" : "text-slate-600"
        }`}
      >
        {isPublic
          ? "This image will be visible in the public gallery"
          : "This image will only be visible to admins"}
      </p>
    </div>
  );
};
