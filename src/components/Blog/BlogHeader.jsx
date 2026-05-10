import React from "react";

const BlogHeader = React.memo(() => (
  <div className="text-center mb-12">
    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
      <span className="text-[var(--text-primary)]">Blog & </span>
      <span className="text-oceanic-600 dark:text-oceanic-500 font-bold">Insights</span>
    </h1>
    <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto">
      Thoughts on development, leadership, community building, and my journey in tech.
    </p>
  </div>
));

BlogHeader.displayName = "BlogHeader";
export default BlogHeader;
