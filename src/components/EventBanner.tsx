import React, { useState, useEffect } from "react";
import {
  FaTimes,
  FaBirthdayCake,
  FaGift,
  FaStar,
  FaGraduationCap,
} from "react-icons/fa";
import Confetti from "./Confetti";

interface Event {
  id: string;
  title: string;
  message: string;
  icon: React.ReactNode;
  startDate: { month: number; day: number };
  endDate?: { month: number; day: number };
  bgGradient: string;
  showConfetti?: boolean;
}

// Define your special events here
const EVENTS: Event[] = [
  {
    id: "birthday",
    title: "🎂 It's My Birthday!",
    message:
      "April 28th is my special day! Thanks for visiting my portfolio. Feel free to leave a birthday wish!",
    icon: <FaBirthdayCake className="text-2xl" />,
    startDate: { month: 4, day: 28 },
    endDate: { month: 4, day: 28 },
    bgGradient: "from-pink-500/90 via-purple-500/90 to-indigo-500/90",
    showConfetti: true,
  },
  {
    id: "new-year",
    title: "🎉 Happy New Year!",
    message:
      "Wishing you an amazing year ahead filled with success and happiness!",
    icon: <FaStar className="text-2xl" />,
    startDate: { month: 1, day: 1 },
    endDate: { month: 1, day: 3 },
    bgGradient: "from-yellow-500/90 via-orange-500/90 to-red-500/90",
    showConfetti: true,
  },
  // Add more events as needed
];

const EventBanner: React.FC = () => {
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

  if (!currentEvent || isDismissed) return null;

  return (
    <>
      {showConfetti && <Confetti />}
      <div
        className={`fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r ${currentEvent.bgGradient} backdrop-blur-sm shadow-lg`}
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-white/20 rounded-full">
                {currentEvent.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-sm md:text-base">
                  {currentEvent.title}
                </h3>
                <p className="text-white/90 text-xs md:text-sm truncate md:whitespace-normal">
                  {currentEvent.message}
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/20 rounded-full transition-colors text-white/80 hover:text-white flex-shrink-0"
              aria-label="Dismiss banner"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EventBanner;
