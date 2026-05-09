import React, { useEffect } from "react";
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaInfoCircle,
  FaTimes,
} from "react-icons/fa";
export type { ToastType, ToastMessage } from "./useToastHook";
export { useToast } from "./useToastHook";
import type { ToastMessage } from "./useToastHook";

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
  theme: "light" | "dark";
}

const TOAST_COLORS = {
  success: {
    dark: "bg-green-500/20 border-green-400/50 text-green-300",
    light: "bg-green-50 border-green-200 text-green-700",
    icon: "text-green-400",
  },
  error: {
    dark: "bg-red-500/20 border-red-400/50 text-red-300",
    light: "bg-red-50 border-red-200 text-red-700",
    icon: "text-red-400",
  },
  info: {
    dark: "bg-blue-500/20 border-oceanic-500/50 text-blue-300",
    light: "bg-blue-50 border-blue-200 text-blue-700",
    icon: "text-blue-400",
  },
} as const;

const TOAST_ICONS = {
  success: FaCheckCircle,
  error: FaExclamationCircle,
  info: FaInfoCircle,
} as const;

const ToastItem: React.FC<{
  toast: ToastMessage;
  onRemove: (id: string) => void;
  theme: "light" | "dark";
}> = ({ toast, onRemove, theme }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const Icon = TOAST_ICONS[toast.type];
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg animate-slide-in ${TOAST_COLORS[toast.type][theme]}`}
    >
      <Icon
        className={`text-lg flex-shrink-0 ${TOAST_COLORS[toast.type].icon}`}
      />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="p-1 rounded-lg hover:bg-black/10 transition-colors"
        title="Dismiss"
        aria-label="Dismiss notification"
      >
        <FaTimes className="text-xs" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<ToastProps> = ({
  toasts,
  onRemove,
  theme,
}) => {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} theme={theme} />
      ))}
    </div>
  );
};
