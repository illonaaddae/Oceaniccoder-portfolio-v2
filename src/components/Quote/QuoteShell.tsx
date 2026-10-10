import React from "react";
import { Helmet } from "react-helmet-async";
import { FaMoon, FaSun } from "react-icons/fa";
import NavLogo from "@/components/Navbar/Logo";
import useTheme from "@/hooks/useTheme";

// Logo.jsx is untyped JS, so its props infer as {}.
const Logo = NavLogo as React.ComponentType<{ theme: string }>;

const WIDTHS = { narrow: "max-w-2xl", quote: "max-w-4xl", wide: "max-w-5xl" } as const;

/** Frame for every client-facing quote page: slim brand bar, noindex, print-friendly. */
export default function QuoteShell({
  title,
  width = "quote",
  children,
}: {
  title: string;
  width?: keyof typeof WIDTHS;
  children: React.ReactNode;
}) {
  const max = WIDTHS[width];
  const { theme, toggleTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <div className="quote-ui min-h-dvh print:bg-white" style={{ background: "var(--bg-primary)" }}>
      <Helmet>
        <title>{`${title} · OceanicCoder`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <header
        className="print:hidden border-b"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}
      >
        <div className={`${max} mx-auto px-4 h-16 flex items-center justify-between`}>
          {/* The wordmark already spells the name, so no text label beside it. */}
          <Logo theme={theme} />
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <a
              href="mailto:hello@oceaniccoder.dev"
              className="text-xs sm:text-sm truncate min-w-0"
              style={{ color: "var(--text-secondary)" }}
            >
              hello@oceaniccoder.dev
            </a>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${next} mode`}
              title={`Switch to ${next} mode`}
              className="shrink-0 h-10 w-10 rounded-full border flex items-center justify-center transition-colors hover:bg-[var(--bg-tertiary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-teal)]"
              style={{ borderColor: "var(--border-subtle)", color: "var(--accent-teal)" }}
            >
              {theme === "dark" ? <FaSun aria-hidden /> : <FaMoon aria-hidden />}
            </button>
          </div>
        </div>
      </header>
      <div className={`${max} mx-auto px-4 py-8 sm:py-12 space-y-6 print:py-0`}>{children}</div>
    </div>
  );
}

export function QuoteCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border p-5 sm:p-7 shadow-[0_1px_2px_rgba(11,27,43,0.04)] print:border-gray-300 print:break-inside-avoid ${className}`}
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}
    >
      {children}
    </section>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.12em] mb-3">
      {/* The light theme forces every heading to --text-primary, so the brand
          colour goes on an inner span instead. */}
      <span style={{ color: "var(--accent-teal)" }}>{children}</span>
    </h2>
  );
}

export function QuoteLoading() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-40 rounded-2xl" style={{ background: "var(--bg-secondary)" }} />
      <div className="h-64 rounded-2xl" style={{ background: "var(--bg-secondary)" }} />
    </div>
  );
}

export function QuoteError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <QuoteCard className="text-center">
      <p className="mb-4" style={{ color: "var(--text-primary)" }}>
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-5 py-2.5 rounded-xl font-semibold text-white"
          style={{ background: "var(--quote-cta)" }}
        >
          Try again
        </button>
      )}
    </QuoteCard>
  );
}
