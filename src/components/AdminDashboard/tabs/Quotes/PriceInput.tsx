import { useEffect, useState } from "react";
import { fromMinor, toMinor } from "@/utils/quoteMath";

const inputCls = "glass-input w-full rounded-lg px-3 py-2 min-h-11";

/**
 * Money box: keeps the typed text and reports whether it is a valid amount
 * through onValidity, so the editor can block Next/Save while it is not.
 */
export function PriceInput({
  id,
  label,
  minor,
  onChange,
  onValidity,
  error,
}: {
  id: string;
  label: string;
  minor: number;
  onChange: (m: number) => void;
  onValidity?: (id: string, ok: boolean) => void;
  error?: string;
}) {
  const [text, setText] = useState(minor ? fromMinor(minor) : "");
  const [bad, setBad] = useState(false);
  // A box that disappears (item removed) must not keep blocking the editor.
  useEffect(() => () => onValidity?.(id, true), [id, onValidity]);
  const shown = bad ? "Enter a valid amount, e.g. 1,250.00" : error;
  return (
    <div>
      <input
        aria-label={label}
        aria-invalid={bad || undefined}
        inputMode="decimal"
        placeholder={label === "Discount" ? "Discount" : "0.00"}
        className={inputCls}
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          const m = v.trim() === "" ? 0 : toMinor(v);
          setBad(m === null);
          onValidity?.(id, m !== null);
          if (m !== null) onChange(m);
        }}
      />
      {shown && (
        <p className="text-xs mt-1" style={{ color: "var(--status-failed-text)" }}>
          {shown}
        </p>
      )}
    </div>
  );
}
