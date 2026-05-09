import React from "react";
import {
  FaReact, FaJs, FaHtml5, FaCss3Alt, FaPython, FaVuejs, FaAngular,
  FaNodeJs, FaDocker, FaGithub, FaJava, FaMicrosoft, FaAws, FaUsers,
  FaMicrophone, FaStar, FaChartBar, FaPenFancy, FaEdit, FaCode,
  FaBrain, FaEye, FaPalette, FaTools, FaRobot, FaMagic, FaDatabase,
  FaCloud, FaServer, FaLaptopCode, FaGlobe,
} from "react-icons/fa";
import {
  SiTypescript, SiNextdotjs, SiTailwindcss, SiMongodb, SiPostgresql,
  SiGraphql, SiFastapi, SiKubernetes, SiVercel, SiGooglecloud, SiOpenai,
  SiOpencv, SiWordpress, SiFigma, SiAdobexd, SiCanva, SiAdobephotoshop,
  SiD3Dotjs,
} from "react-icons/si";

// Maps exact skill name → icon element used on the public Skills page.
// Add new entries here as you create new skills in the admin dashboard.
const SKILL_ICONS = {
  // Frontend
  "React": <FaReact className="text-blue-400" />,
  "JavaScript": <FaJs className="text-yellow-400" />,
  "TypeScript": <SiTypescript className="text-blue-500" />,
  "HTML5": <FaHtml5 className="text-orange-500" />,
  "CSS3": <FaCss3Alt className="text-blue-500" />,
  "Vue.js": <FaVuejs className="text-green-500" />,
  "Angular": <FaAngular className="text-red-500" />,
  "Next.js": <SiNextdotjs className="text-white" />,
  "Tailwind CSS": <SiTailwindcss className="text-oceanic-500" />,

  // Backend
  "Node.js": <FaNodeJs className="text-green-500" />,
  "Python": <FaPython className="text-blue-400" />,
  "Java": <FaJava className="text-red-500" />,
  "FastAPI": <SiFastapi className="text-green-400" />,
  "GraphQL": <SiGraphql className="text-pink-500" />,
  "MongoDB": <SiMongodb className="text-green-500" />,
  "PostgreSQL": <SiPostgresql className="text-blue-600" />,
  "WordPress": <SiWordpress className="text-blue-600" />,

  // Cloud & DevOps
  "Docker": <FaDocker className="text-blue-500" />,
  "Kubernetes": <SiKubernetes className="text-blue-600" />,
  "Azure": <FaMicrosoft className="text-blue-500" />,
  "Google Cloud": <SiGooglecloud className="text-blue-400" />,
  "AWS": <FaAws className="text-orange-400" />,
  "Vercel": <SiVercel className="text-white" />,
  "Git & GitHub": <FaGithub className="text-white" />,
  "GitHub": <FaGithub className="text-white" />,

  // Design & Tools
  "Figma": <SiFigma className="text-purple-500" />,
  "Adobe XD": <SiAdobexd className="text-pink-500" />,
  "VS Code": <FaCode className="text-blue-500" />,
  "Canva": <SiCanva className="text-oceanic-500" />,
  "Adobe Photoshop": <SiAdobephotoshop className="text-blue-600" />,
  "UI/UX Design": <FaPalette className="text-purple-400" />,

  // AI & Data Science
  "AI Engineering": <FaRobot className="text-violet-400" />,
  "Prompt Engineering": <FaMagic className="text-pink-400" />,
  "OpenAI": <SiOpenai className="text-green-400" />,
  "Machine Learning": <FaBrain className="text-purple-400" />,
  "OpenCV": <SiOpencv className="text-green-500" />,
  "Data Analysis": <FaChartBar className="text-blue-400" />,
  "Computer Vision": <FaEye className="text-oceanic-500" />,
  "D3.js": <SiD3Dotjs className="text-orange-400" />,

  // Leadership & Soft Skills
  "Team Leadership": <FaUsers className="text-blue-400" />,
  "Project Management": <FaTools className="text-green-400" />,
  "Public Speaking": <FaMicrophone className="text-purple-400" />,
  "Mentoring": <FaStar className="text-yellow-400" />,
  "Content Creation": <FaPenFancy className="text-pink-400" />,
  "Technical Writing": <FaEdit className="text-oceanic-500" />,

  // Generic fallbacks for common patterns
  "SQL": <FaDatabase className="text-blue-400" />,
  "Cloud": <FaCloud className="text-blue-400" />,
  "API": <FaServer className="text-green-400" />,
  "Web Development": <FaLaptopCode className="text-oceanic-500" />,
  "Web Design": <FaGlobe className="text-purple-400" />,
};

export const DEFAULT_SKILL_ICON = <FaCode className="text-oceanic-500" />;

export function getSkillIcon(skillName) {
  return SKILL_ICONS[skillName] ?? DEFAULT_SKILL_ICON;
}
