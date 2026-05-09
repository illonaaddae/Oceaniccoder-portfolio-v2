import React from "react";

const BlogHeader = React.memo(() => (
  <div className="text-center mb-12">
    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
      <span className="text-gray-700 dark:text-gray-100">Blog & </span>
      <span className="text-oceanic-600 dark:text-oceanic-500 font-bold">
        Insights
      </span>
    </h1>
    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
      Thoughts on development, leadership, community building, and my journey in
      tech.
    </p>
  </div>
));

BlogHeader.displayName = "BlogHeader";
export default BlogHeader;
