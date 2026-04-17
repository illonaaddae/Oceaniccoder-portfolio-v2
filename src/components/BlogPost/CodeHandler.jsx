import React from "react";
import { CodeBlock } from "./CodeBlock";

/**
 * Auto-detect language from code content when no explicit language tag is set.
 */
const detectLanguage = (code) => {
  if (
    code.includes("import ") ||
    code.includes("export ") ||
    code.includes("const ") ||
    code.includes("function ")
  ) {
    return "javascript";
  }
  if (
    code.includes("def ") ||
    code.includes("print(") ||
    code.includes("import ")
  ) {
    return "python";
  }
  if (code.includes("<html") || code.includes("<div") || code.includes("</")) {
    return "html";
  }
  if (code.includes("{") && code.includes(":") && code.includes(";")) {
    return "css";
  }
  return "";
};

/**
 * ReactMarkdown `code` override — renders fenced blocks via CodeBlock
 * and inline code with themed styling.
 */
export const createCodeHandler = (isDark) =>
  function CodeHandler(props) {
    const { children, className, node: _node, ...rest } = props;
    const isInline = !className && !String(children).includes("\n");
    const match = /language-(\w+)/.exec(className || "");
    let language = match ? match[1] : "";

    if (!language && !isInline) {
      language = detectLanguage(String(children));
    }

    return !isInline ? (
      <CodeBlock language={language} isDark={isDark}>
        {children}
      </CodeBlock>
    ) : (
      <code
        className={`px-2 py-0.5 rounded text-sm font-mono ${
          isDark
            ? "bg-white/10 text-emerald-400"
            : "bg-gray-100 text-emerald-600"
        }`}
        {...rest}
      >
        {children}
      </code>
    );
  };
