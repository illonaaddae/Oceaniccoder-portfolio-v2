import React, { useEffect } from "react";
import { FaTimes } from "react-icons/fa";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  theme: "light" | "dark";
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  theme,
  children,
  size = "md",
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container - for proper centering */}
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Modal */}
        <div
          className={`relative w-full ${
            sizeClasses[size]
          } rounded-2xl border shadow-2xl transition-all duration-300 ${
            theme === "dark"
              ? "bg-gradient-to-br from-slate-900 via-slate-900/98 to-slate-800 border-white/15 shadow-black/30"
              : "bg-gradient-to-br from-white to-slate-50 border-blue-200/60 shadow-blue-100/20"
          }`}
        >
          {/* Header */}
          <div
            className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b rounded-t-2xl ${
              theme === "dark"
                ? "bg-slate-900/95 backdrop-blur-sm border-white/10"
                : "bg-white/95 backdrop-blur-sm border-blue-200/30"
            }`}
          >
            <h2
              className={`text-xl font-bold ${
                theme === "dark" ? "text-white" : "text-slate-900"
              }`}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              title="Close modal"
              aria-label="Close modal"
              className={`p-2 rounded-lg transition-colors ${
                theme === "dark"
                  ? "text-slate-400 hover:text-white hover:bg-white/10"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <FaTimes />
            </button>
          </div>

          {/* Content - with max height and scroll */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
};
