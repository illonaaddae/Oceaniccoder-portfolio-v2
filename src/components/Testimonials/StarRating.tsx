import React from "react";
import { FaStar } from "react-icons/fa";

interface StarRatingProps {
  rating?: number;
  interactive?: boolean;
  onSelect?: (rating: number) => void;
}

const StarRating: React.FC<StarRatingProps> = React.memo(
  ({ rating = 5, interactive = false, onSelect }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <FaStar
          key={star}
          onClick={() => interactive && onSelect?.(star)}
          className={`w-4 h-4 ${
            star <= rating ? "text-yellow-400" : "text-gray-600"
          } ${
            interactive
              ? "cursor-pointer hover:scale-110 transition-transform"
              : ""
          }`}
        />
      ))}
    </div>
  ),
);

StarRating.displayName = "StarRating";

export default StarRating;
