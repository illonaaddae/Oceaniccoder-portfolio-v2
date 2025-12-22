import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiHome, FiArrowLeft, FiMail, FiCode } from "react-icons/fi";

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  const waveVariants = {
    animate: {
      y: [0, -15, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  const quickLinks = [
    { name: "Home", path: "/", icon: FiHome },
    { name: "Projects", path: "/projects", icon: FiCode },
    { name: "About", path: "/about", icon: FiArrowLeft },
    { name: "Contact", path: "/contact", icon: FiMail },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-[var(--bg-primary)]">
      <motion.div
        className="max-w-2xl w-full text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Animated 404 with Ocean Theme */}
        <motion.div className="relative mb-8" variants={itemVariants}>
          {/* Ocean waves decoration */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <motion.div
              className="text-[200px] font-black text-oceanic-500 select-none"
              variants={waveVariants}
              animate="animate"
            >
              ~
            </motion.div>
          </div>

          {/* Main 404 text */}
          <motion.h1
            className="text-[120px] sm:text-[150px] font-black bg-gradient-to-r from-oceanic-500 via-oceanic-400 to-brand-ocean-2 bg-clip-text text-transparent leading-none"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
          >
            404
          </motion.h1>
        </motion.div>

        {/* Message */}
        <motion.div variants={itemVariants} className="space-y-4 mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Oops! Lost in the Digital Ocean
          </h2>
          <p className="text-[var(--text-accent)] text-lg max-w-md mx-auto">
            The page you're looking for has drifted away or doesn't exist. Let's
            navigate you back to familiar waters.
          </p>
        </motion.div>

        {/* Ocean-themed illustration */}
        <motion.div
          variants={itemVariants}
          className="mb-10 flex justify-center"
        >
          <div className="relative">
            <motion.div
              className="text-6xl"
              animate={{
                rotate: [0, 10, -10, 0],
                y: [0, -5, 5, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              🚀
            </motion.div>
            <motion.div
              className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-2xl"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              〰️
            </motion.div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-10"
        >
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-oceanic-500 text-oceanic-500 font-semibold hover:bg-oceanic-500 hover:text-white transition-all duration-300"
          >
            <FiArrowLeft className="text-lg" />
            Go Back
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-oceanic-500 to-oceanic-400 text-white font-semibold hover:shadow-lg hover:shadow-oceanic-500/30 transition-all duration-300 hover:-translate-y-0.5"
          >
            <FiHome className="text-lg" />
            Back to Home
          </Link>
        </motion.div>

        {/* Quick Links */}
        <motion.div variants={itemVariants}>
          <p className="text-sm text-[var(--text-accent)] mb-4">
            Or try one of these pages:
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {quickLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-secondary)] shadow-sm hover:shadow-md text-sm font-medium text-[var(--text-secondary)] hover:text-oceanic-500 transition-all duration-200 border border-[var(--glass-border)]"
              >
                <link.icon className="text-oceanic-500" />
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
          Fun fact: 404 errors are named after room 404 at CERN where the
          original web servers were located! 🌐
        </motion.p>
      </motion.div>
    </div>
  );
};

export default NotFound;
