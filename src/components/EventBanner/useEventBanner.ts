import { useState, useEffect } from "react";
import type { Event } from "./types";
import { EVENTS } from "./eventData";

export interface UseEventBannerReturn {
  currentEvent: Event | null;
  showConfetti: boolean;
  handleDismiss: () => void;
}

export function useEventBanner(): UseEventBannerReturn {
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // JS months are 0-indexed
    const currentDay = today.getDate();

    // Check if today matches any event
    const activeEvent = EVENTS.find((event) => {
      const start = event.startDate;
      const end = event.endDate || event.startDate;

      // Simple date range check (same year)
      if (currentMonth === start.month && currentMonth === end.month) {
        return currentDay >= start.day && currentDay <= end.day;
      }
      if (currentMonth === start.month) {
        return currentDay >= start.day;
      }
      if (currentMonth === end.month) {
        return currentDay <= end.day;
      }
      return false;
    });

    if (activeEvent) {
      // Check if user already dismissed this event today
      const dismissedKey = `event_dismissed_${activeEvent.id}_${currentMonth}_${currentDay}`;
      const wasDismissed = localStorage.getItem(dismissedKey);

      if (!wasDismissed) {
        setCurrentEvent(activeEvent);
        if (activeEvent.showConfetti) {
          setShowConfetti(true);
          // Stop confetti after 5 seconds
          setTimeout(() => setShowConfetti(false), 5000);
        }
      }
    }
  }, []);

  const handleDismiss = () => {
    if (currentEvent) {
      const today = new Date();
      const dismissedKey = `event_dismissed_${currentEvent.id}_${
        today.getMonth() + 1
      }_${today.getDate()}`;
      localStorage.setItem(dismissedKey, "true");
    }
    setIsDismissed(true);
    setShowConfetti(false);
  };

  const active = !isDismissed ? currentEvent : null;

  return {
    currentEvent: active,
    showConfetti: active ? showConfetti : false,
    handleDismiss,
  };
}
