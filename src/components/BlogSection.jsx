import React from "react";
import { useBlogData } from "./Blog/useBlogData";
import BlogLoadingState from "./Blog/BlogLoadingState";
import BlogHeader from "./Blog/BlogHeader";
import FeaturedPosts from "./Blog/FeaturedPosts";
import CategoryFilter from "./Blog/CategoryFilter";
import BlogGrid from "./Blog/BlogGrid";
import Pagination from "./Blog/Pagination";

const SECTION_BG =
  "linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-primary) 50%, var(--bg-secondary) 100%)";

const BlogSection = () => {
  const {
    loading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    currentPage,
    setCurrentPage,
    showFilters,
    setShowFilters,
    categories,
    filteredPosts,
    featuredPosts,
    paginatedPosts,
    totalPages,
    handlePostClick,
  } = useBlogData();

  if (loading) return <BlogLoadingState />;

  return (
    <section
      id="blog"
      className="min-h-screen pt-28 pb-20 relative"
      style={{ background: SECTION_BG }}
    >
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <div className="liquid-morph absolute top-60 right-10 w-96 h-96 bg-gradient-to-r from-green-500/8 to-emerald-500/10 blur-3xl" />
        <div className="liquid-morph absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-r from-oceanic-500/6 to-blue-500/8 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <BlogHeader />

        {featuredPosts.length > 0 && currentPage === 1 && !searchQuery && (
          <FeaturedPosts
            featuredPosts={featuredPosts}
            onPostClick={handlePostClick}
          />
        )}

        <CategoryFilter
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          categories={categories}
        />

        {(searchQuery || selectedCategory !== "All") && (
          <p className="text-gray-400 mb-6">
            Found {filteredPosts.length} post
            {filteredPosts.length !== 1 ? "s" : ""}
            {searchQuery && ` for "${searchQuery}"`}
            {selectedCategory !== "All" && ` in ${selectedCategory}`}
          </p>
        )}

        <BlogGrid
          paginatedPosts={paginatedPosts}
          onPostClick={handlePostClick}
          onClearFilters={() => {
            setSearchQuery("");
            setSelectedCategory("All");
          }}
        />
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </section>
  );
};

export default BlogSection;
