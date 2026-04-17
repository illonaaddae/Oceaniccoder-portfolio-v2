import React from "react";
import { motion } from "framer-motion";
import { FaCheck } from "react-icons/fa";

const indicators = [
  "100% Satisfaction Guarantee",
  "Fast Communication",
  "Quality Code Standards",
  "On-Time Delivery",
];

const TrustIndicators: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay: 0.2 }}
    className="mt-20 text-center"
  >
    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 text-[var(--text-accent)]">
      {indicators.map((text) => (
        <div key={text} className="flex items-center gap-2">
          <FaCheck className="text-emerald-500" />
          <span>{text}</span>
        </div>
      ))}
    </div>
  </motion.div>
);

export default React.memo(TrustIndicators);
