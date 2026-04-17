import React, { useState } from "react";
import { FaCopy, FaCheck } from "react-icons/fa";
import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism-light";
import oneDark from "react-syntax-highlighter/dist/esm/styles/prism/one-dark";
import oneLight from "react-syntax-highlighter/dist/esm/styles/prism/one-light";

// ─── Language registry ───────────────────────────────────────────────────────
// Only import the languages actually needed for a developer portfolio blog.
// This keeps the syntax-highlighter chunk ~15-30 kB instead of ~650 kB.
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import scss from "react-syntax-highlighter/dist/esm/languages/prism/scss";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup"; // HTML & XML
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import rust from "react-syntax-highlighter/dist/esm/languages/prism/rust";
import go from "react-syntax-highlighter/dist/esm/languages/prism/go";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import csharp from "react-syntax-highlighter/dist/esm/languages/prism/csharp";
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp";
import docker from "react-syntax-highlighter/dist/esm/languages/prism/docker";
import graphql from "react-syntax-highlighter/dist/esm/languages/prism/graphql";

// Primary registrations
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("jsx", jsx);
SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("scss", scss);
SyntaxHighlighter.registerLanguage("markup", markup);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("yaml", yaml);
SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("rust", rust);
SyntaxHighlighter.registerLanguage("go", go);
SyntaxHighlighter.registerLanguage("java", java);
SyntaxHighlighter.registerLanguage("csharp", csharp);
SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("docker", docker);
SyntaxHighlighter.registerLanguage("graphql", graphql);

// Aliases — map common fence identifiers to registered languages
SyntaxHighlighter.registerLanguage("js", javascript);
SyntaxHighlighter.registerLanguage("ts", typescript);
SyntaxHighlighter.registerLanguage("sh", bash);
SyntaxHighlighter.registerLanguage("shell", bash);
SyntaxHighlighter.registerLanguage("zsh", bash);
SyntaxHighlighter.registerLanguage("html", markup);
SyntaxHighlighter.registerLanguage("xml", markup);
SyntaxHighlighter.registerLanguage("py", python);
SyntaxHighlighter.registerLanguage("yml", yaml);
SyntaxHighlighter.registerLanguage("md", markdown);
SyntaxHighlighter.registerLanguage("rs", rust);
SyntaxHighlighter.registerLanguage("golang", go);
SyntaxHighlighter.registerLanguage("cs", csharp);
SyntaxHighlighter.registerLanguage("c++", cpp);
SyntaxHighlighter.registerLanguage("dockerfile", docker);
SyntaxHighlighter.registerLanguage("gql", graphql);
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fenced code block with language badge and copy-to-clipboard button.
 * Uses PrismLight so only registered languages are bundled.
 */
const CodeBlock = React.memo(({ language, children, isDark }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(children).replace(/\n$/, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="relative group my-6">
      {language && (
        <div
          className={`absolute top-0 left-4 -translate-y-1/2 px-3 py-1 text-xs font-medium rounded-full border ${
            isDark
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              : "bg-emerald-100 text-emerald-700 border-emerald-300"
          }`}
        >
          {language}
        </div>
      )}

      <button
        onClick={handleCopy}
        className={`absolute top-3 right-3 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
          isDark
            ? "bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white"
            : "bg-black/5 hover:bg-black/10 text-gray-500 hover:text-gray-800"
        }`}
        title="Copy code"
      >
        {copied ? (
          <FaCheck className="text-emerald-500" />
        ) : (
          <FaCopy className="text-sm" />
        )}
      </button>

      <SyntaxHighlighter
        style={isDark ? oneDark : oneLight}
        language={language || "text"}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: "0.75rem",
          padding: "1.5rem 1rem",
          paddingTop: language ? "2rem" : "1.5rem",
          fontSize: "0.875rem",
          background: isDark ? "rgba(0, 0, 0, 0.4)" : "rgba(249, 250, 251, 1)",
          border: isDark
            ? "1px solid rgba(255, 255, 255, 0.1)"
            : "1px solid rgba(0, 0, 0, 0.1)",
        }}
        codeTagProps={{
          style: {
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
          },
        }}
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    </div>
  );
});

CodeBlock.displayName = "CodeBlock";
export { CodeBlock };
