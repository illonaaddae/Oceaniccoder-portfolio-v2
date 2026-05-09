import {
  FaChartBar,
  FaEnvelope,
  FaCalendarAlt,
  FaComments,
  FaUser,
  FaCode,
  FaProjectDiagram,
  FaFileAlt,
  FaBlog,
  FaQuoteRight,
  FaGraduationCap,
  FaRoad,
  FaImage,
  FaCog,
} from "react-icons/fa";
import type { IconType } from "react-icons";
import type { TabType } from "./types";

export const allTabs: Array<{ id: TabType; label: string; icon: IconType }> = [
  { id: "overview", label: "Overview", icon: FaChartBar },
  { id: "messages", label: "Messages", icon: FaEnvelope },
  { id: "bookings", label: "Bookings", icon: FaCalendarAlt },
  { id: "comments", label: "Comments", icon: FaComments },
  { id: "about", label: "About Me", icon: FaUser },
  { id: "skills", label: "Skills", icon: FaCode },
  { id: "projects", label: "Projects", icon: FaProjectDiagram },
  { id: "certifications", label: "Certifications", icon: FaFileAlt },
  { id: "blog", label: "Blog Posts", icon: FaBlog },
  { id: "testimonials", label: "Testimonials", icon: FaQuoteRight },
  { id: "education", label: "Education", icon: FaGraduationCap },
  { id: "journey", label: "Journey", icon: FaRoad },
  { id: "gallery", label: "Gallery", icon: FaImage },
  { id: "settings", label: "Settings", icon: FaCog },
];
