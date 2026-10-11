import React, { useRef, type KeyboardEvent } from "react";

/** Ghana Mobile Money networks. Ids match the server's quote checkout. */
export type MomoNetwork = "mtn" | "telecel" | "airteltigo";

interface NetworkOption {
  id: MomoNetwork;
  label: string;
  shortLabel: string;
  bg: string;
  textColor: string;
  border: string;
  glow: string;
  tint: string;
}

/** Each network in its own colours (not their trademarked logos). */
export const MOMO_NETWORKS: NetworkOption[] = [
  {
    id: "mtn",
    label: "MTN MoMo",
    shortLabel: "MTN",
    bg: "#ffcc00",
    textColor: "#000000",
    border: "#ffcc00",
    glow: "rgba(255,204,0,0.4)",
    tint: "rgba(255,204,0,0.08)",
  },
  {
    id: "telecel",
    label: "Telecel Cash",
    shortLabel: "TEL",
    bg: "#e60000",
    textColor: "#ffffff",
    border: "#e60000",
    glow: "rgba(230,0,0,0.4)",
    tint: "rgba(230,0,0,0.08)",
  },
  {
    id: "airteltigo",
    label: "AirtelTigo Money",
    shortLabel: "AT",
    bg: "linear-gradient(135deg, #e60000 0%, #001f6b 100%)",
    textColor: "#ffffff",
    border: "#5b7fd4",
    glow: "rgba(91,127,212,0.4)",
    tint: "rgba(91,127,212,0.08)",
  },
];

/** Pick a Mobile Money network; the number is entered in Paystack's secure window. */
const MomoNetworkPicker: React.FC<{
  value: MomoNetwork | null;
  onChange: (network: MomoNetwork) => void;
}> = ({ value, onChange }) => {
  const group = useRef<HTMLDivElement>(null);

  // Arrow keys move the choice, as in a native radio group.
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const i = Math.max(
      0,
      MOMO_NETWORKS.findIndex((n) => n.id === value),
    );
    const next = MOMO_NETWORKS[(i + step + MOMO_NETWORKS.length) % MOMO_NETWORKS.length];
    onChange(next.id);
    group.current?.querySelector<HTMLButtonElement>(`[data-network="${next.id}"]`)?.focus();
  };

  return (
    <div
      ref={group}
      role="radiogroup"
      aria-label="Mobile Money network"
      onKeyDown={onKey}
      className="flex flex-col gap-3"
    >
      {MOMO_NETWORKS.map((net, index) => {
        const isSelected = value === net.id;
        const focusable = isSelected || (value === null && index === 0);
        return (
          <button
            key={net.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={focusable ? 0 : -1}
            data-network={net.id}
            onClick={() => onChange(net.id)}
            className="flex items-center gap-4 w-full rounded-xl px-4 py-3 transition-all"
            style={{
              border: isSelected ? `2px solid ${net.border}` : "2px solid var(--border-subtle)",
              background: isSelected ? net.tint : "transparent",
              boxShadow: isSelected ? `0 0 12px ${net.glow}` : "none",
              cursor: "pointer",
            }}
          >
            <span
              aria-hidden
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: net.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontWeight: 800,
                fontSize: "12px",
                color: net.textColor,
                letterSpacing: "0.5px",
              }}
            >
              {net.shortLabel}
            </span>
            <span className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
              {net.label}
            </span>
            <span
              aria-hidden
              className="ml-auto"
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                border: isSelected ? "none" : "2px solid var(--border-subtle)",
                background: isSelected ? "var(--accent-teal)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {isSelected && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default MomoNetworkPicker;
