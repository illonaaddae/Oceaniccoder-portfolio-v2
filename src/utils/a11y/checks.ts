/**
 * Accessibility Checks
 * @module utils/a11y/checks
 */

import type { A11yCheckResult, A11yIssue } from "./types";

/**
 * Checks an element for common accessibility issues
 */
export function checkElementA11y(element: HTMLElement): A11yCheckResult {
  const issues: A11yIssue[] = [];
  const tagName = element.tagName.toLowerCase();

  if (tagName === "img") {
    if (element.getAttribute("alt") === null) {
      issues.push({
        element: tagName,
        issue: "Image missing alt attribute",
        severity: "error",
        wcagCriteria: "1.1.1 Non-text Content",
        suggestion: 'Add alt text or alt="" for decorative images',
      });
    }
  }

  if (tagName === "button") {
    const hasName =
      element.textContent?.trim() ||
      element.getAttribute("aria-label") ||
      element.getAttribute("aria-labelledby");
    if (!hasName) {
      issues.push({
        element: tagName,
        issue: "Button has no accessible name",
        severity: "error",
        wcagCriteria: "4.1.2 Name, Role, Value",
        suggestion: "Add text content, aria-label, or aria-labelledby",
      });
    }
  }

  if (tagName === "a") {
    const hasName =
      element.textContent?.trim() || element.getAttribute("aria-label");
    if (!hasName) {
      issues.push({
        element: tagName,
        issue: "Link has no accessible name",
        severity: "error",
        wcagCriteria: "2.4.4 Link Purpose",
        suggestion: "Add descriptive text content or aria-label",
      });
    }
    const href = element.getAttribute("href");
    if (href === "#" || href === "javascript:void(0)") {
      issues.push({
        element: tagName,
        issue: "Link has non-functional href",
        severity: "warning",
        suggestion: "Use a button for actions, or provide a valid href",
      });
    }
  }

  if (["input", "select", "textarea"].includes(tagName)) {
    const id = element.getAttribute("id");
    const hasLabel =
      (id && document.querySelector(`label[for="${id}"]`)) ||
      element.getAttribute("aria-label") ||
      element.getAttribute("aria-labelledby");
    if (!hasLabel) {
      issues.push({
        element: tagName,
        issue: "Form input has no associated label",
        severity: "error",
        wcagCriteria: "1.3.1 Info and Relationships",
        suggestion: "Add a label element with for attribute, or use aria-label",
      });
    }
  }

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
