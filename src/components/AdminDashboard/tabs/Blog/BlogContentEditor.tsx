import React, { useCallback, useState } from "react";
import { FaImage, FaPen, FaEye } from "react-icons/fa";
import { BlogPost } from "@/types";
import { ImageUpload } from "../../ImageUpload";
import { MarkdownRenderer } from "@/components/BlogPost/MarkdownRenderer";
import { MarkdownToolbar } from "./MarkdownToolbar";
import { applyMarkdown, isOnListLine, ToolbarAction, TOOLBAR_SHORTCUTS } from "./markdownActions";

interface BlogContentEditorProps {
  formData: Partial<BlogPost>;
  setFormData: (data: Partial<BlogPost>) => void;
  theme: "light" | "dark";
  showContentImageUpload: boolean;
  setShowContentImageUpload: (show: boolean) => void;
  insertImageToContent: (url: string) => void;
  contentTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export const BlogContentEditor: React.FC<BlogContentEditorProps> = ({
  formData,
  setFormData,
  theme,
  showContentImageUpload,
  setShowContentImageUpload,
  insertImageToContent,
  contentTextareaRef,
}) => {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const isDark = theme === "dark";
  const content = formData.content || "";

  const runAction = useCallback(
    (action: ToolbarAction) => {
      const textarea = contentTextareaRef.current;
      if (!textarea) return;

      const next = applyMarkdown(action, {
        value: textarea.value,
        selectionStart: textarea.selectionStart,
        selectionEnd: textarea.selectionEnd,
      });

      setFormData({ ...formData, content: next.value });
      // React re-renders from state, so the caret has to be restored after
      // that paint or the browser drops it to the end of the field.
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(next.selectionStart, next.selectionEnd);
      });
    },
    [contentTextareaRef, formData, setFormData],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab nests list items — but only on a list line. Anywhere else it keeps
    // its normal job of moving focus, so the editor is never a keyboard trap.
    if (e.key === "Tab" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const el = e.currentTarget;
      if (!isOnListLine(el.value, el.selectionStart)) return;
      e.preventDefault();
      runAction(e.shiftKey ? "outdent" : "indent");
      return;
    }

    if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
    const action = TOOLBAR_SHORTCUTS[e.key.toLowerCase()];
    if (!action) return;
    e.preventDefault();
    runAction(action);
  };

  const tabClass = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
      active
        ? isDark
          ? "bg-oceanic-500/20 text-oceanic-400 border border-oceanic-500/30"
          : "bg-oceanic-100 text-oceanic-700 border border-oceanic-300"
        : isDark
          ? "text-gray-400 hover:text-gray-200 border border-transparent"
          : "text-slate-500 hover:text-slate-700 border border-transparent"
    }`;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <label
          className={`block text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}
        >
          Content *{" "}
          <span className="text-brand-link dark:text-oceanic-400 font-normal">(Markdown)</span>
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode("write")}
            className={tabClass(mode === "write")}
          >
            <FaPen className="text-xs" /> Write
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={tabClass(mode === "preview")}
          >
            <FaEye className="text-xs" /> Preview
          </button>
          <button
            type="button"
            onClick={() => setShowContentImageUpload(!showContentImageUpload)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ml-1 ${
              showContentImageUpload
                ? isDark
                  ? "bg-oceanic-500/20 text-oceanic-500 border border-oceanic-500/30"
                  : "bg-oceanic-100 text-oceanic-700 border border-oceanic-300"
                : isDark
                  ? "bg-gray-700/80 text-gray-300 hover:bg-gray-600/80 border border-gray-600"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300"
            }`}
          >
            <FaImage className="text-xs" /> Insert Image
          </button>
        </div>
      </div>

      {showContentImageUpload && (
        <div
          className={`mb-3 p-4 rounded-xl border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-slate-50 border-slate-200"}`}
        >
          <p className={`text-xs mb-3 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            Upload an image to insert into your content. The image markdown will be added at your
            cursor position.
          </p>
          <ImageUpload
            value=""
            onChange={(url) => {
              if (url) insertImageToContent(url);
            }}
            label=""
            theme={theme}
          />
        </div>
      )}

      {mode === "write" ? (
        <>
          <MarkdownToolbar onAction={runAction} theme={theme} />
          <textarea
            ref={contentTextareaRef}
            required
            value={content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            onKeyDown={handleKeyDown}
            rows={16}
            className={`w-full px-4 py-3 rounded-b-xl border transition-all focus:outline-none focus:ring-2 focus:ring-oceanic-500 font-mono text-sm ${
              isDark
                ? "bg-white/10 border-white/20 text-white placeholder-slate-400"
                : "bg-white/50 border-oceanic-200/50 text-slate-900 placeholder-slate-500"
            }`}
            placeholder={"Start writing. Select text and use the buttons above to format it."}
          />
        </>
      ) : (
        <div
          className={`rounded-xl border overflow-auto max-h-[32rem] ${
            isDark ? "bg-gray-900/40 border-white/20" : "bg-white border-oceanic-200/50"
          }`}
        >
          {content.trim() ? (
            // The public post page renders through this exact component, so
            // what shows here is what readers get — not an approximation.
            <MarkdownRenderer content={content} isDark={isDark} />
          ) : (
            <p className={`p-8 text-sm text-center ${isDark ? "text-gray-500" : "text-slate-400"}`}>
              Nothing to preview yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
