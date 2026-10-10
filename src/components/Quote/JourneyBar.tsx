import type { CSSProperties } from "react";
import { FaCheck } from "react-icons/fa";
import { journeySteps } from "./journey";
import type { ClientQuote } from "@/types/quote";

// Phones get four equal columns (dot over label) so nothing scrolls sideways;
// from sm up the steps become pills joined by short rules.
export default function JourneyBar({ quote }: { quote: ClientQuote }) {
  if (quote.status === "declined" || quote.status === "expired") return null;
  const steps = journeySteps(quote);
  return (
    <nav aria-label="Progress" className="print:hidden">
      <ol className="grid grid-cols-4 gap-1 sm:flex sm:items-center sm:gap-2">
        {steps.map((s, i) => (
          <li key={s.key} className="flex items-center justify-center sm:gap-2">
            <span
              aria-current={s.current ? "step" : undefined}
              className="flex flex-col items-center gap-1.5 text-xs font-medium sm:flex-row sm:gap-2 sm:rounded-full sm:border sm:px-3 sm:py-1.5 sm:text-sm sm:[background:var(--pill-bg)] sm:[border-color:var(--pill-border)]"
              style={
                {
                  "--pill-border": s.current ? "var(--accent-teal)" : "var(--border-subtle)",
                  "--pill-bg": s.done ? "var(--accent-teal-subtle)" : "var(--bg-secondary)",
                  color: s.done || s.current ? "var(--text-primary)" : "var(--text-secondary)",
                } as CSSProperties
              }
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold sm:h-5 sm:w-5 sm:text-[11px]"
                style={{
                  background: s.done || s.current ? "var(--quote-cta)" : "var(--bg-tertiary)",
                  color: s.done || s.current ? "#fff" : "var(--text-secondary)",
                }}
              >
                {s.done ? <FaCheck aria-hidden /> : i + 1}
              </span>
              {s.label}
              {s.done && <span className="sr-only">(completed)</span>}
            </span>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className="hidden sm:block w-4 h-px"
                style={{ background: "var(--border-subtle)" }}
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
