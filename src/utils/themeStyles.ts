/**
 * Theme-aware styling utilities for consistent component styling
 * Reduces duplication of conditional theme classes across admin components
 */

export type Theme = "light" | "dark";

/**
 * Get card container styles based on theme
 */
export const getCardStyles = (
  theme: Theme,
  variant: "default" | "hover" | "empty" | "stat" = "default"
): string => {
  const variants = {
    default:
      theme === "dark"
        ? "bg-gray-800/50 border-gray-700/80"
        : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40",
    hover:
      theme === "dark"
        ? "bg-gray-800/50 border-gray-700/80 hover:border-gray-600"
        : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40 hover:border-blue-200/60",
    empty:
      theme === "dark"
        ? "bg-gray-800/30 border-gray-700/50"
        : "bg-white/30 border-slate-200/60",
    stat:
      theme === "dark"
        ? "bg-gradient-to-br from-gray-800/60 to-gray-900/40 border-gray-700/60"
        : "bg-gradient-to-br from-white/60 to-white/30 border-blue-200/50",
  };
  return `glass-card border rounded-2xl transition-all duration-200 ${variants[variant]}`;
};

/**
 * Get text color classes based on theme
 */
export const getTextStyles = (
  theme: Theme,
  variant: "primary" | "secondary" | "muted" = "primary"
): string => {
  const variants = {
    primary: theme === "dark" ? "text-white" : "text-slate-900",
    secondary: theme === "dark" ? "text-slate-200/90" : "text-slate-700/80",
    muted: theme === "dark" ? "text-gray-400" : "text-slate-600",
  };
  return `transition-colors duration-300 ${variants[variant]}`;
};

/**
 * Get title styles based on theme
 */
export const getTitleStyles = (
  theme: Theme,
  size: "sm" | "md" | "lg" | "xl" = "lg"
): string => {
  const sizes = {
    sm: "text-lg sm:text-xl",
    md: "text-xl sm:text-2xl",
    lg: "text-2xl sm:text-3xl",
    xl: "text-3xl sm:text-4xl",
  };
  return `${sizes[size]} font-bold ${getTextStyles(theme, "primary")}`;
};

/**
 * Get button styles based on theme and variant
 */
export const getButtonStyles = (
  theme: Theme,
  variant: "primary" | "secondary" | "danger" | "success" | "ghost" = "primary"
): string => {
  const variants = {
    primary:
      "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-500/20",
    secondary:
      theme === "dark"
        ? "bg-gray-700/80 text-gray-200 hover:bg-gray-600/80"
        : "bg-slate-200/80 text-slate-700 hover:bg-slate-300/80",
    danger:
      "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-500 hover:to-red-600 shadow-lg shadow-red-500/20",
    success:
      "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-500 hover:to-emerald-500",
    ghost:
      theme === "dark"
        ? "bg-transparent text-gray-300 hover:bg-gray-700/50"
        : "bg-transparent text-slate-600 hover:bg-slate-200/50",
  };
  return `flex items-center justify-center gap-2 px-4 sm:px-6 py-2 rounded-xl font-bold transition-all duration-200 hover:scale-105 ${variants[variant]}`;
};

/**
 * Get input field styles based on theme
 */
export const getInputStyles = (theme: Theme): string => {
  return theme === "dark"
    ? "bg-gray-700/50 border-gray-600/80 text-white placeholder-gray-400 focus:border-cyan-500/50 focus:ring-cyan-500/30"
    : "bg-white/80 border-slate-300/80 text-slate-900 placeholder-slate-400 focus:border-blue-500/50 focus:ring-blue-500/30";
};

/**
 * Get icon color based on theme
 */
export const getIconColor = (
  theme: Theme,
  variant: "default" | "primary" | "muted" = "default"
): string => {
  const variants = {
    default: theme === "dark" ? "text-cyan-400" : "text-blue-600",
    primary: theme === "dark" ? "text-cyan-300" : "text-blue-500",
    muted: theme === "dark" ? "text-gray-600" : "text-slate-400/60",
  };
  return variants[variant];
};

/**
 * Get stat card gradient based on color scheme
 */
export const getStatGradient = (
  color: "cyan" | "green" | "purple" | "orange" | "pink"
): string => {
  const gradients = {
    cyan: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30",
    green: "from-green-500/20 to-emerald-500/20 border-green-500/30",
    purple: "from-purple-500/20 to-pink-500/20 border-purple-500/30",
    orange: "from-orange-500/20 to-amber-500/20 border-orange-500/30",
    pink: "from-pink-500/20 to-rose-500/20 border-pink-500/30",
  };
  return `bg-gradient-to-br ${gradients[color]}`;
};
