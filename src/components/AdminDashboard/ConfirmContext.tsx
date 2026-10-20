import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
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
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const isOpen = state !== null;

  // Stable across renders: the whole dashboard reads this context, so a new
  // function each time would re-render it whenever the dialog opens or closes.
  const confirm = useCallback<ConfirmFn>((opts) => {
    const normalised: State = typeof opts === "string" ? { message: opts } : opts;
    if (resolveRef.current) {
      // One dialog at a time: a second request replaces the open one, which
      // settles as cancelled. Overwriting the resolver left the first caller
      // awaiting forever; queuing would keep a caller waiting on a dialog
      // nobody has seen yet. Focus still returns to the first trigger.
      resolveRef.current(false);
    } else {
      // A caller that chains a second confirm after the first settles runs
      // before the first dialog unmounts, so focus can still be inside it.
      // Keep the original trigger then; the dialog's own button is about to go.
      const active = document.activeElement;
      if (!overlayRef.current?.contains(active)) {
        returnFocusRef.current = active instanceof HTMLElement ? active : null;
      }
    }
    return new Promise<boolean | string>((resolve) => {
      resolveRef.current = resolve;
      setChoice(normalised.defaultChoice ?? normalised.choices?.[0]?.value ?? "");
      setState(normalised);
    });
  }, []);

  const close = useCallback((value: boolean | string) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setState(null);
  }, []);

  // Cancel, not the destructive button, takes focus, so a stray Enter can't
  // delete anything. Runs per request, so a replacing dialog is focused too.
  useEffect(() => {
    if (state) cancelRef.current?.focus();
  }, [state]);

  // While open the dialog is modal: everything else on the page is inert, and
  // Escape cancels. On close, focus goes back to whatever opened it.
  useEffect(() => {
    if (!isOpen) return;
    const background = Array.from(document.body.children).filter(
      (el) => el !== overlayRef.current && !el.hasAttribute("inert"),
    );
    background.forEach((el) => el.setAttribute("inert", ""));

    // Capture phase, and stopped there: a Modal underneath also closes on
    // Escape from a document listener, and one key press should only cancel
    // this dialog.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      close(false);
    };
    window.addEventListener("keydown", onKeyDown, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      background.forEach((el) => el.removeAttribute("inert"));
      restoreFocus(returnFocusRef.current);
      returnFocusRef.current = null;
    };
  }, [isOpen, close]);

  // Confirming a dialog that offered choices resolves the selection, so the
  // caller gets the picked value rather than a bare true.
  const accept = () => close(state?.choices?.length ? choice : true);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state &&
        createPortal(
          <div
            ref={overlayRef}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:pl-[calc(var(--admin-sidebar-w,0px)+1rem)]"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={descriptionId}
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
                    <FaCheckCircle aria-hidden="true" className="text-green-400 text-sm" />
                  ) : (
                    <FaTrash aria-hidden="true" className="text-red-400 text-sm" />
                  )}
                </div>
                <h2 id={titleId} className="text-base font-bold text-[var(--text-primary)]">
                  {state.message}
                </h2>
              </div>
              <p
                id={descriptionId}
                className="text-sm mb-6 pl-[52px]"
                style={{ color: "var(--text-secondary)" }}
              >
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
                  ref={cancelRef}
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
                      ? "bg-success-700 hover:bg-success-800"
                      : "bg-error-700 hover:bg-error-800"
                  }`}
                >
                  {state.confirmLabel ?? (state.variant === "success" ? "Confirm" : "Delete")}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </ConfirmContext.Provider>
  );
}

function restoreFocus(target: HTMLElement | null) {
  if (target?.isConnected) {
    target.focus();
    if (document.activeElement === target) return;
  }
  // The trigger is gone (its row menu closed as the dialog opened) or can no
  // longer take focus. Land on the main region, which carries tabIndex={-1} for
  // this, rather than leaving keyboard and screen reader users at the top of
  // <body>. This runs as the dialog closes, before the caller acts on the
  // answer, so it does not cover a row that a confirmed delete removes later.
  document.querySelector<HTMLElement>("main")?.focus();
}
