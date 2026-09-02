import React from "react";
import {
  FaBold,
  FaItalic,
  FaStrikethrough,
  FaCode,
  FaHeading,
  FaQuoteLeft,
  FaListUl,
  FaListOl,
  FaLink,
  FaFileCode,
  FaCheckSquare,
  FaIndent,
  FaOutdent,
} from "react-icons/fa";
import { ToolbarAction, TOOLBAR_LABELS } from "./markdownActions";

interface MarkdownToolbarProps {
  onAction: (action: ToolbarAction) => void;
  theme: "light" | "dark";
  disabled?: boolean;
}

/** Groups are separated by a divider so related controls read together. */
const GROUPS: { action: ToolbarAction; icon: React.ReactNode; hint?: string }[][] = [
  [
    { action: "bold", icon: <FaBold />, hint: "⌘B" },
    { action: "italic", icon: <FaItalic />, hint: "⌘I" },
    { action: "strikethrough", icon: <FaStrikethrough /> },
  ],
  [
    { action: "h2", icon: <FaHeading /> },
    { action: "h3", icon: <FaHeading className="text-[0.65rem]" /> },
  ],
  [
    { action: "ul", icon: <FaListUl /> },
    { action: "ol", icon: <FaListOl /> },
    { action: "tasklist", icon: <FaCheckSquare /> },
    { action: "quote", icon: <FaQuoteLeft /> },
  ],
  [
    { action: "outdent", icon: <FaOutdent />, hint: "⇧Tab" },
    { action: "indent", icon: <FaIndent />, hint: "Tab" },
  ],
  [
    { action: "link", icon: <FaLink />, hint: "⌘K" },
    { action: "code", icon: <FaCode /> },
    { action: "codeblock", icon: <FaFileCode /> },
  ],
];

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({
  onAction,
  theme,
  disabled = false,
}) => {
  const isDark = theme === "dark";

  return (
    <div
      className={`flex flex-wrap items-center gap-1 px-2 py-2 rounded-t-xl border border-b-0 ${
        isDark ? "bg-gray-800/60 border-white/20" : "bg-slate-50 border-oceanic-200/50"
      }`}
      role="toolbar"
      aria-label="Formatting"
      aria-disabled={disabled}
    >
      {GROUPS.map((group, groupIndex) => (
        <React.Fragment key={group[0].action}>
          {groupIndex > 0 && (
            <span
              aria-hidden="true"
              className={`w-px h-5 mx-1 ${isDark ? "bg-white/15" : "bg-slate-300"}`}
            />
          )}
          {group.map(({ action, icon, hint }) => (
            <button
              key={action}
              type="button"
              // Buttons inside a form default to type submit; without this,
              // clicking Bold would publish the post.
              disabled={disabled}
              // Keeps focus (and the selection) in the textarea, so the action
              // applies to what is actually selected.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onAction(action)}
              title={hint ? `${TOOLBAR_LABELS[action]} (${hint})` : TOOLBAR_LABELS[action]}
              aria-label={TOOLBAR_LABELS[action]}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isDark
                  ? "text-gray-300 hover:bg-white/10 hover:text-white"
                  : "text-slate-600 hover:bg-oceanic-100 hover:text-oceanic-700"
              }`}
            >
              {icon}
            </button>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};
