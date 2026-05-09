export type TabType =
  | "overview"
  | "messages"
  | "bookings"
  | "comments"
  | "skills"
  | "projects"
  | "certifications"
  | "gallery"
  | "education"
  | "journey"
  | "about"
  | "blog"
  | "testimonials"
  | "settings";

export interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: TabType) => void;
  theme: string | "light" | "dark";
  onThemeToggle: () => void;
  onLogout?: () => void;
  isReadOnly?: boolean;
  pendingBookings?: number;
}
