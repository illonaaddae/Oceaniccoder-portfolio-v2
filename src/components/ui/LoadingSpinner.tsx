import React from "react";

interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: "sm" | "md" | "lg";
  /** Optional loading message to display */
  message?: string;
  /** Theme for text color */
  theme?: "light" | "dark";
  /** Custom className for the container */
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 border-2",
  md: "w-16 h-16 border-4",
  lg: "w-24 h-24 border-4",
};

/**
 * Reusable loading spinner component with consistent styling
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  message,
  theme = "dark",
  className = "",
}) => (
  <div className={`text-center ${className}`}>
    <div
      className={`${sizeClasses[size]} border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4`}
      role="status"
      aria-label="Loading"
    />
    {message && (
      <p className={theme === "dark" ? "text-gray-400" : "text-slate-600"}>
        {message}
      </p>
    )}
  </div>
);

interface FullPageLoadingProps {
  message?: string;
  theme?: "light" | "dark";
}

/**
 * Full-page loading state with gradient background
 */
export const FullPageLoading: React.FC<FullPageLoadingProps> = ({
  message = "Loading...",
  theme = "dark",
}) => (
  <section
    className="min-h-screen pt-28 pb-20 flex items-center justify-center"
    style={{
      background:
        "linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-primary) 50%, var(--bg-secondary) 100%)",
    }}
  >
    <LoadingSpinner size="md" message={message} theme={theme} />
  </section>
);

export default LoadingSpinner;
