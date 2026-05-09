import React from "react";
import { FaPlus, FaTimes } from "react-icons/fa";

interface BlogTagsInputProps {
  tags: string[];
  tagInput: string;
  setTagInput: (value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  theme: "light" | "dark";
}

export const BlogTagsInput: React.FC<BlogTagsInputProps> = ({
  tags,
  tagInput,
  setTagInput,
  onAddTag,
  onRemoveTag,
  theme,
}) => (
  <div>
    <label
      className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}
    >
      Tags
    </label>
    <div className="flex flex-col sm:flex-row gap-2 mb-3">
      <input
        type="text"
        value={tagInput}
        onChange={(e) => setTagInput(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAddTag();
          }
        }}
        className={`flex-1 min-w-0 px-4 py-2.5 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-oceanic-500 ${
          theme === "dark"
            ? "bg-white/10 border-white/20 text-white placeholder-slate-400"
            : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500"
        }`}
        placeholder="Add a tag and press Enter"
      />
      <button
        type="button"
        onClick={onAddTag}
        title="Add tag"
        aria-label="Add tag"
        className="w-full sm:w-auto px-4 py-2.5 bg-oceanic-500/20 text-oceanic-600 rounded-xl hover:bg-oceanic-500/30 transition-colors font-medium border border-oceanic-500/30 flex items-center justify-center"
      >
        <FaPlus />
      </button>
    </div>
    {tags.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-2 border ${
              theme === "dark"
                ? "bg-oceanic-500/20 text-oceanic-500 border-oceanic-500/30"
                : "bg-oceanic-100 text-oceanic-700 border-oceanic-300"
            }`}
          >
            {tag}
            <button
              type="button"
              onClick={() => onRemoveTag(tag)}
              title={`Remove ${tag}`}
              aria-label={`Remove ${tag}`}
              className="hover:text-red-400 transition-colors"
            >
              <FaTimes className="text-xs" />
            </button>
          </span>
        ))}
      </div>
    )}
  </div>
);
