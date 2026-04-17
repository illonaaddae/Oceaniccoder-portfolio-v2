import React from "react";
import { FaBookOpen } from "react-icons/fa";
import BlogCard from "./BlogCard";

const BlogGrid = React.memo(
  ({ paginatedPosts, onPostClick, onClearFilters }) => {
    if (paginatedPosts.length === 0) {
      return (
        <div className="text-center py-16">
          <FaBookOpen className="text-6xl text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No posts found</h3>
          <p className="text-gray-400 mb-6">
            Try adjusting your search or filter criteria
          </p>
          <button
            onClick={onClearFilters}
            className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      );
    }

    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {paginatedPosts.map((post) => (
          <BlogCard key={post.$id} post={post} onClick={onPostClick} />
        ))}
      </div>
    );
  },
);

BlogGrid.displayName = "BlogGrid";
export default BlogGrid;
