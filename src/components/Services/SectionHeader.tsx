import React from "react";
import { motion } from "framer-motion";

const SectionHeader: React.FC = () => (
  <div className="text-center mb-16">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
        <span className="text-gray-700 dark:text-gray-100">My </span>
        <span className="text-oceanic-600 dark:text-oceanic-500 font-bold">
          Services
        </span>
      </h2>
      <p className="text-lg md:text-xl leading-relaxed max-w-3xl mx-auto text-[var(--text-secondary)]">
        Professional web development services tailored to your needs. From
        simple landing pages to complex web applications.
      </p>
    </motion.div>
  </div>
);

export default React.memo(SectionHeader);
