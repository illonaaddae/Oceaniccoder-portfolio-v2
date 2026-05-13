import { useState, useEffect } from "react";
import { sequence, TerminalLine } from "./terminalTheme";

const LOADER_KEY = "hasSeenLoader";

const SKIP_PATHS = ["/pay/", "/dashboard", "/admin"];
const shouldSkipForPath = () => SKIP_PATHS.some((p) => window.location.pathname.startsWith(p));

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
