import React from "react";
import { FaStar } from "react-icons/fa";

interface StarRatingProps {
  rating?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({ rating = 5 }) => (
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
