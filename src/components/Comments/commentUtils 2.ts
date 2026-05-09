import type { StyleVars } from "./types";

export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes <= 1 ? "Just now" : `${minutes} minutes ago`;
    }
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
};

export const getStyles = (isDark: boolean): StyleVars => ({
  cardStyles: isDark
    ? "glass-card bg-[var(--glass-bg)] border-[var(--glass-border)]"
    : "bg-[var(--bg-secondary)] border-[var(--glass-border)] shadow-sm",
  textPrimary: "text-[var(--text-primary)]",
  textSecondary: "text-[var(--text-secondary)]",
  textAccent: "text-[var(--text-accent)]",
  inputStyles:
    "bg-[var(--bg-primary)] border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-accent)] focus:border-[var(--brand-ocean-2)]",
});
