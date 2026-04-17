import type { Event } from "./types";

/** January – March events */
export const eventsJanMar: Event[] = [
  {
    id: "new-year",
    title: "Happy New Year!",
    message:
      "Wishing you an amazing year ahead filled with success and happiness!",
    mobileMessage: "Happy New Year! ",
    iconName: "star",
    startDate: { month: 1, day: 1 },
    endDate: { month: 1, day: 3 },
    bgGradient: "from-teal-600 via-oceanic-600 to-teal-500",
    showConfetti: true,
  },
  {
    id: "mlk-day",
    title: "MLK Day",
    message:
      "Honoring Dr. Martin Luther King Jr. and his dream of equality for all.",
    mobileMessage: "Honoring Dr. King's legacy",
    iconName: "heart",
    startDate: { month: 1, day: 20 },
    endDate: { month: 1, day: 20 },
    bgGradient: "from-slate-700 via-teal-700 to-slate-800",
    showConfetti: false,
  },
  {
    id: "valentines",
    title: "Happy Valentine's Day!",
    message:
      "Spreading love and appreciation to all visitors! Thanks for being here.",
    mobileMessage: "Spreading love!",
    iconName: "heart",
    startDate: { month: 2, day: 14 },
    endDate: { month: 2, day: 14 },
    bgGradient: "from-rose-500 via-pink-500 to-teal-500",
    showConfetti: true,
  },
  {
    id: "black-history",
    title: "Black History Month",
    message:
      "Celebrating the achievements and contributions of Black Americans.",
    mobileMessage: "Celebrating Black history",
    iconName: "star",
    startDate: { month: 2, day: 1 },
    endDate: { month: 2, day: 28 },
    bgGradient: "from-amber-600 via-teal-600 to-emerald-600",
    showConfetti: false,
  },
  {
    id: "ghana-independence",
    title: "Ghana Independence Day!",
    message:
      "Celebrating Ghana's freedom since 1957! The first sub-Saharan African nation to gain independence.",
    mobileMessage: "Ghana's freedom day!",
    iconName: "star",
    startDate: { month: 3, day: 6 },
    endDate: { month: 3, day: 6 },
    bgGradient: "from-red-600 via-amber-500 to-emerald-600",
    showConfetti: true,
  },
  {
    id: "womens-day",
    title: "International Women's Day",
    message:
      "Celebrating women's achievements and advocating for gender equality.",
    mobileMessage: "Celebrating women!",
    iconName: "heart",
    startDate: { month: 3, day: 8 },
    endDate: { month: 3, day: 8 },
    bgGradient: "from-purple-600 via-teal-500 to-oceanic-500",
    showConfetti: false,
  },
  {
    id: "st-patricks",
    title: "Happy St. Patrick's Day!",
    message: "May luck be on your side! Celebrating the luck of the Irish.",
    mobileMessage: "Luck of the Irish!",
    iconName: "leaf",
    startDate: { month: 3, day: 17 },
    endDate: { month: 3, day: 17 },
    bgGradient: "from-emerald-600 via-teal-500 to-oceanic-500",
    showConfetti: true,
  },
];
