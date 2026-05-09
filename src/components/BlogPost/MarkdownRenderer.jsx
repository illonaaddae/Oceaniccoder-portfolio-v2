import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getMarkdownComponents } from "./markdownComponents";
import { normalizeContent } from "./utils";

/**
 * Renders the post body inside a glass card using ReactMarkdown.
 */
const MarkdownRenderer = React.memo(({ content, isDark }) => {
  const components = useMemo(() => getMarkdownComponents(isDark), [isDark]);

  return (
    <article
      className={`prose prose-lg max-w-none mb-16 ${
        isDark ? "prose-invert" : ""
      }`}
    >
      <div
        className={`p-6 md:p-10 rounded-2xl ${
          isDark ? "glass-card" : "bg-white shadow-lg border border-gray-200"
        }`}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {normalizeContent(content)}
        </ReactMarkdown>
      </div>
    </article>
  );
});

MarkdownRenderer.displayName = "MarkdownRenderer";
export { MarkdownRenderer };
