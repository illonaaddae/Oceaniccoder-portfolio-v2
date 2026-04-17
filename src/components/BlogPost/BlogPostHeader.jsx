import React from "react";
import { FaCalendarAlt, FaClock, FaTag } from "react-icons/fa";
import { ShareMenu } from "./ShareMenu";
import { formatDate } from "./utils";

/**
 * Blog post header: category badge, title, meta row (date, read-time, share),
 * and tag pills.
 */
const BlogPostHeader = React.memo(({ post }) => (
  <header className="mb-8">
    {/* Category */}
    {post.category && (
      <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm font-medium rounded-full mb-4">
        {post.category}
      </span>
    )}

    {/* Title */}
    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
      {post.title}
    </h1>

    {/* Meta info */}
    <div className="flex flex-wrap items-center gap-4 text-gray-400 mb-6">
      <span className="flex items-center gap-2">
        <FaCalendarAlt className="text-emerald-400" />
        {formatDate(post.publishedAt)}
      </span>
      {post.readTime && (
        <span className="flex items-center gap-2">
          <FaClock className="text-emerald-400" />
          {post.readTime}
        </span>
      )}
      <ShareMenu title={post.title} />
    </div>

    {/* Tags */}
    {post.tags && post.tags.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {post.tags.map((tag) => (
          <span
            key={tag}
            className="px-3 py-1 bg-white/5 text-gray-400 text-sm rounded-full flex items-center gap-1"
          >
            <FaTag className="text-emerald-400 text-xs" /> {tag}
          </span>
        ))}
      </div>
    )}
  </header>
));

BlogPostHeader.displayName = "BlogPostHeader";
export { BlogPostHeader };
