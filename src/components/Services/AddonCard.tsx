import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";
import type { AddonService } from "./servicesData";

interface AddonCardProps {
  addon: AddonService;
  index: number;
}

const AddonCard: React.FC<AddonCardProps> = ({ addon, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: index * 0.05 }}
    className="glass-card border border-[var(--glass-border)] rounded-2xl p-6 hover:border-oceanic-500/50 transition-all duration-300 hover:scale-[1.02]"
  >
    <h4 className="text-lg font-bold text-[var(--text-primary)] mb-2">
      {addon.name}
    </h4>
    <p className="text-sm text-[var(--text-secondary)] mb-4 min-h-[48px]">
      {addon.description}
    </p>
    <div className="mt-4">
      <Link
        to="/contact"
        className="text-sm text-oceanic-600 dark:text-oceanic-500 hover:text-oceanic-700 dark:hover:text-oceanic-400 transition-colors flex items-center gap-1 font-semibold"
      >
        Get Started <FaArrowRight className="text-xs" />
      </Link>
    </div>
  </motion.div>
);

export default React.memo(AddonCard);
