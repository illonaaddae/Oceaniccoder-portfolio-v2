import React from "react";
import { createCodeHandler } from "./CodeHandler";

/**
 * Build the component overrides object consumed by ReactMarkdown.
 * The heavy code-block handler lives in CodeHandler.jsx.
 */
export const getMarkdownComponents = (isDark) => ({
  h1: ({ children }) => (
    <h1
      className={`text-3xl font-bold mt-8 mb-4 first:mt-0 ${
        isDark ? "text-white" : "text-gray-900"
      }`}
    >
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2
      className={`text-2xl font-bold mt-8 mb-4 pb-2 border-b ${
        isDark ? "text-white border-white/10" : "text-gray-900 border-gray-200"
      }`}
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3
      className={`text-xl font-bold mt-6 mb-3 ${
        isDark ? "text-white" : "text-gray-900"
      }`}
    >
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p
      className={`leading-relaxed mb-4 ${
        isDark ? "text-gray-300" : "text-gray-700"
      }`}
    >
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul
      className={`list-disc list-inside mb-4 space-y-2 ${
        isDark ? "text-gray-300" : "text-gray-700"
      }`}
    >
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol
      className={`list-decimal list-inside mb-4 space-y-2 ${
        isDark ? "text-gray-300" : "text-gray-700"
      }`}
    >
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className={isDark ? "text-gray-300" : "text-gray-700"}>{children}</li>
  ),
  strong: ({ children }) => (
    <strong
      className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
    >
      {children}
    </strong>
  ),
  em: ({ children }) => (
    <em className={isDark ? "text-emerald-400" : "text-emerald-600"}>
      {children}
    </em>
  ),
  blockquote: ({ children }) => (
    <blockquote
      className={`border-l-4 border-emerald-500 pl-4 italic my-4 ${
        isDark ? "text-gray-400" : "text-gray-600"
      }`}
    >
      {children}
    </blockquote>
  ),
  code: createCodeHandler(isDark),
  pre: ({ children }) => <>{children}</>,
  a: ({ href, children }) => (
    <a
      href={href}
      className={`underline ${
        isDark
          ? "text-oceanic-500 hover:text-oceanic-400"
          : "text-oceanic-600 hover:text-oceanic-700"
      }`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
});
