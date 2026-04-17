import { FiHome, FiArrowLeft, FiMail, FiCode } from "react-icons/fi";

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
} as const;

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export const waveVariants = {
  animate: {
    y: [0, -15, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
};

export const quickLinks = [
  { name: "Home", path: "/", icon: FiHome },
  { name: "Projects", path: "/projects", icon: FiCode },
  { name: "About", path: "/about", icon: FiArrowLeft },
  { name: "Contact", path: "/contact", icon: FiMail },
];
