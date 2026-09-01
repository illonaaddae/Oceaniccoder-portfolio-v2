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
  FaBriefcase,
  FaFileInvoiceDollar,
  FaChartLine,
  FaDatabase,
  FaCreditCard,
} from "react-icons/fa";
import type { IconType } from "react-icons";
import type { TabType } from "./types";

export interface TabDef {
  id: TabType;
  label: string;
  icon: IconType;
}

export interface TabGroup {
  id: string;
  label: string;
  tabs: TabDef[];
}

/**
 * The sidebar's nineteen destinations, grouped by what you are actually doing.
 *
 * Grouping rather than nesting is deliberate: Client Work, Invoices and
 * Payments are one flow you move through constantly, so burying any of them a
 * click deeper would tax the most-travelled path in the dashboard to save
 * vertical space. Headings make the list scannable at the same click depth,
 * and the groups collapse for anyone who does want it shorter.
 *
 * This is the single source of truth for both the order and the membership;
 * `allTabs` is derived from it.
 */
export const TAB_GROUPS: TabGroup[] = [
  {
    id: "business",
    label: "Business",
    tabs: [
      { id: "overview", label: "Overview", icon: FaChartBar },
      { id: "messages", label: "Messages", icon: FaEnvelope },
      { id: "bookings", label: "Bookings", icon: FaCalendarAlt },
      { id: "client-work", label: "Client Work", icon: FaBriefcase },
      { id: "invoices", label: "Invoices", icon: FaFileInvoiceDollar },
      { id: "payments", label: "Payments", icon: FaCreditCard },
      { id: "analytics", label: "Analytics", icon: FaChartLine },
    ],
  },
  {
    id: "content",
    label: "Content",
    tabs: [
      { id: "blog", label: "Blog Posts", icon: FaBlog },
      { id: "projects", label: "Projects", icon: FaProjectDiagram },
      { id: "testimonials", label: "Testimonials", icon: FaQuoteRight },
      { id: "comments", label: "Comments", icon: FaComments },
      { id: "gallery", label: "Gallery", icon: FaImage },
    ],
  },
  {
    id: "profile",
    label: "Profile",
    tabs: [
      { id: "about", label: "About Me", icon: FaUser },
      { id: "skills", label: "Skills", icon: FaCode },
      { id: "certifications", label: "Certifications", icon: FaFileAlt },
      { id: "education", label: "Education", icon: FaGraduationCap },
      { id: "journey", label: "Journey", icon: FaRoad },
    ],
  },
  {
    id: "system",
    label: "System",
    tabs: [
      { id: "storage", label: "Storage", icon: FaDatabase },
      { id: "settings", label: "Settings", icon: FaCog },
    ],
  },
];

export const allTabs: TabDef[] = TAB_GROUPS.flatMap((group) => group.tabs);
