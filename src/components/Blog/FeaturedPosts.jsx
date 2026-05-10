import React from "react";
import { FaBookOpen, FaCalendarAlt, FaClock, FaArrowRight } from "react-icons/fa";
import { LazyImage } from "../ui/LazyImage";
import { formatDate } from "./blogConstants";

const FeaturedPosts = React.memo(({ featuredPosts, onPostClick }) => {
  if (featuredPosts.length === 0) return null;

  return (
    <div className="mb-16">
      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-3">
        <FaBookOpen className="text-oceanic-400" />
        Featured Posts
      </h2>
      <div className="grid md:grid-cols-2 gap-6">
        {featuredPosts.slice(0, 2).map((post) => (
          <article
            key={post.$id}
            onClick={() => onPostClick(post)}
            className="glass-card group cursor-pointer overflow-hidden rounded-2xl transition-shadow duration-300 hover:shadow-lg hover:shadow-oceanic-500/20"
          >
            <div className="relative h-48 md:h-56 overflow-hidden">
              <LazyImage
                src={post.image}
                alt={post.title}
                className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                placeholderColor="from-oceanic-900/50 to-slate-900"
                displaySize="card"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 bg-oceanic-500/90 text-white text-xs font-semibold rounded-full">
                  Featured
                </span>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)] mb-3">
                <span className="flex items-center gap-1">
                  <FaCalendarAlt className="text-oceanic-400" />
                  {formatDate(post.publishedAt)}
                </span>
                <span className="flex items-center gap-1">
                  <FaClock className="text-oceanic-400" />
                  {post.readTime}
                </span>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 group-hover:text-oceanic-500 transition-colors">
                {post.title}
              </h3>
              <p className="text-[var(--text-secondary)] line-clamp-2 mb-4">{post.excerpt}</p>
              <div className="flex items-center justify-between">
                <span className="text-oceanic-400 text-sm font-medium">{post.category}</span>
                <span className="text-oceanic-500 flex items-center gap-2 text-sm font-medium group-hover:gap-3 transition-all">
                  Read More <FaArrowRight />
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
});

FeaturedPosts.displayName = "FeaturedPosts";
export default FeaturedPosts;
