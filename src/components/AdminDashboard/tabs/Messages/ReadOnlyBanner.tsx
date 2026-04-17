import React from "react";
import { FaLock } from "react-icons/fa";

interface ReadOnlyBannerProps {
  theme: "light" | "dark";
}

export const ReadOnlyBanner: React.FC<ReadOnlyBannerProps> = ({ theme }) => (
  <div
    className={`rounded-xl p-4 border ${
      theme === "dark"
        ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
        : "bg-amber-50 border-amber-200 text-amber-800"
    }`}
  >
    <p className="text-sm font-medium flex items-center gap-2">
      <FaLock className="w-4 h-4 flex-shrink-0" />
      Message content is protected for privacy. Contact the portfolio owner
      directly if you'd like to discuss opportunities.
    </p>
  </div>
);
