import React from "react";
import { motion } from "framer-motion";
import { colors, TerminalLine, sequence } from "./terminalTheme";
import TerminalPrompt from "./TerminalPrompt";

interface TerminalBodyProps {
  lines: TerminalLine[];
}

const TerminalBody: React.FC<TerminalBodyProps> = ({ lines }) => (
  <div className="p-6 h-[320px] flex flex-col relative overflow-hidden">
    <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
      {lines.map((line, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-sm md:text-base font-medium tracking-wide flex items-center"
        >
          {line.type === "cmd" && (
            <>
              <span className="mr-2 font-bold" style={{ color: colors.pink }}>
                ➜
              </span>
              <span style={{ color: colors.cyan }} className="mr-2">
                ~
              </span>
              <span style={{ color: colors.foreground }}>{line.text}</span>
            </>
          )}
          {line.type !== "cmd" && (
            <span style={{ color: line.color, paddingLeft: "1.5rem" }}>
              {line.text}
            </span>
          )}
        </motion.div>
      ))}

      {/* Active Prompt Line */}
      {lines.length === sequence.length && <TerminalPrompt />}
    </div>

    {/* Starship-style Status Bar / Progress */}
    <div className="mt-4 pt-3 border-t border-[#6272a4]/20 flex justify-between items-center text-xs font-bold">
      <div className="flex gap-3">
        <span style={{ color: colors.purple }}>⚡ node v18.x</span>
        <span style={{ color: colors.orange }}>📦 v2.0.0</span>
      </div>
      <div style={{ color: colors.comment }}>
        {Math.min(lines.length * 15, 100)}%
      </div>
    </div>
  </div>
);

export default React.memo(TerminalBody);
