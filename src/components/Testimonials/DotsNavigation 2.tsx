import React from "react";

interface DotsNavigationProps {
  total: number;
  currentIndex: number;
  onSelect: (index: number) => void;
}

const DotsNavigation: React.FC<DotsNavigationProps> = React.memo(
  ({ total, currentIndex, onSelect }) => (
    <div className="flex justify-center gap-2 mt-8">
      {Array.from({ length: total }, (_, index) => (
        <button
          key={index}
          onClick={() => onSelect(index)}
          className={`w-3 h-3 rounded-full transition-all duration-300 ${
            index === currentIndex
              ? "bg-gradient-to-r from-oceanic-500 to-oceanic-900 w-8"
              : "bg-[var(--glass-border)] hover:bg-oceanic-500/50"
          }`}
          aria-label={`Go to testimonial ${index + 1}`}
        />
      ))}
    </div>
  ),
);

DotsNavigation.displayName = "DotsNavigation";

export default DotsNavigation;
