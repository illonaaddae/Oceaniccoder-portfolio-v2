import React from "react";
import { FaCalendarAlt, FaClock, FaTag, FaArrowRight } from "react-icons/fa";
import { LazyImage } from "../ui/LazyImage";
import { formatDate } from "./blogConstants";

const BlogCard = React.memo(({ post, onClick }) => (
  <article
    onClick={() => onClick(post)}
    className="glass-card group cursor-pointer overflow-hidden rounded-xl transition-shadow duration-300 hover:shadow-lg hover:shadow-emerald-500/20 flex flex-col"
  >
    <div className="relative h-44 overflow-hidden">
      <LazyImage
        src={post.image}
        alt={post.title}
        className="w-full h-full group-hover:scale-105 transition-transform duration-500"
        placeholderColor="from-emerald-900/50 to-slate-900"
        displaySize="card"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      {post.category && (
        <span className="absolute top-3 left-3 px-2 py-1 bg-emerald-500/80 text-white text-xs font-medium rounded">
          {post.category}
        </span>
      )}
    </div>
    <div className="p-5 flex-1 flex flex-col">
      <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
        <span className="flex items-center gap-1">
          <FaCalendarAlt className="text-emerald-400" />
          {formatDate(post.publishedAt)}
        </span>
        {post.readTime && (
          <span className="flex items-center gap-1">
            <FaClock className="text-emerald-400" />
            {post.readTime}
          </span>
        )}
      </div>
      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors line-clamp-2">
        {post.title}
      </h3>
      <p className="text-gray-400 text-sm line-clamp-3 mb-4 flex-1">
        {post.excerpt}
      </p>
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-white/5 text-gray-400 text-xs rounded flex items-center gap-1"
            >
              <FaTag className="text-emerald-400" />
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center text-oceanic-500 text-sm font-medium group-hover:gap-3 transition-all gap-2 mt-auto">
        Read Article <FaArrowRight />
      </div>
    </div>
  </article>
));

BlogCard.displayName = "BlogCard";
export default BlogCard;
