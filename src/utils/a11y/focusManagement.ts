/**
 * Focus Management Utilities
 * @module utils/a11y/focusManagement
 */

/**
 * Traps focus within a container element (for modals, dialogs)
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableSelectors = [
    "button:not([disabled])",
    "a[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(", ");

  const focusableElements =
    container.querySelectorAll<HTMLElement>(focusableSelectors);
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== "Tab") return;

    if (event.shiftKey) {
      if (document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable?.focus();
      }
    }
  }

  container.addEventListener("keydown", handleKeyDown);
  firstFocusable?.focus();

  return () => {
    container.removeEventListener("keydown", handleKeyDown);
  };
}

/**
 * Announces a message to screen readers
 */
export function announce(
  message: string,
  priority: "polite" | "assertive" = "polite",
): void {
  const announcer = document.createElement("div");
  announcer.setAttribute("role", priority === "assertive" ? "alert" : "status");
  announcer.setAttribute("aria-live", priority);
  announcer.setAttribute("aria-atomic", "true");
  announcer.className = "sr-only";
  announcer.style.cssText = `
    position: absolute; width: 1px; height: 1px; padding: 0;
    margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0);
    white-space: nowrap; border: 0;
  `;

  document.body.appendChild(announcer);
  setTimeout(() => {
    announcer.textContent = message;
  }, 100);
  setTimeout(() => {
    document.body.removeChild(announcer);
  }, 1000);
}
