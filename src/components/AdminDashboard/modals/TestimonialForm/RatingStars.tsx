import React from "react";
import { FaStar } from "react-icons/fa";

interface RatingStarsProps {
  rating: number;
  onChange: (r: number) => void;
  theme: "light" | "dark";
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  onChange,
  theme,
}) => {
  return (
    <div className="flex gap-2 mt-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="focus:outline-none transition-transform hover:scale-110"
          aria-label={`Rate ${star} stars`}
        >
          <FaStar
            className={`w-8 h-8 ${
              star <= rating
                ? "text-yellow-400"
                : theme === "dark"
                ? "text-gray-600"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
};
