import React from "react";
import { FaPlus, FaTimes } from "react-icons/fa";
import { getAddButtonClass } from "./constants";

interface TagListInputProps {
  items: string[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (item: string) => void;
  theme: "light" | "dark";
  inputClass: string;
  labelClass: string;
  label: string;
  placeholder: string;
  inputType?: string;
  tagColor: { dark: string; light: string };
  truncateItems?: boolean;
  getRemoveLabel?: (item: string) => string;
}

export const TagListInput: React.FC<TagListInputProps> = ({
  items,
  inputValue,
  onInputChange,
  onAdd,
  onRemove,
  theme,
  inputClass,
  labelClass,
  label,
  placeholder,
  inputType = "text",
  tagColor,
  truncateItems,
  getRemoveLabel = (item) => item,
}) => (
  <div>
    <label className={labelClass}>{label}</label>
    <div className="flex gap-2 mb-2">
      <input
        type={inputType}
        value={inputValue}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), onAdd())}
        className={inputClass}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={onAdd}
        title={`Add ${label.toLowerCase()}`}
        aria-label={`Add ${label.toLowerCase()}`}
        className={getAddButtonClass(theme)}
      >
        <FaPlus />
      </button>
    </div>
    <div className="flex flex-wrap gap-2">
      {items.map((item, idx) => (
        <span
          key={idx}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm${
            truncateItems ? " max-w-xs truncate" : ""
          } ${theme === "dark" ? tagColor.dark : tagColor.light}`}
        >
          {truncateItems && item.length > 30 ? `${item.slice(0, 30)}...` : item}
          <button
            type="button"
            onClick={() => onRemove(item)}
            className={`hover:text-red-400${truncateItems ? " flex-shrink-0" : ""}`}
            title={`Remove ${getRemoveLabel(item)}`}
            aria-label={`Remove ${getRemoveLabel(item)}`}
          >
            <FaTimes className="text-xs" />
          </button>
        </span>
      ))}
    </div>
  </div>
);
