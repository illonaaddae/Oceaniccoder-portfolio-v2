import React from "react";
import { FaQuoteRight, FaPlus } from "react-icons/fa";
import type { Testimonial } from "@/types";
import { TestimonialsStats } from "./Testimonials/TestimonialsStats";
import { TestimonialCard } from "./Testimonials/TestimonialCard";

interface TestimonialsTabProps {
  theme: "light" | "dark";
  loading: boolean;
  testimonials: Testimonial[];
  onDelete: (testimonialId: string) => void;
  onEdit?: (testimonial: Testimonial) => void;
  onShowForm?: () => void;
  isReadOnly?: boolean;
}

export const TestimonialsTab: React.FC<TestimonialsTabProps> = ({
  theme,
  loading,
  testimonials,
  onDelete,
  onEdit,
  onShowForm,
  isReadOnly = false,
}) => (
  <div className="space-y-4 sm:space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
      <div>
        <h1
          className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${
            theme === "dark" ? "text-white" : "text-slate-900"
          }`}
        >
          Testimonials
        </h1>
        <p
          className={`text-sm sm:text-base transition-colors duration-300 ${
            theme === "dark" ? "text-slate-200/90" : "text-slate-700/80"
          }`}
        >
          Manage client and colleague testimonials
        </p>
      </div>
      {!isReadOnly && (
        <button
          onClick={onShowForm}
          className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2 rounded-xl font-bold text-sm sm:text-base transition duration-200 border shadow-lg ${
            theme === "dark"
              ? "bg-gradient-to-r from-purple-600 to-pink-600 border-purple-500/50 text-white hover:from-purple-500 hover:to-pink-500 shadow-purple-500/20"
              : "bg-gradient-to-r from-purple-500 to-pink-400 border-purple-400/50 text-white hover:from-purple-600 hover:to-pink-500 shadow-purple-400/30"
          }`}
        >
          <FaPlus className="text-sm" />
          Add Testimonial
        </button>
      )}
    </div>

    <TestimonialsStats testimonials={testimonials} theme={theme} />

    {loading ? (
      <div className="flex items-center justify-center h-48">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ) : testimonials.length === 0 ? (
      <div
        className={`text-center py-12 rounded-2xl border ${
          theme === "dark"
            ? "bg-gray-800/30 border-gray-700/50"
            : "bg-white/30 border-purple-200/30"
        }`}
      >
        <FaQuoteRight
          className={`mx-auto text-4xl mb-4 ${
            theme === "dark" ? "text-gray-600" : "text-gray-400"
          }`}
        />
        <p
          className={`text-lg ${
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          }`}
        >
          No testimonials yet
        </p>
        {!isReadOnly && (
          <button
            onClick={onShowForm}
            className="mt-4 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            Add Your First Testimonial
          </button>
        )}
      </div>
    ) : (
      <div className="grid gap-4">
        {testimonials.map((testimonial) => (
          <TestimonialCard
            key={testimonial.$id}
            testimonial={testimonial}
            theme={theme}
            isReadOnly={isReadOnly}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    )}
  </div>
);
