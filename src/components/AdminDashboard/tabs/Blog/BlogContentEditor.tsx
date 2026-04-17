import React from "react";
import { FaImage } from "react-icons/fa";
import { BlogPost } from "@/types";
import { ImageUpload } from "../../ImageUpload";

interface BlogContentEditorProps {
  formData: Partial<BlogPost>;
  setFormData: (data: Partial<BlogPost>) => void;
  theme: "light" | "dark";
  showContentImageUpload: boolean;
  setShowContentImageUpload: (show: boolean) => void;
  insertImageToContent: (url: string) => void;
  contentTextareaRef: React.RefObject<HTMLTextAreaElement>;
}

export const BlogContentEditor: React.FC<BlogContentEditorProps> = ({
  formData,
  setFormData,
  theme,
  showContentImageUpload,
  setShowContentImageUpload,
  insertImageToContent,
  contentTextareaRef,
}) => (
  <div>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
      <label
        className={`block text-sm font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}
      >
        Content *{" "}
        <span className="text-oceanic-500 font-normal">(Markdown supported)</span>
      </label>
      <button
        type="button"
        onClick={() => setShowContentImageUpload(!showContentImageUpload)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          showContentImageUpload
            ? theme === "dark"
              ? "bg-oceanic-500/20 text-oceanic-500 border border-oceanic-500/30"
              : "bg-oceanic-100 text-oceanic-700 border border-oceanic-300"
            : theme === "dark"
              ? "bg-gray-700/80 text-gray-300 hover:bg-gray-600/80 border border-gray-600"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300"
        }`}
      >
        <FaImage className="text-xs" /> Insert Image
      </button>
    </div>

    {showContentImageUpload && (
      <div
        className={`mb-3 p-4 rounded-xl border ${theme === "dark" ? "bg-gray-800/50 border-gray-700" : "bg-slate-50 border-slate-200"}`}
      >
        <p
          className={`text-xs mb-3 ${theme === "dark" ? "text-gray-400" : "text-slate-500"}`}
        >
          Upload an image to insert into your content. The image markdown will
          be added at your cursor position.
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

    <textarea
      ref={contentTextareaRef}
      required
      value={formData.content}
      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
      rows={10}
      className={`w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-oceanic-500 font-mono text-sm ${
        theme === "dark"
          ? "bg-white/10 border-white/20 text-white placeholder-slate-400"
          : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500"
      }`}
      placeholder={`# Your content here...\n\nUse Markdown formatting:\n- **bold** and *italic*\n- ## Headings\n- \`\`\`javascript\ncode blocks\n\`\`\`\n- [links](url)\n- ![alt text](image-url) for images`}
    />
  </div>
);
