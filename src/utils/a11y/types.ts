/**
 * A11y Types
 * @module utils/a11y/types
 */

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
