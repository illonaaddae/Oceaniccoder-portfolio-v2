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

export interface AdminDashboardProps {
  onLogout?: () => void;
  isReadOnly?: boolean;
}

export interface DeleteConfirmState {
  show: boolean;
  type:
    | "message"
    | "skill"
    | "project"
    | "certification"
    | "education"
    | "journey"
    | "gallery"
    | "blogPost"
    | null;
  id: string | null;
  name?: string;
}
