import React, { useEffect, useState } from "react";
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from "react-icons/fa";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
  theme: "light" | "dark";
}

const ToastItem: React.FC<{
  toast: ToastMessage;
  onRemove: (id: string) => void;
  theme: "light" | "dark";
}> = ({ toast, onRemove, theme }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const icons = {
    success: FaCheckCircle,
    error: FaExclamationCircle,
    info: FaInfoCircle,
  };

  const colors = {
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
      dark: "bg-blue-500/20 border-blue-400/50 text-blue-300",
      light: "bg-blue-50 border-blue-200 text-blue-700",
      icon: "text-blue-400",
    },
  };

  const Icon = icons[toast.type];
  const colorClass = colors[toast.type][theme];
  const iconColor = colors[toast.type].icon;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg animate-slide-in ${colorClass}`}
    >
      <Icon className={`text-lg flex-shrink-0 ${iconColor}`} />
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

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onRemove, theme }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} theme={theme} />
      ))}
    </div>
  );
};

// Hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastType, message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const success = (message: string) => addToast("success", message);
  const error = (message: string) => addToast("error", message);
  const info = (message: string) => addToast("info", message);

  return { toasts, removeToast, success, error, info };
};
