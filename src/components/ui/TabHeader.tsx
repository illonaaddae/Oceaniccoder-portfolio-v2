import React from "react";
import { FaPlus } from "react-icons/fa";
import {
  getTitleStyles,
  getTextStyles,
  getButtonStyles,
  Theme,
} from "../../utils/themeStyles";

interface TabHeaderProps {
  /** Theme for styling */
  theme: Theme;
  /** Main title */
  title: string;
  /** Subtitle/description */
  subtitle: string;
  /** Optional add button */
  onAdd?: () => void;
  /** Label for add button */
  addLabel?: string;
  /** Custom action button instead of default add */
  customAction?: React.ReactNode;
}

/**
 * Reusable header component for admin dashboard tabs
 */
export const TabHeader: React.FC<TabHeaderProps> = ({
  theme,
  title,
  subtitle,
  onAdd,
  addLabel = "Add New",
  customAction,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
    <div>
      <h1 className={getTitleStyles(theme, "lg")}>{title}</h1>
      <p
        className={`text-sm sm:text-base ${getTextStyles(theme, "secondary")}`}
      >
        {subtitle}
      </p>
    </div>
    {customAction ? (
      customAction
    ) : onAdd ? (
      <button onClick={onAdd} className={getButtonStyles(theme, "primary")}>
        <FaPlus className="text-sm" />
        <span className="hidden sm:inline">{addLabel}</span>
        <span className="sm:hidden">Add</span>
      </button>
    ) : null}
  </div>
);

export default TabHeader;
