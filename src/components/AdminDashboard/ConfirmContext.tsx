import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { FaTrash, FaCheckCircle } from "react-icons/fa";

export interface ConfirmChoice {
  value: string;
  label: string;
}

interface ConfirmOptions {
  message: string;
  description?: string;
  confirmLabel?: string;
  confirmClass?: string;
  variant?: "danger" | "success";
  // Optional radio group shown above the buttons, for confirmations that need
  // to capture a value rather than a plain yes/no. When present, confirming
  // resolves the selected `value` instead of `true`.
  choices?: ConfirmChoice[];
  choiceLabel?: string;
  defaultChoice?: string;
}

// Resolves false on cancel. On confirm, resolves the selected choice when
// `choices` was supplied, otherwise true — so existing truthy-checking callers
// are unaffected.
type ConfirmFn = (opts: ConfirmOptions | string) => Promise<boolean | string>;

// No usable default: a caller outside the provider used to get a function that
// resolved false, so every delete it guarded was cancelled with no dialog.
const ConfirmContext = createContext<ConfirmFn | null>(null);

export const useConfirm = (): ConfirmFn => {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return confirm;
};

interface State {
  message: string;
  description?: string;
  confirmLabel?: string;
  variant?: "danger" | "success";
  choices?: ConfirmChoice[];
  choiceLabel?: string;
  defaultChoice?: string;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const [choice, setChoice] = useState<string>("");
  const resolveRef = useRef<((v: boolean | string) => void) | null>(null);

  // Stable across renders: the whole dashboard reads this context, so a new
  // function each time would re-render it whenever the dialog opens or closes.
  const confirm = useCallback<ConfirmFn>((opts) => {
    const normalised: State = typeof opts === "string" ? { message: opts } : opts;
    return new Promise<boolean | string>((resolve) => {
      resolveRef.current = resolve;
      setChoice(normalised.defaultChoice ?? normalised.choices?.[0]?.value ?? "");
      setState(normalised);
    });
  }, []);

  const close = (value: boolean | string) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setState(null);
  };

  // Confirming a dialog that offered choices resolves the selection, so the
  // caller gets the picked value rather than a bare true.
  const accept = () => close(state?.choices?.length ? choice : true);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:pl-[calc(var(--admin-sidebar-w,0px)+1rem)]"
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
            {state.choices && state.choices.length > 0 && (
              <fieldset className="mb-6 pl-[52px]">
                {state.choiceLabel && (
                  <legend
                    className="text-xs font-semibold mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {state.choiceLabel}
                  </legend>
                )}
                <div className="flex flex-col gap-2">
                  {state.choices.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 text-sm cursor-pointer text-[var(--text-primary)]"
                    >
                      <input
                        type="radio"
                        name="confirm-choice"
                        value={option.value}
                        checked={choice === option.value}
                        onChange={() => setChoice(option.value)}
                        className="accent-green-600"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
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
                onClick={accept}
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
