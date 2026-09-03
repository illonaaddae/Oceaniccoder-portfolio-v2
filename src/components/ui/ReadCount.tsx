import React from "react";
import { FaEye } from "react-icons/fa";
import { formatCount, pluralize } from "@/utils/formatCount";

interface ReadCountProps {
  readers: number;
  reads?: number;
  /** Number only (for a card's meta row) instead of "142 readers". */
  compact?: boolean;
  className?: string;
  iconClassName?: string;
}

/**
 * Readership for a post: unique readers up front, total reads in the tooltip.
 * Readers is the headline number because it answers "how many people read
 * this", which a refresh-inflated view count does not.
 */
export const ReadCount: React.FC<ReadCountProps> = ({
  readers,
  reads,
  compact = false,
  className = "",
  iconClassName = "text-brand-link dark:text-oceanic-400",
}) => {
  const totalReads = reads ?? readers;
  const title =
    `${readers.toLocaleString()} ${pluralize(readers, "reader")}` +
    (totalReads > readers ? ` · ${totalReads.toLocaleString()} total reads` : "");

  return (
    <span className={`flex items-center gap-1 ${className}`} title={title}>
      <FaEye className={iconClassName} aria-hidden="true" />
      <span>
        {formatCount(readers)}
        {!compact && ` ${pluralize(readers, "reader")}`}
      </span>
    </span>
  );
};

export default ReadCount;
