import React from "react";
import { FaCheckCircle, FaExclamationCircle, FaTimes } from "react-icons/fa";
import type { ToastState } from "./types";

interface ToastProps {
  toast: ToastState;
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = React.memo(({ toast, onDismiss }) => (
  <div
    className={`fixed top-4 right-4 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg animate-pulse ${
      toast.type === "success"
        ? "bg-[var(--brand-ocean-2)]/20 border-[var(--brand-ocean-2)]/50 text-[var(--brand-ocean-2)]"
        : "bg-red-500/20 border-red-400/50 text-red-400"
    }`}
  >
    {toast.type === "success" ? (
      <FaCheckCircle className="text-lg flex-shrink-0" />
    ) : (
      <FaExclamationCircle className="text-lg flex-shrink-0" />
    )}
    <p className="flex-1 text-sm font-medium">{toast.message}</p>
    <button
      onClick={onDismiss}
      className="p-1 rounded-lg hover:bg-black/10 transition-colors"
      aria-label="Dismiss"
    >
      <FaTimes className="text-xs" />
    </button>
  </div>
));

Toast.displayName = "Toast";
export default Toast;
