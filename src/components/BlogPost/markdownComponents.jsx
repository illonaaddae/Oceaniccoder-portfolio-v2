import React from "react";
import { createCodeHandler } from "./CodeHandler";

/**
 * Build the component overrides object consumed by ReactMarkdown.
 * The heavy code-block handler lives in CodeHandler.jsx.
 */
/** A checklist has no bullet — the checkbox is the marker. */
const TASK_LIST = "list-none ps-0 mb-4 space-y-2 [&_li>p]:mb-0 [&_li>p]:leading-relaxed";
const TASK_ITEM = "flex items-start gap-2.5";

/** remark-gfm marks task lists with `contains-task-list` / `task-list-item`. */
const isTaskList = (className) => Boolean(className && className.includes("task-list"));

export const getMarkdownComponents = (isDark) => {
  const listText = isDark ? "text-gray-200" : "text-gray-700";

  return {
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
      <h3 className={`text-xl font-bold mt-6 mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className={`leading-relaxed mb-4 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
        {children}
      </p>
    ),
    /*
     * Lists.
     *
     * Two things were broken here, and both only showed up on "loose" lists —
     * the kind you get when you bullet several existing paragraphs, because a
     * blank line between items makes remark wrap each item's content in a <p>.
     *
     *   1. `list-inside` puts the marker inside the item's content box. With a
     *      block <p> as the first child, the marker took the first line and the
     *      text dropped to the next one. `list-outside` with padding keeps the
     *      marker in the gutter, and wrapped lines line up under the text
     *      instead of running back under the bullet.
     *   2. The paragraph's own `mb-4` then added a gap after every item. Inside
     *      a list item that margin is cancelled, so loose and tight lists render
     *      identically.
     *
     * Nested levels step disc -> circle -> square so depth is readable, and
     * `marker:` tints the bullets to the accent rather than leaving them the
     * colour of the text.
     */
    ul: ({ children, className }) =>
      isTaskList(className) ? (
        <ul className={`${TASK_LIST} ${listText}`}>{children}</ul>
      ) : (
        <ul
          className={`list-disc list-outside ps-6 mb-4 space-y-2 marker:text-oceanic-500 [&_ul]:list-[circle] [&_ul_ul]:list-[square] [&_li>p]:mb-0 [&_li>p]:leading-relaxed [&_ul]:mt-2 [&_ol]:mt-2 [&_ul]:mb-0 [&_ol]:mb-0 ${listText}`}
        >
          {children}
        </ul>
      ),
    ol: ({ children }) => (
      <ol
        className={`list-decimal list-outside ps-6 mb-4 space-y-2 marker:font-semibold marker:text-oceanic-500 [&_ol]:list-[lower-alpha] [&_ol_ol]:list-[lower-roman] [&_li>p]:mb-0 [&_li>p]:leading-relaxed [&_ul]:mt-2 [&_ol]:mt-2 [&_ul]:mb-0 [&_ol]:mb-0 ${listText}`}
      >
        {children}
      </ol>
    ),
    li: ({ children, className }) =>
      isTaskList(className) ? (
        <li className={`${TASK_ITEM} ${listText}`}>{children}</li>
      ) : (
        <li className={listText}>{children}</li>
      ),
    /*
     * Task-list checkboxes (`- [ ]` / `- [x]`, via remark-gfm).
     *
     * ReactMarkdown emits a disabled <input type="checkbox">, which browsers
     * render in their own default style and which sits on the text baseline. It
     * is restyled as a static marker and pulled up to the cap height so it reads
     * as part of the line rather than sinking below it.
     */
    input: ({ type, checked }) =>
      type === "checkbox" ? (
        <span
          aria-hidden="true"
          // Sized in rem, not em: `text-` on this same element would change the
          // em basis that `w-`/`h-` resolve against, and the box came out at
          // roughly two-thirds the intended size.
          className={`mt-[0.2rem] w-[1.15rem] h-[1.15rem] shrink-0 rounded-[0.35rem] border flex items-center justify-center text-[0.7rem] leading-none font-bold ${
            checked
              ? "bg-oceanic-500 border-oceanic-500 text-white"
              : isDark
                ? "border-gray-500 bg-transparent"
                : "border-gray-400 bg-transparent"
          }`}
        >
          {checked ? "✓" : ""}
        </span>
      ) : null,
    strong: ({ children }) => (
      <strong className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em className={isDark ? "text-oceanic-400" : "text-oceanic-600"}>{children}</em>
    ),
    blockquote: ({ children }) => (
      <blockquote
        className={`border-l-4 border-oceanic-500 pl-4 italic my-4 ${
          isDark ? "text-gray-200" : "text-gray-600"
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
  };
};
