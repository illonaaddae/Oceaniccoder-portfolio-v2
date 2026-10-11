import { useState, useEffect } from "react";
import { sequence, TerminalLine } from "./terminalTheme";

const LOADER_KEY = "hasSeenLoader";

// The terminal intro belongs to the portfolio only. Client flows (quotes,
// invoices, payments, receipts, booking, inquiry), admin pages and unknown
// URLs never show it, so list where it may run rather than where it may not.
const PORTFOLIO_PATHS = ["/about", "/skills", "/projects", "/services", "/blog", "/contact"];
export const isPortfolioPath = (path: string) =>
  path === "/" || PORTFOLIO_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
const shouldSkipForPath = () => !isPortfolioPath(window.location.pathname);

export function useTerminalAnimation() {
  const isBot = typeof navigator !== "undefined" && navigator.webdriver === true;
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [loading, setLoading] = useState(
    () => !isBot && !shouldSkipForPath() && localStorage.getItem(LOADER_KEY) !== "true",
  );

  useEffect(() => {
    // Skip for bots, non-portfolio routes, and users who have already seen it
    if (isBot || shouldSkipForPath() || localStorage.getItem(LOADER_KEY) === "true") return;

    const timeoutIds: NodeJS.Timeout[] = [];
    let accumulatedTime = 0;

    sequence.forEach((step) => {
      accumulatedTime += step.delay;
      const id = setTimeout(() => {
        setLines((prev) => [...prev, step]);
      }, accumulatedTime);
      timeoutIds.push(id);
    });

    // Mark as seen and dismiss after full sequence
    const finishId = setTimeout(() => {
      setLoading(false);
      localStorage.setItem(LOADER_KEY, "true");
    }, accumulatedTime + 400);
    timeoutIds.push(finishId);

    return () => timeoutIds.forEach(clearTimeout);
  }, []); // intentionally empty — only runs once on first mount

  return { lines, loading };
}
