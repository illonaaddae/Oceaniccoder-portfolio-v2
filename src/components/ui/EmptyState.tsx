import React from "react";
import { IconType } from "react-icons";
import {
  getCardStyles,
  getIconColor,
  getTextStyles,
  Theme,
} from "../../utils/themeStyles";

interface EmptyStateProps {
  /** Theme for styling */
  theme: Theme;
  /** Icon to display */
  icon: IconType;
  /** Message to display */
  message: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Reusable empty state component for lists with no items
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  theme,
  icon: Icon,
  message,
  action,
}) => (
  <div className={`${getCardStyles(theme, "empty")} p-12 text-center`}>
    <Icon className={`text-4xl mx-auto mb-4 ${getIconColor(theme, "muted")}`} />
    <p className={getTextStyles(theme, "muted")}>{message}</p>
    {action && (
      <button
        onClick={action.onClick}
        className="mt-4 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-medium hover:scale-105 transition-transform"
      >
        {action.label}
      </button>
    )}
  </div>
);

export default EmptyState;
