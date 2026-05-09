import React from "react";
import { colors } from "./terminalTheme";

const TerminalHeader: React.FC = () => (
  <div className="flex items-center px-4 py-3 bg-[#21222c] border-b border-[#6272a4]/30">
    <div className="flex gap-2">
      <div className="w-3 h-3 rounded-full bg-[#ff5555]" />
      <div className="w-3 h-3 rounded-full bg-[#f1fa8c]" />
      <div className="w-3 h-3 rounded-full bg-[#50fa7b]" />
    </div>
    <div
      className="flex-1 text-center text-xs opacity-60 font-semibold"
      style={{ color: colors.foreground }}
    >
      illona — -zsh — 80x24
    </div>
    <div className="w-12"></div>
  </div>
);

export default React.memo(TerminalHeader);
