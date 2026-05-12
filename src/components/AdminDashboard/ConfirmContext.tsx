import React, { createContext, useContext, useRef, useState } from "react";
import { FaTrash, FaCheckCircle } from "react-icons/fa";

interface ConfirmOptions {
  message: string;
  description?: string;
  confirmLabel?: string;
  confirmClass?: string;
  variant?: "danger" | "success";
}

type ConfirmFn = (opts: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

export const useConfirm = () => useContext(ConfirmContext);

interface State {
  message: string;
  description?: string;
  confirmLabel?: string;
  variant?: "danger" | "success";
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirm: ConfirmFn = (opts) => {
    const normalised: State = typeof opts === "string" ? { message: opts } : opts;
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState(normalised);
    });
  };

  const close = (value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  state.variant === "success" ? "bg-green-500/15" : "bg-red-500/15"
                }`}
              >
                {state.variant === "success" ? (
                  <FaCheckCircle className="text-green-400 text-sm" />
                ) : (
                  <FaTrash className="text-red-400 text-sm" />
                )}
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">{state.message}</h3>
            </div>
            <p className="text-sm mb-6 pl-[52px]" style={{ color: "var(--text-secondary)" }}>
              {state.description ?? "This action cannot be undone."}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => close(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition ${
                  state.variant === "success"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {state.confirmLabel ?? (state.variant === "success" ? "Confirm" : "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
