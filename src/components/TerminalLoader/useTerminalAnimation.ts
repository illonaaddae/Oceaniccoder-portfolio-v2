import { useState, useEffect } from "react";
import { sequence, TerminalLine } from "./terminalTheme";

const LOADER_KEY = "hasSeenLoader";

export function useTerminalAnimation() {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [loading, setLoading] = useState(
    () => sessionStorage.getItem(LOADER_KEY) !== "true",
  );

  useEffect(() => {
    // If the user has already seen the loader this session, skip it entirely
    if (sessionStorage.getItem(LOADER_KEY) === "true") return;

    const timeoutIds: NodeJS.Timeout[] = [];
    let accumulatedTime = 0;

    sequence.forEach((step) => {
      accumulatedTime += step.delay;
      const id = setTimeout(() => {
        setLines((prev) => [...prev, step]);
      }, accumulatedTime);
      timeoutIds.push(id);
    });

    // Mark as seen and dismiss the loader after the full sequence completes
    const finishId = setTimeout(() => {
      setLoading(false);
      sessionStorage.setItem(LOADER_KEY, "true");
    }, accumulatedTime + 800);
    timeoutIds.push(finishId);

    return () => timeoutIds.forEach(clearTimeout);
  }, []); // intentionally empty — only runs once on first mount

  return { lines, loading };
}
