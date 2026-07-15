// Curated on-brand gradient themes for journey cards. Kept within the design
// system (oceanic family + slate neutral + semantic accents) so the timeline
// reads cohesive instead of rainbow. Values are Tailwind gradient class pairs.
export const colorOptions: { value: string; label: string }[] = [
  // Tech / Engineering
  { value: "from-oceanic-500 to-oceanic-900", label: "Ocean: Tech / Dev" },
  { value: "from-oceanic-400 to-oceanic-600", label: "Aqua: Software Eng" },
  { value: "from-info-500 to-oceanic-800", label: "Deep: Engineering" },
  { value: "from-slate-500 to-slate-800", label: "Slate: DevOps / Infra" },
  // Design / Product
  { value: "from-oceanic-300 to-oceanic-600", label: "Sky: UI/UX / Product" },
  { value: "from-slate-400 to-oceanic-700", label: "Steel: Creative / Brand" },
  // Leadership / Growth
  { value: "from-success-500 to-success-700", label: "Green: Lead / Management" },
  { value: "from-success-400 to-oceanic-600", label: "Mint: Growth / Analytics" },
  // Business / Finance
  { value: "from-warning-500 to-warning-700", label: "Amber: Business / Finance" },
  // Education / Research
  { value: "from-oceanic-400 to-info-700", label: "Arctic: Education / Research" },
  // Internship / Early Career
  { value: "from-oceanic-300 to-oceanic-500", label: "Fresh: Internship / Junior" },
  // Contracting / Freelance / Founder
  { value: "from-slate-500 to-oceanic-700", label: "Zinc: Freelance / Contract" },
  { value: "from-error-500 to-error-700", label: "Crimson: Startup / Founder" },
];
