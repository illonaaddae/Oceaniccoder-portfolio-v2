/**
 * Accessibility (a11y) Utilities
 * Helpers for ensuring WCAG compliance and accessibility best practices
 *
 * @module utils/a11y
 */

// ============================================
// Types
// ============================================

export interface A11yCheckResult {
  passed: boolean;
  issues: A11yIssue[];
}

export interface A11yIssue {
  element: string;
  issue: string;
  severity: "error" | "warning" | "info";
  wcagCriteria?: string;
  suggestion?: string;
}

// ============================================
// Focus Management
// ============================================

/**
 * Traps focus within a container element (for modals, dialogs)
 * @param container - The container element to trap focus within
 * @returns Cleanup function to remove the trap
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
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable?.focus();
      }
    }
  }

  container.addEventListener("keydown", handleKeyDown);

  // Focus first element
  firstFocusable?.focus();

  return () => {
    container.removeEventListener("keydown", handleKeyDown);
  };
}

/**
 * Announces a message to screen readers
 * @param message - The message to announce
 * @param priority - "polite" or "assertive"
 */
export function announce(
  message: string,
  priority: "polite" | "assertive" = "polite"
): void {
  const announcer = document.createElement("div");
  announcer.setAttribute("role", priority === "assertive" ? "alert" : "status");
  announcer.setAttribute("aria-live", priority);
  announcer.setAttribute("aria-atomic", "true");
  announcer.className = "sr-only";
  announcer.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;

  document.body.appendChild(announcer);

  // Small delay to ensure screen reader picks up the change
  setTimeout(() => {
    announcer.textContent = message;
  }, 100);

  // Clean up after announcement
  setTimeout(() => {
    document.body.removeChild(announcer);
  }, 1000);
}

// ============================================
// Keyboard Navigation
// ============================================

/**
 * Handles arrow key navigation for lists/grids
 * @param event - Keyboard event
 * @param items - Array of navigable items
 * @param currentIndex - Current focused item index
 * @param options - Navigation options
 * @returns New index after navigation
 */
export function handleArrowNavigation(
  event: KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number,
  options: {
    wrap?: boolean;
    horizontal?: boolean;
    vertical?: boolean;
    columns?: number;
  } = {}
): number {
  const {
    wrap = true,
    horizontal = true,
    vertical = true,
    columns = 1,
  } = options;
  let newIndex = currentIndex;

  switch (event.key) {
    case "ArrowRight":
      if (horizontal) {
        newIndex = currentIndex + 1;
        if (newIndex >= items.length) {
          newIndex = wrap ? 0 : items.length - 1;
        }
      }
      break;
    case "ArrowLeft":
      if (horizontal) {
        newIndex = currentIndex - 1;
        if (newIndex < 0) {
          newIndex = wrap ? items.length - 1 : 0;
        }
      }
      break;
    case "ArrowDown":
      if (vertical) {
        newIndex = currentIndex + columns;
        if (newIndex >= items.length) {
          newIndex = wrap ? currentIndex % columns : items.length - 1;
        }
      }
      break;
    case "ArrowUp":
      if (vertical) {
        newIndex = currentIndex - columns;
        if (newIndex < 0) {
          newIndex = wrap
            ? items.length - columns + (currentIndex % columns)
            : currentIndex;
        }
      }
      break;
    case "Home":
      newIndex = 0;
      break;
    case "End":
      newIndex = items.length - 1;
      break;
    default:
      return currentIndex;
  }

  event.preventDefault();
  items[newIndex]?.focus();
  return newIndex;
}

// ============================================
// Accessibility Checks
// ============================================

/**
 * Checks an element for common accessibility issues
 * @param element - Element to check
 * @returns Check results with any issues found
 */
