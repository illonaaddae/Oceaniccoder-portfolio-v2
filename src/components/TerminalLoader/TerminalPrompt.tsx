import React from "react";
import { motion } from "framer-motion";
import { colors } from "./terminalTheme";

const TerminalPrompt: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.2 }}
    className="flex items-center text-sm md:text-base pt-2"
  >
    <span className="mr-2 font-bold" style={{ color: colors.pink }}>
      ➜
    </span>
    <span style={{ color: colors.cyan }} className="mr-2">
      ~
    </span>
    <motion.div
      animate={{ opacity: [0, 1, 0] }}
      transition={{ repeat: Infinity, duration: 0.8 }}
      className="w-2.5 h-5 ml-1"
      style={{ backgroundColor: colors.foreground }}
    />
  </motion.div>
);

export default React.memo(TerminalPrompt);
