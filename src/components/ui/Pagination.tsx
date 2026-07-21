'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1 && !totalItems) return null;

  const startItem = pageSize && totalItems ? Math.min((currentPage - 1) * pageSize + 1, totalItems) : 0;
  const endItem = pageSize && totalItems ? Math.min(currentPage * pageSize, totalItems) : 0;

  // Generate page numbers array with smart truncation
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 px-1 ${className}`}>
      {/* Items count info */}
      <div className="text-xs text-muted-foreground font-medium text-center sm:text-left">
        {totalItems !== undefined && pageSize !== undefined ? (
          totalItems > 0 ? (
            <span>
              Menampilkan <span className="font-semibold text-foreground">{startItem}</span> -{' '}
              <span className="font-semibold text-foreground">{endItem}</span> dari{' '}
              <span className="font-semibold text-foreground">{totalItems}</span> data
            </span>
          ) : (
            <span>0 data</span>
          )
        ) : (
          <span>
            Halaman <span className="font-semibold text-foreground">{currentPage}</span> dari{' '}
            <span className="font-semibold text-foreground">{totalPages}</span>
          </span>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          {/* Prev Button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {pageNumbers.map((page, idx) => {
              if (page === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-muted-foreground select-none">
                    ...
                  </span>
                );
              }

              const isCurrent = page === currentPage;
              return (
                <button
                  key={`page-${page}`}
                  onClick={() => onPageChange(page as number)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                    isCurrent
                      ? 'bg-brand-600 text-white shadow-sm font-bold'
                      : 'border border-border bg-card text-foreground hover:bg-muted'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          {/* Next Button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
            title="Halaman Selanjutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
