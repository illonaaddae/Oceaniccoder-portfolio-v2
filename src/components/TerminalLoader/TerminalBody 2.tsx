import React from "react";
import { motion } from "framer-motion";
import {
  FaArrowRight,
  FaCheck,
  FaTriangleExclamation,
  FaCircleInfo,
  FaBolt,
  FaCube,
  FaWandMagicSparkles,
  FaChevronRight,
} from "react-icons/fa6";
import type { IconType } from "react-icons";
import { colors, TerminalLine, TerminalIcon, sequence } from "./terminalTheme";
import TerminalPrompt from "./TerminalPrompt";

interface TerminalBodyProps {
  lines: TerminalLine[];
}

const ICON_MAP: Record<TerminalIcon, IconType> = {
  arrow: FaArrowRight,
  check: FaCheck,
  warn: FaTriangleExclamation,
  info: FaCircleInfo,
  spark: FaWandMagicSparkles,
};

const TerminalBody: React.FC<TerminalBodyProps> = ({ lines }) => (
  <div className="p-6 h-[320px] flex flex-col relative overflow-hidden">
    <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
      {lines.map((line, index) => {
        const Icon = line.icon ? ICON_MAP[line.icon] : null;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm md:text-base font-medium tracking-wide flex items-center"
          >
            {line.type === "cmd" && (
              <>
                <FaChevronRight className="mr-2 shrink-0" style={{ color: colors.pink }} />
                <span style={{ color: colors.cyan }} className="mr-2">
                  ~
                </span>
                <span style={{ color: colors.foreground }}>{line.text}</span>
              </>
            )}
            {line.type !== "cmd" && (
              <span
                style={{ color: line.color, paddingLeft: "1.5rem" }}
                className="flex items-center gap-2"
              >
                {Icon && <Icon className="text-xs shrink-0" />}
                <span>{line.text}</span>
              </span>
            )}
          </motion.div>
        );
      })}

      {/* Active Prompt Line */}
      {lines.length === sequence.length && <TerminalPrompt />}
    </div>

    {/* Starship-style Status Bar / Progress */}
    <div className="mt-4 pt-3 border-t border-[#6272a4]/20 flex justify-between items-center text-xs font-bold">
      <div className="flex gap-3">
        <span className="flex items-center gap-1.5" style={{ color: colors.purple }}>
          <FaBolt className="shrink-0" />
          node v18.x
        </span>
        <span className="flex items-center gap-1.5" style={{ color: colors.orange }}>
          <FaCube className="shrink-0" />
          v2.3.0
        </span>
      </div>
      <div style={{ color: colors.comment }}>{Math.min(lines.length * 15, 100)}%</div>
    </div>
  </div>
);

export default React.memo(TerminalBody);
