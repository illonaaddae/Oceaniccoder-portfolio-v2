import type { IconType } from "react-icons";
import {
  FaFolder,
  FaEnvelope,
  FaAward,
  FaCode,
  FaGraduationCap,
  FaRoute,
  FaBlog,
  FaImage,
  FaQuoteRight,
} from "react-icons/fa";
import type {
  Project,
  Message,
  Certification,
  Skill,
  GalleryImage,
  Education,
  Journey,
  BlogPost,
  Testimonial,
} from "@/types";

export type StatusTone = "success" | "warning" | "info" | "neutral" | "featured";

export interface ActivityItem {
  id: string;
  name: string;
  category: string;
  /** Admin tab this item lives in, for navigation. */
  tab: string;
  /** ISO timestamp used for sorting; "" when unknown (sinks to the bottom). */
  timestamp: string;
  icon: IconType;
  status?: string;
  statusTone?: StatusTone;
}

/** Read Appwrite system timestamps that exist at runtime even when absent from the TS type. */
function ts(doc: unknown): string {
  const d = doc as { $updatedAt?: string; $createdAt?: string };
  return d.$updatedAt || d.$createdAt || "";
}

export interface ActivitySources {
  projects?: Project[];
  messages?: Message[];
  certifications?: Certification[];
  skills?: Skill[];
  gallery?: GalleryImage[];
  education?: Education[];
  journey?: Journey[];
  blogPosts?: BlogPost[];
  testimonials?: Testimonial[];
}

/**
 * Merge every admin data source into one timestamp-sorted activity feed.
 * Newest first; the caller decides how many to show via `limit`.
 */
export function buildRecentActivity(sources: ActivitySources, limit = 8): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const p of sources.projects ?? []) {
    const published = p.status === "published" || p.status === "Completed";
    const draft = p.status === "draft" || p.status === "In Progress";
    items.push({
      id: `project-${p.$id}`,
      name: p.title,
      category: "Project",
      tab: "projects",
      timestamp: ts(p),
      icon: FaFolder,
      status: p.featured ? "Featured" : published ? "Completed" : p.status || "Draft",
      statusTone: p.featured ? "featured" : published ? "success" : draft ? "warning" : "neutral",
    });
  }

  for (const m of sources.messages ?? []) {
    items.push({
      id: `message-${m.$id}`,
      name: m.name,
      category: "Message",
      tab: "messages",
      timestamp: ts(m),
      icon: FaEnvelope,
      status: m.status === "new" ? "New" : m.status === "replied" ? "Replied" : "Read",
      statusTone: m.status === "new" ? "info" : "neutral",
    });
  }

  for (const c of sources.certifications ?? []) {
    items.push({
      id: `cert-${c.$id}`,
      name: c.title,
      category: "Certification",
      tab: "certifications",
      timestamp: ts(c),
      icon: FaAward,
      status: c.issuer || c.platform,
      statusTone: "neutral",
    });
  }

  for (const s of sources.skills ?? []) {
    items.push({
      id: `skill-${s.$id}`,
      name: s.name,
      category: "Skill",
      tab: "skills",
      timestamp: ts(s),
      icon: FaCode,
      status: s.category,
      statusTone: "neutral",
    });
  }

  for (const b of sources.blogPosts ?? []) {
    items.push({
      id: `blog-${b.$id}`,
      name: b.title,
      category: "Blog Post",
      tab: "blog",
      timestamp: b.publishedAt || ts(b),
      icon: FaBlog,
      status: b.published ? "Published" : "Draft",
      statusTone: b.published ? "success" : "warning",
    });
  }

  for (const e of sources.education ?? []) {
    items.push({
      id: `edu-${e.$id}`,
      name: e.degree || e.institution,
      category: "Education",
      tab: "education",
      timestamp: ts(e),
      icon: FaGraduationCap,
      status: e.institution,
      statusTone: "neutral",
    });
  }

  for (const j of sources.journey ?? []) {
    items.push({
      id: `journey-${j.$id}`,
      name: j.role,
      category: "Journey",
      tab: "journey",
      timestamp: ts(j),
      icon: FaRoute,
      status: j.company,
      statusTone: "neutral",
    });
  }

  for (const g of sources.gallery ?? []) {
    items.push({
      id: `gallery-${g.$id}`,
      name: g.caption || g.alt || "Image",
      category: "Gallery",
      tab: "gallery",
      timestamp: ts(g),
      icon: FaImage,
      status: g.isPublic === false ? "Hidden" : "Public",
      statusTone: g.isPublic === false ? "neutral" : "success",
    });
  }

  for (const t of sources.testimonials ?? []) {
    items.push({
      id: `testimonial-${t.$id}`,
      name: t.name,
      category: "Testimonial",
      tab: "testimonials",
      timestamp: ts(t),
      icon: FaQuoteRight,
      status: t.featured ? "Featured" : t.company || t.role,
      statusTone: t.featured ? "featured" : "neutral",
    });
  }

  // Newest first; items without a timestamp sort last.
  items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return items.slice(0, limit);
}
