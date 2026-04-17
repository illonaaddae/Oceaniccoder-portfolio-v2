import React from "react";

interface ShareExperienceButtonProps {
  onClick: () => void;
  className?: string;
}

const ShareExperienceButton: React.FC<ShareExperienceButtonProps> = React.memo(
  ({ onClick, className = "mt-16 text-center" }) => (
    <div className={className}>
      <button
        onClick={onClick}
        type="button"
        className="glass-btn bg-gradient-to-r from-oceanic-600 to-oceanic-900 text-white px-8 py-3 font-medium hover:scale-105 active:scale-95 transition-transform duration-300 rounded-xl shadow-lg shadow-oceanic-500/30 touch-manipulation"
      >
        Share Your Experience
      </button>
    </div>
  ),
);

ShareExperienceButton.displayName = "ShareExperienceButton";

export default ShareExperienceButton;
