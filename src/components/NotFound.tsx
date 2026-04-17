import React from "react";
import { motion } from "framer-motion";
import { containerVariants } from "./NotFound/notFoundData";
import NotFoundAnimation from "./NotFound/NotFoundAnimation";
import NotFoundContent from "./NotFound/NotFoundContent";
import NotFoundActions from "./NotFound/NotFoundActions";

const NotFound: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-[var(--bg-primary)]">
    <motion.div
      className="max-w-2xl w-full text-center"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <NotFoundAnimation />
      <NotFoundContent />
      <NotFoundActions />
    </motion.div>
  </div>
);

export default NotFound;
