import { useState, useEffect, useRef } from "react";

export function useTypewriter(strings) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const timeoutRef = useRef(null);
  const pauseTimeoutRef = useRef(null);

  useEffect(() => {
    // The list can swap under us (dashboard-managed roles arriving after the
    // bundled defaults), so wrap the index instead of indexing past the end.
    if (!strings || strings.length === 0) return undefined;
    const safeIndex = currentIndex % strings.length;
    if (safeIndex !== currentIndex) {
      setCurrentIndex(safeIndex);
      return undefined;
    }
    const currentString = strings[safeIndex];
    const typingSpeed = isDeleting ? 50 : 100;
    const pauseTime = isDeleting ? 500 : 2000;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      if (!isDeleting && displayText.length < currentString.length) {
        setDisplayText(currentString.substring(0, displayText.length + 1));
      } else if (!isDeleting && displayText.length === currentString.length) {
        pauseTimeoutRef.current = setTimeout(() => setIsDeleting(true), pauseTime);
      } else if (isDeleting && displayText.length > 0) {
        setDisplayText(currentString.substring(0, displayText.length - 1));
      } else if (isDeleting && displayText.length === 0) {
        setIsDeleting(false);
        setCurrentIndex((prev) => (prev + 1) % strings.length);
      }
    }, typingSpeed);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, [displayText, isDeleting, currentIndex, strings]);

  return displayText;
}
