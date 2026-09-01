import * as React from "react";

/**
 * Type surface for the JS component in MarkdownRenderer.jsx, so TypeScript
 * callers (the admin content editor's Preview tab) get checked props.
 */
export interface MarkdownRendererProps {
  content: string;
  isDark: boolean;
}

export const MarkdownRenderer: React.NamedExoticComponent<MarkdownRendererProps>;
