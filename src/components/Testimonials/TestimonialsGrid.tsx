import React from "react";
import { FaUser } from "react-icons/fa";
import type { Testimonial } from "../../types";

interface TestimonialsGridProps {
  testimonials: Testimonial[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

const TestimonialsGrid: React.FC<TestimonialsGridProps> = React.memo(
  ({ testimonials, currentIndex, onSelect }) => (
    <div className="hidden lg:grid lg:grid-cols-3 gap-6 mt-16">
      {testimonials.slice(0, 3).map((testimonial, index) => (
        <div
          key={testimonial.$id}
          className={`glass-card border border-[var(--glass-border)] rounded-2xl p-6 transition-all duration-300 hover:border-oceanic-500/50 ${
            index === currentIndex ? "ring-2 ring-oceanic-500/50" : ""
          }`}
          onClick={() => onSelect(index)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onSelect(index)}
        >
          <div className="flex items-center gap-3 mb-4">
            {testimonial.image ? (
              <img
                src={testimonial.image}
                alt={testimonial.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-oceanic-500 to-oceanic-900 flex items-center justify-center">
                <FaUser className="text-white text-sm" />
              </div>
            )}
            <div>
              <h5 className="font-semibold text-[var(--text-primary)] text-sm">
                {testimonial.name}
              </h5>
              <p className="text-xs text-[var(--text-accent)]">
                {testimonial.role}
              </p>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)] line-clamp-3">
            &ldquo;{testimonial.content}&rdquo;
          </p>
        </div>
      ))}
    </div>
  ),
);

TestimonialsGrid.displayName = "TestimonialsGrid";

export default TestimonialsGrid;
