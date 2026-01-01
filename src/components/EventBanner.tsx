import React, { useState, useEffect } from "react";
import {
  FaTimes,
  FaBirthdayCake,
  FaGift,
  FaStar,
  FaGraduationCap,
  FaHeart,
  FaTree,
  FaFlag,
  FaGhost,
  FaSun,
  FaLeaf,
  FaSnowflake,
  FaEgg,
  FaDrum,
} from "react-icons/fa";
import Confetti from "./Confetti";

interface Event {
  id: string;
  title: string;
  message: string;
  mobileMessage?: string; // Shorter message for mobile
  icon: React.ReactNode;
  startDate: { month: number; day: number };
  endDate?: { month: number; day: number };
  bgGradient: string;
  showConfetti?: boolean;
}

// Define your special events here
const EVENTS: Event[] = [
  // January
  {
    id: "new-year",
    title: "🎉 Happy New Year!",
    message:
      "Wishing you an amazing year ahead filled with success and happiness!",
    mobileMessage: "Happy New Year! 🎊",
    icon: <FaStar className="text-xl md:text-2xl" />,
    startDate: { month: 1, day: 1 },
    endDate: { month: 1, day: 3 },
    bgGradient: "from-yellow-500/90 via-orange-500/90 to-red-500/90",
    showConfetti: true,
  },
  {
    id: "mlk-day",
    title: "✊ MLK Day",
    message:
      "Honoring Dr. Martin Luther King Jr. and his dream of equality for all.",
    mobileMessage: "Honoring Dr. King's legacy ✊",
    icon: <FaHeart className="text-xl md:text-2xl" />,
    startDate: { month: 1, day: 20 },
    endDate: { month: 1, day: 20 },
    bgGradient: "from-blue-600/90 via-indigo-600/90 to-purple-600/90",
    showConfetti: false,
  },
  // February
  {
    id: "valentines",
    title: "💕 Happy Valentine's Day!",
    message:
      "Spreading love and appreciation to all visitors! Thanks for being here.",
    mobileMessage: "Spreading love! 💕",
    icon: <FaHeart className="text-xl md:text-2xl" />,
    startDate: { month: 2, day: 14 },
    endDate: { month: 2, day: 14 },
    bgGradient: "from-pink-500/90 via-red-500/90 to-rose-500/90",
    showConfetti: true,
  },
  {
    id: "black-history",
    title: "✊ Black History Month",
    message:
      "Celebrating the achievements and contributions of Black Americans.",
    mobileMessage: "Celebrating Black history ✊",
    icon: <FaStar className="text-xl md:text-2xl" />,
    startDate: { month: 2, day: 1 },
    endDate: { month: 2, day: 28 },
    bgGradient: "from-red-600/90 via-yellow-500/90 to-green-600/90",
    showConfetti: false,
  },
  // March
  {
    id: "ghana-independence",
    title: "🇬🇭 Ghana Independence Day!",
    message:
      "Celebrating Ghana's freedom since 1957! The first sub-Saharan African nation to gain independence.",
    mobileMessage: "Ghana's freedom day! 🇬🇭",
    icon: <FaStar className="text-xl md:text-2xl" />,
    startDate: { month: 3, day: 6 },
    endDate: { month: 3, day: 6 },
    bgGradient: "from-red-600/90 via-yellow-500/90 to-green-600/90",
    showConfetti: true,
  },
  {
    id: "womens-day",
    title: "💪 International Women's Day",
    message:
      "Celebrating women's achievements and advocating for gender equality.",
    mobileMessage: "Celebrating women! 💪",
    icon: <FaHeart className="text-xl md:text-2xl" />,
    startDate: { month: 3, day: 8 },
    endDate: { month: 3, day: 8 },
    bgGradient: "from-purple-500/90 via-pink-500/90 to-rose-500/90",
    showConfetti: false,
  },
  {
    id: "st-patricks",
    title: "🍀 Happy St. Patrick's Day!",
    message: "May luck be on your side! Celebrating the luck of the Irish.",
    mobileMessage: "Luck of the Irish! 🍀",
    icon: <FaLeaf className="text-xl md:text-2xl" />,
    startDate: { month: 3, day: 17 },
    endDate: { month: 3, day: 17 },
    bgGradient: "from-green-500/90 via-emerald-500/90 to-teal-500/90",
    showConfetti: true,
  },
  // April
  {
    id: "easter",
    title: "🐰 Happy Easter!",
    message: "Wishing you a joyful Easter filled with hope and renewal!",
    mobileMessage: "Happy Easter! 🐰🥚",
    icon: <FaEgg className="text-xl md:text-2xl" />,
    startDate: { month: 4, day: 20 },
    endDate: { month: 4, day: 21 },
    bgGradient: "from-yellow-400/90 via-pink-400/90 to-purple-400/90",
    showConfetti: true,
  },
  {
    id: "birthday",
    title: "🎂 It's My Birthday!",
    message:
      "April 28th is my special day! Thanks for visiting my portfolio. Feel free to leave a birthday wish!",
    mobileMessage: "It's my birthday! 🎂🎁",
    icon: <FaBirthdayCake className="text-xl md:text-2xl" />,
    startDate: { month: 4, day: 28 },
    endDate: { month: 4, day: 28 },
    bgGradient: "from-pink-500/90 via-purple-500/90 to-indigo-500/90",
    showConfetti: true,
  },
  // May
  {
    id: "mothers-day",
    title: "💐 Happy Mother's Day!",
    message: "Celebrating all the amazing moms out there! You are appreciated.",
    mobileMessage: "Love to all moms! 💐",
    icon: <FaHeart className="text-xl md:text-2xl" />,
    startDate: { month: 5, day: 11 },
    endDate: { month: 5, day: 11 },
    bgGradient: "from-pink-400/90 via-rose-400/90 to-red-400/90",
    showConfetti: true,
  },
  {
    id: "memorial-day",
    title: "🇺🇸 Memorial Day",
    message: "Honoring those who made the ultimate sacrifice for our freedom.",
    mobileMessage: "Honoring our heroes 🇺🇸",
    icon: <FaFlag className="text-xl md:text-2xl" />,
    startDate: { month: 5, day: 26 },
    endDate: { month: 5, day: 26 },
    bgGradient: "from-red-600/90 via-white/70 to-blue-600/90",
    showConfetti: false,
  },
  // June
  {
    id: "fathers-day",
    title: "👔 Happy Father's Day!",
    message: "Celebrating all the wonderful dads! Thank you for everything.",
    mobileMessage: "Love to all dads! 👔",
    icon: <FaGift className="text-xl md:text-2xl" />,
    startDate: { month: 6, day: 15 },
    endDate: { month: 6, day: 15 },
    bgGradient: "from-blue-500/90 via-indigo-500/90 to-purple-500/90",
    showConfetti: true,
  },
  {
    id: "pride-month",
    title: "🏳️‍🌈 Happy Pride Month!",
    message: "Celebrating love, diversity, and equality for all!",
    mobileMessage: "Love is love! 🏳️‍🌈",
    icon: <FaHeart className="text-xl md:text-2xl" />,
    startDate: { month: 6, day: 1 },
    endDate: { month: 6, day: 30 },
    bgGradient:
      "from-red-500/90 via-yellow-500/90 to-green-500/90 bg-gradient-to-r",
    showConfetti: true,
  },
  {
    id: "juneteenth",
    title: "✊ Juneteenth",
    message: "Celebrating freedom and the end of slavery in America.",
    mobileMessage: "Celebrating freedom ✊",
    icon: <FaStar className="text-xl md:text-2xl" />,
    startDate: { month: 6, day: 19 },
    endDate: { month: 6, day: 19 },
    bgGradient: "from-red-600/90 via-black/80 to-green-600/90",
    showConfetti: false,
  },
  // July
  {
    id: "independence-day",
    title: "🇺🇸 Happy 4th of July!",
    message:
      "Celebrating Independence Day! Land of the free, home of the brave.",
    mobileMessage: "Happy 4th! 🎆🇺🇸",
    icon: <FaFlag className="text-xl md:text-2xl" />,
    startDate: { month: 7, day: 4 },
    endDate: { month: 7, day: 4 },
    bgGradient: "from-red-600/90 via-white/80 to-blue-600/90",
    showConfetti: true,
  },
  // September
  {
    id: "labor-day",
    title: "💼 Happy Labor Day!",
    message:
      "Celebrating the hard work and achievements of workers everywhere!",
    mobileMessage: "Celebrating workers! 💼",
    icon: <FaStar className="text-xl md:text-2xl" />,
    startDate: { month: 9, day: 1 },
    endDate: { month: 9, day: 1 },
    bgGradient: "from-blue-600/90 via-indigo-500/90 to-purple-600/90",
    showConfetti: false,
  },
  // October
  {
    id: "halloween",
    title: "🎃 Happy Halloween!",
    message: "Spooky season is here! Hope your Halloween is frighteningly fun!",
    mobileMessage: "Spooky season! 👻🎃",
    icon: <FaGhost className="text-xl md:text-2xl" />,
    startDate: { month: 10, day: 31 },
    endDate: { month: 10, day: 31 },
    bgGradient: "from-orange-500/90 via-purple-600/90 to-black/90",
    showConfetti: true,
  },
  // November
  {
    id: "veterans-day",
    title: "🎖️ Veterans Day",
    message:
      "Honoring all who served. Thank you for your sacrifice and service.",
    mobileMessage: "Thank you, veterans 🎖️",
    icon: <FaFlag className="text-xl md:text-2xl" />,
    startDate: { month: 11, day: 11 },
    endDate: { month: 11, day: 11 },
    bgGradient: "from-red-600/90 via-white/70 to-blue-600/90",
    showConfetti: false,
  },
  {
    id: "thanksgiving",
    title: "🦃 Happy Thanksgiving!",
    message:
      "Grateful for visitors like you! Wishing you a wonderful Thanksgiving.",
    mobileMessage: "Grateful for you! 🦃",
    icon: <FaLeaf className="text-xl md:text-2xl" />,
    startDate: { month: 11, day: 27 },
    endDate: { month: 11, day: 28 },
    bgGradient: "from-orange-500/90 via-amber-500/90 to-yellow-500/90",
    showConfetti: true,
  },
  // December
  {
    id: "christmas",
    title: "🎄 Merry Christmas!",
    message: "Wishing you a magical holiday season filled with joy and warmth!",
    mobileMessage: "Merry Christmas! 🎄🎁",
    icon: <FaTree className="text-xl md:text-2xl" />,
    startDate: { month: 12, day: 24 },
    endDate: { month: 12, day: 26 },
    bgGradient: "from-red-600/90 via-green-600/90 to-red-600/90",
    showConfetti: true,
  },
  {
    id: "hanukkah",
    title: "🕎 Happy Hanukkah!",
    message: "Wishing you a bright and joyful Festival of Lights!",
    mobileMessage: "Happy Hanukkah! 🕎",
    icon: <FaStar className="text-xl md:text-2xl" />,
    startDate: { month: 12, day: 14 },
    endDate: { month: 12, day: 22 },
    bgGradient: "from-blue-500/90 via-white/80 to-blue-600/90",
    showConfetti: true,
  },
  {
    id: "kwanzaa",
    title: "🕯️ Happy Kwanzaa!",
    message: "Celebrating African heritage, culture, and community!",
    mobileMessage: "Happy Kwanzaa! 🕯️",
    icon: <FaDrum className="text-xl md:text-2xl" />,
    startDate: { month: 12, day: 26 },
    endDate: { month: 12, day: 31 },
    bgGradient: "from-red-600/90 via-black/80 to-green-600/90",
    showConfetti: true,
  },
  {
    id: "new-years-eve",
    title: "🥂 Happy New Year's Eve!",
    message: "Cheers to new beginnings! See you in the new year!",
    mobileMessage: "Cheers to 2026! 🥂",
    icon: <FaStar className="text-xl md:text-2xl" />,
    startDate: { month: 12, day: 31 },
    endDate: { month: 12, day: 31 },
    bgGradient: "from-purple-600/90 via-pink-500/90 to-yellow-500/90",
    showConfetti: true,
  },
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
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="p-1.5 sm:p-2 bg-white/20 rounded-full flex-shrink-0">
                {currentEvent.icon}
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <h3 className="text-white font-bold text-xs sm:text-sm md:text-base leading-tight truncate">
                  {currentEvent.title}
                </h3>
                {/* Show shorter message on mobile, full message on larger screens */}
                <p className="text-white/90 text-[10px] sm:text-xs md:text-sm leading-tight line-clamp-2 sm:line-clamp-1 md:whitespace-normal">
                  <span className="hidden sm:inline">
                    {currentEvent.message}
                  </span>
                  <span className="sm:hidden">
                    {currentEvent.mobileMessage || currentEvent.message}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1.5 sm:p-2 hover:bg-white/20 rounded-full transition-colors text-white/80 hover:text-white flex-shrink-0"
              aria-label="Dismiss banner"
            >
              <FaTimes className="text-sm sm:text-base" />
            </button>
          </div>
        </div>
      </div>
      {/* Spacer to prevent content from being hidden behind the banner */}
      <div className="h-12 sm:h-14 md:h-16" />
    </>
  );
};

export default EventBanner;
