import React from "react";
import { FaMapMarkerAlt } from "react-icons/fa";

import type { Journey } from "../../types";

interface JourneyItemProps {
  item: Journey;
  index: number;
  isLast: boolean;
}

const JourneyItem = React.memo(({ item, isLast }: JourneyItemProps) => (
  <div className="relative journey-item">
    <div className="flex flex-row flex-wrap gap-6 items-start">
      {/* Timeline column */}
      <div className="w-8 sm:w-12 flex-shrink-0 relative flex items-start justify-center self-stretch">
        <div
          className={`absolute left-1/2 -translate-x-1/2 top-5 w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r ${item.color} rounded-full shadow-lg z-20 journey-dot`}
        />
        {!isLast && (
          <div className="absolute left-1/2 -translate-x-1/2 top-11 bottom-4 w-[2px] bg-gradient-to-b from-oceanic-400/70 to-transparent opacity-95 z-10 journey-line" />
        )}
      </div>

      {/* Content column */}
      <div className="flex-1 glass-card p-3 sm:p-6 hover:scale-105 transition-all duration-300 min-w-0 sm:pl-4 journey-card">
        <div className="flex flex-wrap items-start justify-between mb-3">
          <div>
            <h4 className="text-xl font-bold text-white journey-role">
              {item.role}
            </h4>
            <p className="text-oceanic-500 font-medium journey-company">
              {item.company}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-200 font-medium bg-gray-700/30 px-2 py-1 rounded journey-period">
              {item.period}
            </p>
            <p className="text-xs text-gray-300 flex items-center gap-1 mt-1 journey-location-wrapper">
              <FaMapMarkerAlt className="w-3 h-3 text-oceanic-500 journey-location-icon" />
              <span className="bg-gray-700/20 px-1.5 py-0.5 rounded text-gray-200 journey-location">
                {item.location}
              </span>
            </p>
          </div>
        </div>
        <p className="text-gray-300 mb-4 text-story-base journey-description">
          {item.description}
        </p>
        <div className="space-y-2">
          <h5 className="text-sm font-semibold text-white journey-achievements-title">
            Key Achievements:
          </h5>
          <ul className="space-y-1">
            {item.achievements?.map((achievement: string) => (
              <li
                key={achievement}
                className="text-caption text-gray-300 flex items-start gap-2 journey-achievement"
              >
                <span className="text-green-400 mt-1 journey-achievement-bullet">
                  •
                </span>
                <span className="journey-achievement-text">{achievement}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </div>
));

JourneyItem.displayName = "JourneyItem";
export default JourneyItem;
