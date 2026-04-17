import React from "react";
import {
  FaHeart,
  FaUsers,
  FaLightbulb,
  FaGraduationCap,
  FaRocket,
} from "react-icons/fa";

export const values = [
  {
    icon: <FaHeart className="text-red-400" />,
    title: "Passion for Technology",
    description:
      "Driven by the transformative power of technology to create positive change in communities worldwide.",
    impact: "Led 15+ successful projects that transformed user experiences",
  },
  {
    icon: <FaUsers className="text-blue-400" />,
    title: "Inclusive Leadership",
    description:
      "Building diverse tech communities where everyone, regardless of background or gender, can thrive and succeed.",
    impact: "Mentored 100+ students, with 80% career advancement rate",
  },
  {
    icon: <FaLightbulb className="text-yellow-400" />,
    title: "Innovation & Problem-Solving",
    description:
      "Approaching challenges with creative solutions and cutting-edge technologies to deliver exceptional results.",
    impact: "Reduced development time by 40% through innovative workflows",
  },
  {
    icon: <FaGraduationCap className="text-green-400" />,
    title: "Continuous Learning",
    description:
      "Committed to staying at the forefront of technology while sharing knowledge with the next generation.",
    impact: "Completed 10+ certifications in emerging technologies",
  },
];

export const tabs = [
  { id: "story", label: "My Story", icon: <FaHeart /> },
  { id: "journey", label: "Career Journey", icon: <FaRocket /> },
  { id: "education", label: "Education", icon: <FaGraduationCap /> },
  { id: "values", label: "Core Values", icon: <FaLightbulb /> },
];
