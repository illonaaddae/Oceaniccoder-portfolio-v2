import React, { createContext, useContext, useState } from "react";
import { SKILLS_DATA } from "../utils/data/skills";
import { PROJECTS_DATA } from "../utils/data/projects";
import { BLOGS_DATA } from "../utils/data/blogs";

const PortfolioContext = createContext();

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error("usePortfolio must be used within a PortfolioProvider");
  }
  return context;
};

export const PortfolioProvider = ({ children }) => {
  const [activeSection, setActiveSection] = useState("home");
  const [activeSkillCategory, setActiveSkillCategory] = useState(0);
  const [activeProjectFilter, setActiveProjectFilter] = useState("All");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Portfolio data
  const skills = SKILLS_DATA;
  const projects = PROJECTS_DATA;
  const blogs = BLOGS_DATA;

  // Navigation items
  // Allow an external blog URL via env variable; fallback to a placeholder
  const blogUrl = process.env.REACT_APP_BLOG_URL || "https://your-blog.example";

  const navItems = [
    { id: "home", label: "Home", href: "#home" },
    { id: "about", label: "About", href: "#about" },
    { id: "skills", label: "Skills", href: "#skills" },
    { id: "projects", label: "Projects", href: "#projects" },
    { id: "blog", label: "Blog", href: blogUrl },
    { id: "contact", label: "Contact", href: "#contact" },
  ];

  // Project filters
  const projectFilters = [
    "All",
    "Web Apps",
    "Mobile Apps",
    "AI/ML",
    "Open Source",
  ];

  const value = {
    // State
    activeSection,
    setActiveSection,
    activeSkillCategory,
    setActiveSkillCategory,
    activeProjectFilter,
    setActiveProjectFilter,
    isMenuOpen,
    setIsMenuOpen,

    // Data
    skills,
    projects,
    blogs,
    navItems,
    projectFilters,
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};
