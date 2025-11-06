import {
  FaReact,
  FaJs,
  FaHtml5,
  FaCss3Alt,
  FaPython,
  FaVuejs,
  FaAngular,
  FaNodeJs,
  FaDocker,
  FaGithub,
  FaJava,
  FaMicrosoft,
  FaAws,
  FaUsers,
  FaMicrophone,
  FaStar,
  FaChartBar,
  FaPenFancy,
  FaEdit,
  FaCode,
  FaBrain,
  FaEye,
  FaPalette,
  FaTools,
} from "react-icons/fa";
import {
  SiTypescript,
  SiNextdotjs,
  SiTailwindcss,
  SiMongodb,
  SiPostgresql,
  SiGraphql,
  SiFastapi,
  SiKubernetes,
  SiVercel,
  SiGooglecloud,
  SiOpenai,
  SiOpencv,
  SiWordpress,
  SiFigma,
  SiAdobexd,
  SiCanva,
  SiAdobephotoshop,
} from "react-icons/si";

export const SKILLS_DATA = [
  {
    category: "Frontend Development",
    skills: [
      { name: "React", level: 85, icon: <FaReact className="text-blue-400" /> },
      {
        name: "JavaScript",
        level: 90,
        icon: <FaJs className="text-yellow-400" />,
      },
      {
        name: "TypeScript",
        level: 70,
        icon: <SiTypescript className="text-blue-500" />,
      },
      {
        name: "HTML5",
        level: 95,
        icon: <FaHtml5 className="text-orange-500" />,
      },
      {
        name: "CSS3",
        level: 88,
        icon: <FaCss3Alt className="text-blue-500" />,
      },
      {
        name: "Vue.js",
        level: 70,
        icon: <FaVuejs className="text-green-500" />,
      },
      {
        name: "Angular",
        level: 0,
        icon: <FaAngular className="text-red-500" />,
      },
      {
        name: "Next.js",
        level: 80,
        icon: <SiNextdotjs className="text-white" />,
      },
      {
        name: "Tailwind CSS",
        level: 85,
        icon: <SiTailwindcss className="text-cyan-400" />,
      },
    ],
  },
  {
    category: "Backend Development",
    skills: [
      {
        name: "Node.js",
        level: 30,
        icon: <FaNodeJs className="text-green-500" />,
      },
      {
        name: "Python",
        level: 20,
        icon: <FaPython className="text-blue-400" />,
      },
      { name: "Java", level: 30, icon: <FaJava className="text-red-500" /> },
      {
        name: "FastAPI",
        level: 5,
        icon: <SiFastapi className="text-green-400" />,
      },
      {
        name: "GraphQL",
        level: 0,
        icon: <SiGraphql className="text-pink-500" />,
      },
      {
        name: "MongoDB",
        level: 2,
        icon: <SiMongodb className="text-green-500" />,
      },
      {
        name: "PostgreSQL",
        level: 8,
        icon: <SiPostgresql className="text-blue-600" />,
      },
      {
        name: "WordPress",
        level: 70,
        icon: <SiWordpress className="text-blue-600" />,
      },
    ],
  },
  {
    category: "Cloud & DevOps",
    skills: [
      {
        name: "Docker",
        level: 0,
        icon: <FaDocker className="text-blue-500" />,
      },
      {
        name: "Kubernetes",
        level: 0,
        icon: <SiKubernetes className="text-blue-600" />,
      },
      {
        name: "Azure",
        level: 5,
        icon: <FaMicrosoft className="text-blue-500" />,
      },
      {
        name: "Google Cloud",
        level: 0,
        icon: <SiGooglecloud className="text-blue-400" />,
      },
      { name: "AWS", level: 30, icon: <FaAws className="text-orange-400" /> },
      { name: "Vercel", level: 85, icon: <SiVercel className="text-white" /> },
      {
        name: "Git & GitHub",
        level: 90,
        icon: <FaGithub className="text-white" />,
      },
    ],
  },
  {
    category: "Design & Tools",
    skills: [
      {
        name: "Figma",
        level: 82,
        icon: <SiFigma className="text-purple-500" />,
      },
      {
        name: "Adobe XD",
        level: 20,
        icon: <SiAdobexd className="text-pink-500" />,
      },
      {
        name: "VS Code",
        level: 95,
        icon: <FaCode className="text-blue-500" />,
      },
      { name: "Canva", level: 85, icon: <SiCanva className="text-cyan-400" /> },
      {
        name: "Adobe Photoshop",
        level: 70,
        icon: <SiAdobephotoshop className="text-blue-600" />,
      },
      {
        name: "UI/UX Design",
        level: 78,
        icon: <FaPalette className="text-purple-400" />,
      },
    ],
  },
  {
    category: "AI & Data Science",
    skills: [
      {
        name: "OpenAI",
        level: 20,
        icon: <SiOpenai className="text-green-400" />,
      },
      {
        name: "Machine Learning",
        level: 2,
        icon: <FaBrain className="text-purple-400" />,
      },
      {
        name: "OpenCV",
        level: 0,
        icon: <SiOpencv className="text-green-500" />,
      },
      {
        name: "Data Analysis",
        level: 2,
        icon: <FaChartBar className="text-blue-400" />,
      },
      {
        name: "Computer Vision",
        level: 2,
        icon: <FaEye className="text-cyan-400" />,
      },
      {
        name: "D3.js",
        level: 60,
        icon: <FaChartBar className="text-orange-400" />,
      },
    ],
  },
  {
    category: "Leadership & Soft Skills",
    skills: [
      {
        name: "Team Leadership",
        level: 88,
        icon: <FaUsers className="text-blue-400" />,
      },
      {
        name: "Project Management",
        level: 82,
        icon: <FaTools className="text-green-400" />,
      },
      {
        name: "Public Speaking",
        level: 85,
        icon: <FaMicrophone className="text-purple-400" />,
      },
      {
        name: "Mentoring",
        level: 90,
        icon: <FaStar className="text-yellow-400" />,
      },
      {
        name: "Content Creation",
        level: 90,
        icon: <FaPenFancy className="text-pink-400" />,
      },
      {
        name: "Technical Writing",
        level: 87,
        icon: <FaEdit className="text-cyan-400" />,
      },
    ],
  },
];
