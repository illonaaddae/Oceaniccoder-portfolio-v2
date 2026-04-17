import React from "react";
import { Link } from "react-router-dom";
import { LazyImage } from "../ui/LazyImage";

/**
 * Grid of up to 3 related blog-post cards with thumbnail images.
 */
const RelatedPosts = React.memo(({ posts }) => {
  if (!posts || posts.length === 0) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Related Posts</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((relatedPost) => (
          <Link
            key={relatedPost.$id}
            to={`/blog/${relatedPost.slug || relatedPost.$id}`}
            className="glass-card group overflow-hidden rounded-xl hover:scale-[1.02] transition-all duration-300"
          >
            <div className="relative h-32 overflow-hidden">
              <LazyImage
                src={relatedPost.image}
                alt={relatedPost.title}
                className="w-full h-full group-hover:scale-110 transition-transform duration-500"
                placeholderColor="from-emerald-900/30 to-slate-900"
                displaySize="thumbnail"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            </div>
            <div className="p-4">
              <h3 className="text-white font-medium group-hover:text-emerald-400 transition-colors line-clamp-2">
                {relatedPost.title}
              </h3>
              <p className="text-gray-400 text-sm mt-2">
                {relatedPost.readTime}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
});

RelatedPosts.displayName = "RelatedPosts";
export { RelatedPosts };
