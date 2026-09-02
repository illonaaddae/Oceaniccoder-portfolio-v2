import React from "react";
import { createCodeHandler } from "./CodeHandler";
import { isExternalHref, prettyUrlLabel, resolveHref } from "../../utils/linkHref";

/**
 * Build the component overrides object consumed by ReactMarkdown.
 * The heavy code-block handler lives in CodeHandler.jsx.
 */
/*
 * Checklists.
 *
 * The item is laid out with a hanging indent rather than as a flex row, and
 * that is deliberate. On a "loose" checklist — blank lines between items —
 * remark wraps the item's content in a <p> and puts the checkbox *inside* it,
 * so a flex row on the <li> never sees the box as a child to lay out. The
 * indent works from inside the paragraph as well as without it, so loose and
 * tight checklists render identically.
 *
 * `-indent` pulls the first line back by the width of the box plus its gap, and
 * the matching padding puts it back, so wrapped lines sit under the text
 * instead of under the box.
 */
const TASK_GUTTER = "ps-[1.75rem] -indent-[1.75rem]";
const TASK_LIST = `list-none ps-0 mb-4 space-y-2 [&_li>p]:mb-0 [&_li>p]:leading-relaxed`;
const TASK_ITEM = TASK_GUTTER;

/** remark-gfm marks task lists with `contains-task-list` / `task-list-item`. */
const isTaskList = (className) => Boolean(className && className.includes("task-list"));

/** Flatten a ReactMarkdown child tree to the plain text a reader would see. */
const childrenToText = (children) =>
  React.Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      return child?.props?.children ? childrenToText(child.props.children) : "";
    })
    .join("");

/** True when the label carries no markup, so it is safe to rewrite as a string. */
const isPlainText = (children) =>
  React.Children.toArray(children).every(
    (child) => typeof child === "string" || typeof child === "number",
  );

/**
 * The arrow that tells a reader the link leaves the site.
 *
 * `whitespace-nowrap` on the wrapper keeps the arrow on the same line as the
 * last word instead of stranding it at the start of the next one.
 */
const ExternalLinkIcon = () => (
  <span className="whitespace-nowrap">
    &#8203;
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block w-[0.7em] h-[0.7em] ms-1 mb-[0.15em] opacity-70"
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  </span>
);

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
          // `inline-flex`, never `flex`: a block-level box inside the item's
          // paragraph took a line of its own and left every checkbox stranded
          // above its text. `align-[-0.2em]` seats it on the text baseline.
          className={`w-[1.15rem] h-[1.15rem] me-[0.6rem] shrink-0 rounded-[0.35rem] border inline-flex items-center justify-center align-[-0.2em] indent-0 text-[0.7rem] leading-none font-bold ${
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
    /*
     * Links.
     *
     * Two things go wrong on the way from the editor to here, and both end the
     * same way — the browser reads the href as a same-site path, the SPA router
     * picks it up and the reader gets "Page not found" instead of the article
     * that was linked:
     *
     *   1. `[https://example.com](url)` — the URL was pasted over the *text*
     *      and the toolbar's `url` placeholder stayed in the href.
     *   2. `[Example](example.com)` — a bare domain has no scheme, so it is a
     *      relative path too.
     *
     * `resolveHref` repairs both, which matters for posts that are already
     * published: they render correctly without being re-edited. When nothing
     * usable is left the text renders unlinked rather than as a dead link.
     */
    a: ({ href, children }) => {
      const text = childrenToText(children);
      const resolved = resolveHref(href, text);

      if (!resolved) return <>{children}</>;

      const external = isExternalHref(resolved);
      // A pasted URL as its own label is common; the scheme and `www.` are
      // noise, and an unshortened one runs off the edge of a phone.
      const label = isPlainText(children) ? prettyUrlLabel(text) : children;

      return (
        <a
          href={resolved}
          className={`font-medium break-words underline decoration-2 underline-offset-[3px] transition-colors ${
            isDark
              ? "text-oceanic-400 decoration-oceanic-400/40 hover:text-oceanic-300 hover:decoration-oceanic-300"
              : "text-oceanic-600 decoration-oceanic-500/40 hover:text-oceanic-700 hover:decoration-oceanic-600"
          }`}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {label}
          {external && <ExternalLinkIcon />}
        </a>
      );
    },
  };
};
