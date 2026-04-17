import React from "react";
import { motion } from "framer-motion";
import { itemVariants } from "./notFoundData";

const NotFoundContent: React.FC = () => (
  <motion.div variants={itemVariants} className="space-y-4 mb-8">
    <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
      Oops! Lost in the Digital Ocean
    </h2>
    <p className="text-[var(--text-accent)] text-lg max-w-md mx-auto">
      The page you&apos;re looking for has drifted away or doesn&apos;t exist.
      Let&apos;s navigate you back to familiar waters.
    </p>
  </motion.div>
);

export default React.memo(NotFoundContent);
