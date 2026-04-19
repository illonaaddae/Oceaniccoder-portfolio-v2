import React from "react";
import { FaUser, FaEdit, FaTrash } from "react-icons/fa";
import type { Testimonial } from "@/types";
import { StarRating } from "./StarRating";

interface TestimonialCardProps {
  testimonial: Testimonial;
  theme: "light" | "dark";
  isReadOnly: boolean;
  onEdit?: (t: Testimonial) => void;
  onDelete: (id: string) => void;
}

export const TestimonialCard: React.FC<TestimonialCardProps> = ({
  testimonial,
  theme,
  isReadOnly,
  onEdit,
  onDelete,
}) => (
  <div
    className={`glass-card border rounded-xl p-4 sm:p-6 transition-all duration-200 ${
      theme === "dark"
        ? "bg-gray-800/50 border-gray-700/80 hover:border-oceanic-500/50"
        : "bg-white/50 border-oceanic-200/40 hover:border-oceanic-300/60"
    }`}
  >
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {testimonial.image ? (
          <img
            src={testimonial.image}
            alt={testimonial.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-oceanic-500/50"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-oceanic-500 to-teal-500 flex items-center justify-center">
            <FaUser className="text-white text-xl" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
          <div>
            <h3
              className={`font-bold text-lg ${
                theme === "dark" ? "text-white" : "text-slate-900"
              }`}
            >
              {testimonial.name}
              {testimonial.featured && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-oceanic-500/20 text-oceanic-400 rounded-full">
                  Featured
                </span>
              )}
            </h3>
            <p
              className={`text-sm ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {testimonial.role}
              {testimonial.company && ` at ${testimonial.company}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StarRating rating={testimonial.rating} />
          </div>
        </div>

        <p
          className={`text-sm leading-relaxed mb-4 ${
            theme === "dark" ? "text-gray-300" : "text-gray-700"
          }`}
        >
          "{testimonial.content}"
        </p>

        {/* Actions */}
        {!isReadOnly && (
          <div className="flex gap-2">
            <button
              onClick={() => onEdit?.(testimonial)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                theme === "dark"
                  ? "bg-oceanic-500/20 text-oceanic-300 hover:bg-oceanic-500/30"
                  : "bg-oceanic-100 text-oceanic-700 hover:bg-oceanic-200"
              }`}
            >
              <FaEdit className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to delete this testimonial?"
                  )
                ) {
                  onDelete(testimonial.$id);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                theme === "dark"
                  ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                  : "bg-red-100 text-red-700 hover:bg-red-200"
              }`}
            >
              <FaTrash className="w-3 h-3" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);
