import React from "react";

const SECTION_BG =
  "linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-primary) 50%, var(--bg-secondary) 100%)";

const BlogLoadingState = React.memo(() => (
  <section
    className="min-h-screen pt-28 pb-20 flex items-center justify-center"
    style={{ background: SECTION_BG }}
  >
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-oceanic-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-400">Loading blog posts...</p>
    </div>
  </section>
));

BlogLoadingState.displayName = "BlogLoadingState";
export default BlogLoadingState;
