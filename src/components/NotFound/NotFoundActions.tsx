import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiHome, FiArrowLeft } from "react-icons/fi";
import { itemVariants, quickLinks } from "./notFoundData";

const NotFoundActions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      {/* Action Buttons */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row gap-4 justify-center mb-10"
      >
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-brand-link text-brand-link dark:border-oceanic-400 dark:text-oceanic-400 font-semibold hover:bg-brand-link hover:text-white dark:hover:bg-oceanic-400 dark:hover:text-brand-dark-1 transition-all duration-300"
        >
          <FiArrowLeft className="text-lg" />
          Go Back
        </button>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-link to-brand-accent-strong text-white font-semibold hover:shadow-lg hover:shadow-oceanic-500/30 transition-all duration-300 hover:-translate-y-0.5"
        >
          <FiHome className="text-lg" />
          Back to Home
        </Link>
      </motion.div>

      {/* Quick Links */}
      <motion.div variants={itemVariants}>
        <p className="text-sm text-[var(--text-accent)] mb-4">Or try one of these pages:</p>
        <div className="flex flex-wrap gap-3 justify-center">
          {quickLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-secondary)] shadow-sm hover:shadow-md text-sm font-medium text-[var(--text-secondary)] hover:text-brand-link dark:hover:text-oceanic-400 transition-all duration-200 border border-[var(--glass-border)]"
            >
              <link.icon className="text-brand-link dark:text-oceanic-400" />
              {link.name}
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Fun fact */}
      <motion.p
        variants={itemVariants}
        className="mt-10 text-xs text-[var(--text-accent)] opacity-60"
      >
        Fun fact: 404 errors are named after room 404 at CERN where the original web servers were
        located.
      </motion.p>
    </>
  );
};

export default React.memo(NotFoundActions);
