import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

interface CarouselNavigationProps {
  onPrev: () => void;
  onNext: () => void;
}

const CarouselNavigation: React.FC<CarouselNavigationProps> = React.memo(
  ({ onPrev, onNext }) => (
    <>
      <button
        onClick={onPrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 p-3 rounded-full glass-card border border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-oceanic-500/20 hover:border-oceanic-500/50 transition-all"
        aria-label="Previous testimonial"
      >
        <FaChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={onNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 p-3 rounded-full glass-card border border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-oceanic-500/20 hover:border-oceanic-500/50 transition-all"
        aria-label="Next testimonial"
      >
        <FaChevronRight className="w-5 h-5" />
      </button>
    </>
  ),
);

CarouselNavigation.displayName = "CarouselNavigation";

export default CarouselNavigation;
