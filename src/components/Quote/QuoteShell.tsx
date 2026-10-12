import React from "react";
import { Helmet } from "react-helmet-async";
import { FaMoon, FaSun } from "react-icons/fa";
import NavLogo from "@/components/Navbar/Logo";
import { LOGO_PATHS } from "@/components/Navbar/navData";
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
  const rootRef = React.useRef<HTMLDivElement>(null);
  // Tailwind sizes are rem-based, so scale the root while a quote page is open
  // (about +6%). Restored on unmount; print resets it in index.css.
  React.useEffect(() => {
    const el = document.documentElement;
    const previous = el.style.fontSize;
    el.style.fontSize = "106.25%";
    return () => {
      el.style.fontSize = previous;
    };
  }, []);
  // Collapsed <details> are left out of print and PDF, so open them for it.
  React.useEffect(() => {
    const closed: Array<{ open: boolean }> = [];
    const before = () => {
      rootRef.current?.querySelectorAll("details").forEach((d) => {
        if (!d.open) {
          closed.push(d);
          d.open = true;
        }
      });
    };
    const after = () => {
      closed.splice(0).forEach((d) => {
        d.open = false;
      });
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
  const { theme, toggleTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <div
      ref={rootRef}
      className="quote-ui min-h-dvh print:bg-white"
      style={{ background: "var(--bg-primary)" }}
    >
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
      <div className={`${max} mx-auto px-4 py-8 sm:py-12 space-y-6 print:py-0`}>
        {/* The brand bar is hidden in print, so printed and saved-PDF
            documents carry the wordmark here instead. */}
        <img
          src={LOGO_PATHS.light}
          alt="Oceaniccoder"
          className="hidden print:block h-8 w-auto"
          width="112"
          height="32"
        />
        {children}
      </div>
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

/** Skeleton in the shape of a quote: steps, hero, then two content cards. */
export function QuoteLoading() {
  const bar = (w: string) => (
    <div className={`h-3 rounded-full ${w}`} style={{ background: "var(--bg-tertiary)" }} />
  );
  return (
    <div className="space-y-6 motion-safe:animate-pulse" aria-busy="true">
      <span className="sr-only">Loading your quote…</span>
      <div className="grid grid-cols-4 gap-2 sm:flex sm:gap-3" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-8 rounded-full sm:w-28"
            style={{ background: "var(--bg-tertiary)" }}
          />
        ))}
      </div>
      <div
        aria-hidden
        className="h-48 rounded-2xl opacity-60 bg-[linear-gradient(135deg,#04333B_0%,#085866_100%)]"
      />
      {[0, 1].map((i) => (
        <QuoteCard key={i}>
          <div className="space-y-3" aria-hidden>
            {bar("w-24")}
            {bar("w-full")}
            {bar("w-5/6")}
            {bar("w-2/3")}
          </div>
        </QuoteCard>
      ))}
    </div>
  );
}

/** Shown while a quote page's code chunk downloads, so clients never see the site spinner. */
export function QuoteRouteFallback() {
  return (
    <QuoteShell title="Your quote">
      <QuoteLoading />
    </QuoteShell>
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
