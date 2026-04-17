import React from "react";

const CategoryFilter = React.memo(
  ({ filters, activeFilter, onFilterClick }) => (
    <div className="flex flex-wrap justify-center gap-4 mb-12">
      {filters.map((filter) => (
        <button
          key={filter}
          onClick={() => onFilterClick(filter)}
          className={`glass-btn px-6 py-3 font-medium transition-all duration-300 ${
            activeFilter === filter
              ? "proj-filter-active scale-105 shadow-lg shadow-oceanic-500/30"
              : "proj-filter-inactive hover:scale-105"
          }`}
        >
          {filter}
        </button>
      ))}
    </div>
  ),
);

CategoryFilter.displayName = "CategoryFilter";

export default CategoryFilter;
