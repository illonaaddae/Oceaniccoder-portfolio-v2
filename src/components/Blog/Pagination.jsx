import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const Pagination = React.memo(({ currentPage, totalPages, setCurrentPage }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        className="p-3 glass-card rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        style={{ color: "var(--text-primary)" }}
      >
        <FaChevronLeft />
      </button>
      <div className="flex gap-2">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`w-10 h-10 rounded-lg font-medium transition-all ${
              currentPage === page ? "bg-oceanic-500 text-white" : "glass-card"
            }`}
            style={currentPage !== page ? { color: "var(--text-secondary)" } : undefined}
          >
            {page}
          </button>
        ))}
      </div>
      <button
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        className="p-3 glass-card rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        style={{ color: "var(--text-primary)" }}
      >
        <FaChevronRight />
      </button>
    </div>
  );
});

Pagination.displayName = "Pagination";
export default Pagination;
