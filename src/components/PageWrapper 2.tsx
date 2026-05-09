import React from "react";
import { motion } from "framer-motion";

const pageVariant = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

interface PageWrapperProps {
  children: React.ReactNode;
}

const PageWrapper: React.FC<PageWrapperProps> = ({ children }) => (
  <motion.div
    variants={pageVariant}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={{ duration: 0.35 }}
  >
    {children}
  </motion.div>
);

export default PageWrapper;
