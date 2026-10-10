import { FaCheck } from "react-icons/fa";
import { journeySteps } from "./journey";
import type { ClientQuote } from "@/types/quote";

export default function JourneyBar({ quote }: { quote: ClientQuote }) {
  if (quote.status === "declined" || quote.status === "expired") return null;
  const steps = journeySteps(quote);
  return (
    <nav aria-label="Progress" className="print:hidden overflow-x-auto">
      <ol className="flex items-center gap-2 min-w-max">
        {steps.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              aria-current={s.current ? "step" : undefined}
              className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium border"
              style={{
                borderColor: s.current ? "var(--accent-teal)" : "var(--border-subtle)",
                background: s.done ? "var(--accent-teal-subtle)" : "transparent",
                color: s.done || s.current ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
                style={{
                  background: s.done ? "var(--accent-teal)" : "var(--bg-tertiary)",
                  color: s.done ? "#fff" : "var(--text-secondary)",
                }}
              >
                {s.done ? <FaCheck aria-hidden /> : i + 1}
              </span>
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className="w-4 h-px"
                style={{ background: "var(--border-subtle)" }}
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
