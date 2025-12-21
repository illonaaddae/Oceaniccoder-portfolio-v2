import React from "react";
import {
  FaQuoteRight,
  FaPlus,
  FaEdit,
  FaTrash,
  FaStar,
  FaUser,
} from "react-icons/fa";
import type { Testimonial } from "@/types";

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
}) => {
  const renderStars = (rating: number = 5) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <FaStar
            key={star}
            className={`w-3 h-3 ${
              star <= rating ? "text-yellow-400" : "text-gray-500"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        <div
          className={`glass-card border rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all duration-200 ${
            theme === "dark"
              ? "bg-gray-800/50 border-gray-700/80 hover:border-gray-600"
              : "bg-gradient-to-br from-white/40 to-white/20 border-purple-200/40 hover:border-purple-200/60"
          }`}
        >
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
            <div className="p-3 rounded-xl backdrop-blur-md bg-gradient-to-br from-purple-600 to-pink-500 shadow-lg">
              <FaQuoteRight className="text-white text-xl font-bold" />
            </div>
          </div>
        </div>

        <div
          className={`glass-card border rounded-2xl p-6 transition-all duration-200 ${
            theme === "dark"
              ? "bg-gray-800/50 border-gray-700/80 hover:border-gray-600"
              : "bg-gradient-to-br from-white/40 to-white/20 border-purple-200/40 hover:border-purple-200/60"
          }`}
        >
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
            <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg">
              <FaStar className="text-white text-xl font-bold" />
            </div>
          </div>
        </div>

        <div
          className={`glass-card border rounded-2xl p-6 transition-all duration-200 ${
            theme === "dark"
              ? "bg-gray-800/50 border-gray-700/80 hover:border-gray-600"
              : "bg-gradient-to-br from-white/40 to-white/20 border-purple-200/40 hover:border-purple-200/60"
          }`}
        >
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
                {testimonials.length > 0
                  ? (
                      testimonials.reduce(
                        (acc, t) => acc + (t.rating || 5),
                        0
                      ) / testimonials.length
                    ).toFixed(1)
                  : "0"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg">
              <FaStar className="text-white text-xl font-bold" />
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials List */}
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
            <div
              key={testimonial.$id}
              className={`glass-card border rounded-xl p-4 sm:p-6 transition-all duration-200 ${
                theme === "dark"
                  ? "bg-gray-800/50 border-gray-700/80 hover:border-purple-500/50"
                  : "bg-white/50 border-purple-200/40 hover:border-purple-300/60"
              }`}
            >
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {testimonial.image ? (
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-purple-500/50"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
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
                          <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-500 rounded-full">
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
                      {renderStars(testimonial.rating)}
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
                            ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                            : "bg-purple-100 text-purple-700 hover:bg-purple-200"
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
          ))}
        </div>
      )}
    </div>
  );
};
