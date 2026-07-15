import { useMemo, useState, useEffect } from "react";

export interface UsePaginationResult<T> {
  page: number;
  setPage: (p: number) => void;
  pageItems: T[];
  totalItems: number;
  totalPages: number;
  pageSize: number;
}

/**
 * Client-side pagination for a list. Slices `items` into pages of `pageSize`
 * and resets to page 1 whenever the item count changes (e.g. after filtering).
 */
export function usePagination<T>(items: T[], pageSize = 10): UsePaginationResult<T> {
  const [page, setPage] = useState(1);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Keep page in range when the list shrinks / filter changes.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return { page, setPage, pageItems, totalItems, totalPages, pageSize };
}
