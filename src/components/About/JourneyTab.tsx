import React from "react";
import { FaRocket } from "react-icons/fa";
import JourneyItem from "./JourneyItem";

import type { Journey } from "../../types";

interface JourneyTabProps {
  journey: Journey[];
}

const JourneyTab = React.memo(({ journey }: JourneyTabProps) => (
  <div className="space-y-8">
    <div className="glass-card p-6 sm:p-8 journey-container">
      <h3 className="text-2xl font-bold text-white journey-title mb-8 flex items-center gap-3">
        <FaRocket className="text-oceanic-500 journey-icon" />
        Career Journey
      </h3>
      <div className="space-y-8">
        {journey.map((item, idx) => (
          <JourneyItem
            key={item.$id || item.company}
            item={item}
            index={idx}
            isLast={idx === journey.length - 1}
          />
        ))}
      </div>
    </div>
  </div>
));

JourneyTab.displayName = "JourneyTab";
export default JourneyTab;
