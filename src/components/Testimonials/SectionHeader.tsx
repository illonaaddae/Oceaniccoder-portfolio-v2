import React from "react";

interface SectionHeaderProps {
  subtitle: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = React.memo(
  ({ subtitle }) => (
    <div className="text-center mb-16">
      <h2 className="text-5xl md:text-6xl font-bold mb-6">
        <span className="text-oceanic-600 dark:text-oceanic-500">Testimonials</span>
      </h2>
      <p className="text-xl leading-relaxed max-w-3xl mx-auto text-[var(--text-secondary)]">
        {subtitle}
      </p>
    </div>
  ),
);

SectionHeader.displayName = "SectionHeader";

export default SectionHeader;
