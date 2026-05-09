import React from "react";

const SectionHeader = React.memo(() => (
  <div className="text-center mb-16">
    <h2 className="text-5xl md:text-6xl font-bold mb-6">
      <span className="text-gray-700 dark:text-gray-100">Featured </span>
      <span className="text-oceanic-600 dark:text-oceanic-500 font-bold">
        Projects
      </span>
    </h2>
    <p className="text-xl leading-relaxed max-w-3xl mx-auto text-gray-700 dark:text-gray-300">
      A showcase of my technical expertise and creative problem-solving
      abilities
    </p>
  </div>
));

SectionHeader.displayName = "SectionHeader";

export default SectionHeader;
