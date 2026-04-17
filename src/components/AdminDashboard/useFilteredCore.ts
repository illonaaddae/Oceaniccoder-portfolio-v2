import { useMemo } from "react";
import type { Skill, Project, Certification, Message } from "@/types";

export function useFilteredCore(
  searchQuery: string,
  messages: Message[],
  skills: Skill[],
  projects: Project[],
  certifications: Certification[],
) {
  const q = searchQuery.toLowerCase();

  const filteredMessages = useMemo(
    () =>
      messages.filter(
        (msg) =>
          msg.email?.toLowerCase().includes(q) ||
          msg.name?.toLowerCase().includes(q) ||
          msg.subject?.toLowerCase().includes(q) ||
          msg.message?.toLowerCase().includes(q),
      ),
    [messages, q],
  );

  const filteredSkills = useMemo(
    () =>
      skills.filter(
        (skill) =>
          skill.name?.toLowerCase().includes(q) ||
          skill.category?.toLowerCase().includes(q),
      ),
    [skills, q],
  );

  const filteredProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          project.title?.toLowerCase().includes(q) ||
          project.description?.toLowerCase().includes(q) ||
          project.technologies?.some((t) => t.toLowerCase().includes(q)),
      ),
    [projects, q],
  );

  const filteredCertifications = useMemo(
    () =>
      certifications.filter(
        (cert) =>
          cert.title?.toLowerCase().includes(q) ||
          cert.issuer?.toLowerCase().includes(q),
      ),
    [certifications, q],
  );

  return {
    filteredMessages,
    filteredSkills,
    filteredProjects,
    filteredCertifications,
  };
}
