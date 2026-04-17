import React from "react";
import { FaQuoteLeft } from "react-icons/fa";
import type { Testimonial } from "../../types";
import StarRating from "./StarRating";
import AuthorInfo from "./AuthorInfo";

interface TestimonialCardProps {
  testimonial: Testimonial;
  isAnimating: boolean;
}

const TestimonialCard: React.FC<TestimonialCardProps> = React.memo(
  ({ testimonial, isAnimating }) => (
    <div
      className={`glass-card border border-[var(--glass-border)] rounded-3xl p-8 md:p-12 transition-all duration-500 relative overflow-visible ${
        isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
      }`}
    >
      {/* Quote Icon */}
      <div className="absolute -top-6 left-6 md:left-8">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-oceanic-500 to-oceanic-900 shadow-lg shadow-oceanic-500/30 flex items-center justify-center">
          <FaQuoteLeft className="text-white text-lg md:text-xl" />
        </div>
      </div>

      <div className="pt-4 md:pt-6">
        {/* Rating */}
        <div className="mb-6">
          <StarRating rating={testimonial.rating} />
        </div>

        {/* Testimonial Content */}
        <blockquote className="text-lg md:text-xl text-[var(--text-secondary)] leading-relaxed mb-8 italic">
          &ldquo;{testimonial.content}&rdquo;
        </blockquote>

        {/* Author Info */}
        <AuthorInfo testimonial={testimonial} />
      </div>
    </div>
  ),
);

TestimonialCard.displayName = "TestimonialCard";

export default TestimonialCard;
