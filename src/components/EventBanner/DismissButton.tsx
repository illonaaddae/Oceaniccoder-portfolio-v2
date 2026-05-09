import React from "react";
import { FaTimes } from "react-icons/fa";

interface DismissButtonProps {
  onDismiss: () => void;
}

const DismissButton: React.FC<DismissButtonProps> = React.memo(
  ({ onDismiss }) => (
    <button
      onClick={onDismiss}
      className="p-1.5 sm:p-2 hover:bg-white/20 rounded-full transition-colors text-white/80 hover:text-white flex-shrink-0"
      aria-label="Dismiss banner"
    >
      <FaTimes className="text-sm sm:text-base" />
    </button>
  ),
);

DismissButton.displayName = "DismissButton";

export default DismissButton;
