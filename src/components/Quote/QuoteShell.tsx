import React from "react";
import { Helmet } from "react-helmet-async";

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
  return (
    <div className="min-h-dvh print:bg-white" style={{ background: "var(--bg-primary)" }}>
      <Helmet>
        <title>{`${title} · OceanicCoder`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <header className="print:hidden border-b" style={{ borderColor: "var(--border-subtle)" }}>
        <div className={`${max} mx-auto px-4 h-14 flex items-center justify-between`}>
          <a href="/" className="flex items-center gap-2 shrink-0">
            <img src="/images/logo/Oceaniccoder-croped.png" alt="" className="h-7 w-7 rounded" />
            <span className="font-heading font-semibold" style={{ color: "var(--text-primary)" }}>
              OceanicCoder
            </span>
          </a>
          <a
            href="mailto:hello@oceaniccoder.dev"
            className="text-xs sm:text-sm truncate ml-3 min-w-0"
            style={{ color: "var(--text-secondary)" }}
          >
            hello@oceaniccoder.dev
          </a>
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
      className={`rounded-2xl border p-5 sm:p-7 print:border-gray-300 print:break-inside-avoid ${className}`}
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}
    >
      {children}
    </section>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-mono text-[11px] uppercase tracking-[0.12em] mb-3"
      style={{ color: "var(--text-secondary)" }}
    >
      {children}
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
          style={{ background: "var(--accent-teal)" }}
        >
          Try again
        </button>
      )}
    </QuoteCard>
  );
}
