import React from "react";
import type { Event } from "./types";
import EventIcon from "./EventIcon";

interface EventContentProps {
  event: Event;
}

const EventContent: React.FC<EventContentProps> = React.memo(({ event }) => (
  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
    <div className="p-1.5 sm:p-2 bg-white/20 rounded-full flex-shrink-0">
      <EventIcon name={event.iconName} />
    </div>
    <div className="flex-1 min-w-0 overflow-hidden">
      <h3 className="text-white font-bold text-xs sm:text-sm md:text-base leading-tight truncate">
        {event.title}
      </h3>
      {/* Show shorter message on mobile, full message on larger screens */}
      <p className="text-white/90 text-[10px] sm:text-xs md:text-sm leading-tight line-clamp-2 sm:line-clamp-1 md:whitespace-normal">
        <span className="hidden sm:inline">{event.message}</span>
        <span className="sm:hidden">
          {event.mobileMessage || event.message}
        </span>
      </p>
    </div>
  </div>
));

EventContent.displayName = "EventContent";

export default EventContent;
