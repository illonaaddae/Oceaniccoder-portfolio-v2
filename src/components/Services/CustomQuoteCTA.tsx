import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FaEnvelope } from "react-icons/fa";

const CustomQuoteCTA: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: 0.3 }}
    className="mt-12 text-center"
  >
    <div className="inline-block glass-card border border-[var(--glass-border)] rounded-2xl p-8 max-w-2xl">
      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
        Need Something Custom?
      </h3>
      <p className="text-[var(--text-secondary)] mb-4">
        Every project is unique. Let&apos;s discuss your specific requirements
        and create a tailored solution.
      </p>
      <Link
        to="/contact"
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-oceanic-500 to-oceanic-900 text-white font-semibold rounded-xl hover:scale-105 transition-transform shadow-lg"
      >
        <FaEnvelope /> Request Custom Quote
      </Link>
    </div>
  </motion.div>
);

export default React.memo(CustomQuoteCTA);
