import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalRecords: number;
  pageSize?: number;
  onPageChange: (newPage: number) => void;
  loading?: boolean;
}

export default function Pagination({
  currentPage,
  totalRecords,
  pageSize = 20,
  onPageChange,
  loading = false,
}: PaginationProps) {
  const totalPages = Math.ceil(totalRecords / pageSize);
  
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div className="flex items-center justify-between border-t border-[var(--border)] pt-4 mt-4">
      <div className="text-sm text-[var(--text-secondary)] font-mono-id">
        {loading ? (
          <span className="animate-pulse">Loading...</span>
        ) : (
          <>
            {startRecord}–{endRecord} of {totalRecords}
          </>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || loading}
          className="p-1.5 rounded hover:bg-[var(--sidebar-secondary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[var(--text-primary)]"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || loading || totalRecords === 0}
          className="p-1.5 rounded hover:bg-[var(--sidebar-secondary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[var(--text-primary)]"
          aria-label="Next page"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
