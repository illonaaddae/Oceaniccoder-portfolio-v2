import React from "react";
import { Link } from "react-router-dom";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

/**
 * Previous / Next post navigation links.
 */
const PostNavigation = React.memo(({ prevPost, nextPost }) => (
  <div className="flex flex-col sm:flex-row gap-4 mb-16">
    {prevPost ? (
      <Link
        to={`/blog/${prevPost.slug || prevPost.$id}`}
        className="flex-1 glass-card p-4 rounded-xl hover:bg-white/5 transition-colors group"
      >
        <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
          <FaChevronLeft /> Previous Post
        </div>
        <h4 className="text-white font-medium group-hover:text-emerald-400 transition-colors line-clamp-1">
          {prevPost.title}
        </h4>
      </Link>
    ) : (
      <div className="flex-1"></div>
    )}

    {nextPost ? (
      <Link
        to={`/blog/${nextPost.slug || nextPost.$id}`}
        className="flex-1 glass-card p-4 rounded-xl hover:bg-white/5 transition-colors group text-right"
      >
        <div className="flex items-center justify-end gap-2 text-gray-400 text-sm mb-2">
          Next Post <FaChevronRight />
        </div>
        <h4 className="text-white font-medium group-hover:text-emerald-400 transition-colors line-clamp-1">
          {nextPost.title}
        </h4>
      </Link>
    ) : (
      <div className="flex-1"></div>
    )}
  </div>
));

PostNavigation.displayName = "PostNavigation";
export { PostNavigation };
