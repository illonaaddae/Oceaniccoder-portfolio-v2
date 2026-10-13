import type React from "react";

/**
 * Pill tones built on the theme status tokens. Those deepen to the -700
 * range on light, so the text passes AA on white and on the dark navy.
 * Neutral is for states that are not alarms (abandoned, draft, archived).
 */
export type PillTone = "success" | "pending" | "failed" | "neutral" | "neutral-dashed";

const NEUTRAL: React.CSSProperties = {
  background: "transparent",
  color: "var(--text-secondary)",
  borderColor: "var(--border-subtle)",
};

const TONES: Record<PillTone, React.CSSProperties> = {
  success: {
    background: "var(--status-success-bg)",
    color: "var(--status-success-text)",
    borderColor: "var(--status-success-border)",
  },
  pending: {
    background: "var(--status-pending-bg)",
    color: "var(--status-pending-text)",
    borderColor: "var(--status-pending-border)",
  },
  failed: {
    background: "var(--status-failed-bg)",
    color: "var(--status-failed-text)",
    borderColor: "var(--status-failed-border)",
  },
  neutral: NEUTRAL,
  "neutral-dashed": { ...NEUTRAL, borderStyle: "dashed" },
};

/** A status label, plus an "Archived" tag when the row is archived. */
export function StatusPill({
  tone,
  label,
  archived,
}: {
  tone: PillTone;
  label: string;
  archived?: boolean;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span
        className="inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold"
        style={TONES[tone]}
      >
        {label}
      </span>
      {archived && (
        <span
          className="inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium"
          style={NEUTRAL}
        >
          Archived
        </span>
      )}
    </span>
  );
}
