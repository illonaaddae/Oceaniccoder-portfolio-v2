import React from "react";
import { FaQuoteRight, FaStar } from "react-icons/fa";
import type { Testimonial } from "@/types";

interface TestimonialsStatsProps {
  testimonials: Testimonial[];
  theme: "light" | "dark";
}

const cardClass = (_theme: "light" | "dark") => "glass-card card-hover p-4 sm:p-6";

export const TestimonialsStats: React.FC<TestimonialsStatsProps> = ({ testimonials, theme }) => {
  const avgRating =
    testimonials.length > 0
      ? (testimonials.reduce((acc, t) => acc + (t.rating || 5), 0) / testimonials.length).toFixed(1)
      : "0";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
      {/* Total Testimonials */}
      <div className={cardClass(theme)}>
        <div className="flex items-start justify-between">
          <div>
            <p
              className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                theme === "dark" ? "text-slate-100/95" : "text-slate-700/80"
              }`}
            >
              Total Testimonials
            </p>
            <p
              className={`text-4xl font-bold mt-2 transition-colors duration-300 ${
                theme === "dark" ? "text-white/98" : "text-slate-900"
              }`}
            >
              {testimonials.length}
            </p>
          </div>
          <div className="p-3 rounded-xl backdrop-blur-md bg-gradient-to-br from-oceanic-500 to-oceanic-700 shadow-lg">
            <FaQuoteRight className="text-white text-xl font-bold" />
          </div>
        </div>
      </div>

      {/* Featured */}
      <div className={cardClass(theme)}>
        <div className="flex items-start justify-between">
          <div>
            <p
              className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                theme === "dark" ? "text-gray-400" : "text-slate-700/80"
              }`}
            >
              Featured
            </p>
            <p
              className={`text-4xl font-bold mt-2 transition-colors duration-300 ${
                theme === "dark" ? "text-white" : "text-slate-900"
              }`}
            >
              {testimonials.filter((t) => t.featured).length}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-br from-oceanic-500 to-oceanic-700 shadow-lg">
            <FaStar className="text-white text-xl font-bold" />
          </div>
        </div>
      </div>

      {/* Avg Rating */}
      <div className={cardClass(theme)}>
        <div className="flex items-start justify-between">
          <div>
            <p
              className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                theme === "dark" ? "text-gray-400" : "text-slate-700/80"
              }`}
            >
              Avg Rating
            </p>
            <p
              className={`text-4xl font-bold mt-2 transition-colors duration-300 ${
                theme === "dark" ? "text-white" : "text-slate-900"
              }`}
            >
              {avgRating}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-br from-oceanic-400 to-oceanic-600 shadow-lg">
            <FaStar className="text-white text-xl font-bold" />
          </div>
        </div>
      </div>
    </div>
  );
};
