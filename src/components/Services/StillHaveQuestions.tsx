import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FaHeadset, FaEnvelope } from "react-icons/fa";

const StillHaveQuestions: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: 0.3 }}
    className="mt-12 text-center glass-card border border-[var(--glass-border)] rounded-2xl p-8"
  >
    <FaHeadset className="text-4xl text-oceanic-500 mx-auto mb-4" />
    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
      Still Have Questions?
    </h3>
    <p className="text-[var(--text-secondary)] mb-4">
      I&apos;m here to help! Feel free to reach out and let&apos;s discuss your
      project.
    </p>
    <Link
      to="/contact"
      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-oceanic-500 to-oceanic-900 text-white font-semibold rounded-xl hover:scale-105 transition-transform shadow-lg"
    >
      <FaEnvelope /> Get in Touch
    </Link>
  </motion.div>
);

export default React.memo(StillHaveQuestions);
