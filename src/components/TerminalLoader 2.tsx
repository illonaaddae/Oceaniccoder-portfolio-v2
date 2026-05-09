import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { colors } from "./TerminalLoader/terminalTheme";
import { useTerminalAnimation } from "./TerminalLoader/useTerminalAnimation";
import TerminalHeader from "./TerminalLoader/TerminalHeader";
import TerminalBody from "./TerminalLoader/TerminalBody";

const TerminalLoader: React.FC = () => {
  const { lines, loading } = useTerminalAnimation();

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center backdrop-blur-md"
          style={{ zIndex: 9999, backgroundColor: "rgba(40, 42, 54, 0.95)" }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          {/* Terminal Window */}
          <div
            className="w-[90%] max-w-xl overflow-hidden rounded-lg shadow-2xl relative"
            style={{
              backgroundColor: colors.background,
              fontFamily: "'JetBrains Mono', monospace",
              boxShadow: `0 20px 60px -10px rgba(0,0,0,0.5), 0 0 0 1px ${colors.currentLine}`,
            }}
          >
            <TerminalHeader />
            <TerminalBody lines={lines} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TerminalLoader;
