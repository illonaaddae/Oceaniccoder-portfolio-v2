import React from "react";
import { FaSearch, FaTimes, FaFilter } from "react-icons/fa";

const CategoryFilter = React.memo(
  ({
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    showFilters,
    setShowFilters,
    categories,
  }) => (
    <div className="glass-card p-4 mb-8 rounded-xl">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-oceanic-400/50 transition-all"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <FaTimes />
            </button>
          )}
        </div>
        <div className="hidden md:flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedCategory === cat
                  ? "bg-oceanic-500 text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              style={
                selectedCategory !== cat
                  ? { background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }
                  : undefined
              }
            >
              {cat}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="md:hidden flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[var(--text-primary)]"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
        >
          <FaFilter />
          Filter by Category
        </button>
      </div>
      {showFilters && (
        <div
          className="md:hidden flex gap-2 flex-wrap mt-4 pt-4"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setShowFilters(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === cat
                  ? "bg-oceanic-500 text-white"
                  : "text-[var(--text-secondary)]"
              }`}
              style={selectedCategory !== cat ? { background: "var(--bg-secondary)" } : undefined}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  ),
);

CategoryFilter.displayName = "CategoryFilter";
export default CategoryFilter;