export function checkElementA11y(element: HTMLElement): A11yCheckResult {
  const issues: A11yIssue[] = [];
  const tagName = element.tagName.toLowerCase();

  // Check images for alt text
  if (tagName === "img") {
    const alt = element.getAttribute("alt");
    if (alt === null) {
      issues.push({
        element: tagName,
        issue: "Image missing alt attribute",
        severity: "error",
        wcagCriteria: "1.1.1 Non-text Content",
        suggestion:
          'Add an alt attribute describing the image, or alt="" for decorative images',
      });
    }
  }

  // Check buttons for accessible name
  if (tagName === "button") {
    const hasText = element.textContent?.trim();
    const hasAriaLabel = element.getAttribute("aria-label");
    const hasAriaLabelledBy = element.getAttribute("aria-labelledby");

    if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
      issues.push({
        element: tagName,
        issue: "Button has no accessible name",
        severity: "error",
        wcagCriteria: "4.1.2 Name, Role, Value",
        suggestion: "Add text content, aria-label, or aria-labelledby",
      });
    }
  }

  // Check links for accessible name
  if (tagName === "a") {
    const hasText = element.textContent?.trim();
    const hasAriaLabel = element.getAttribute("aria-label");
    const href = element.getAttribute("href");

    if (!hasText && !hasAriaLabel) {
      issues.push({
        element: tagName,
        issue: "Link has no accessible name",
        severity: "error",
        wcagCriteria: "2.4.4 Link Purpose",
        suggestion: "Add descriptive text content or aria-label",
      });
    }

    if (href === "#" || href === "javascript:void(0)") {
      issues.push({
        element: tagName,
        issue: "Link has non-functional href",
        severity: "warning",
        suggestion: "Use a button for actions, or provide a valid href",
      });
    }
  }

  // Check form inputs for labels
  if (["input", "select", "textarea"].includes(tagName)) {
    const id = element.getAttribute("id");
    const ariaLabel = element.getAttribute("aria-label");
    const ariaLabelledBy = element.getAttribute("aria-labelledby");
    const hasLabel = id && document.querySelector(`label[for="${id}"]`);

    if (!hasLabel && !ariaLabel && !ariaLabelledBy) {
      issues.push({
        element: tagName,
        issue: "Form input has no associated label",
        severity: "error",
        wcagCriteria: "1.3.1 Info and Relationships",
        suggestion: "Add a label element with for attribute, or use aria-label",
      });
    }
  }

  // Check for sufficient color contrast (simplified check)
  const style = window.getComputedStyle(element);
  const color = style.color;
  const backgroundColor = style.backgroundColor;

  if (color && backgroundColor && element.textContent?.trim()) {
    // Note: A full contrast check would require parsing colors and calculating ratios
    // This is a placeholder for integration with a proper contrast checking library
  }

  // Check tabindex
  const tabindex = element.getAttribute("tabindex");
  if (tabindex && parseInt(tabindex) > 0) {
    issues.push({
      element: tagName,
      issue: "Positive tabindex can disrupt natural tab order",
      severity: "warning",
      wcagCriteria: "2.4.3 Focus Order",
      suggestion: 'Use tabindex="0" or restructure DOM order instead',
    });
  }

  return {
    passed: issues.filter((i) => i.severity === "error").length === 0,
    issues,
  };
}

/**
 * Runs accessibility checks on all elements in a container
 * @param container - Container element to check
 * @returns Combined results from all element checks
 */
export function auditContainer(container: HTMLElement): A11yCheckResult {
  const allIssues: A11yIssue[] = [];
  const elements = container.querySelectorAll<HTMLElement>("*");

  elements.forEach((element) => {
    const result = checkElementA11y(element);
    allIssues.push(...result.issues);
  });

  return {
    passed: allIssues.filter((i) => i.severity === "error").length === 0,
    issues: allIssues,
  };
}

// ============================================
// Utility Hooks-ready Functions
// ============================================

/**
 * Generates a unique ID for form elements
 * @param prefix - Optional prefix for the ID
 * @returns Unique ID string
 */
export function generateId(prefix: string = "a11y"): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Checks if reduced motion is preferred
 * @returns Whether reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Checks if high contrast mode is preferred
 * @returns Whether high contrast is preferred
 */
export function prefersHighContrast(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-contrast: high)").matches;
}

/**
 * Gets the user's preferred color scheme
 * @returns "dark", "light", or "no-preference"
 */
export function getColorSchemePreference(): "dark" | "light" | "no-preference" {
  if (typeof window === "undefined") return "no-preference";

  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  if (window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "no-preference";
}
