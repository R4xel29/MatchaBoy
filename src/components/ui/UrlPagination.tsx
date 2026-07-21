'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Pagination } from './Pagination';

interface UrlPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  className?: string;
}

export function UrlPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  className = '',
}: UrlPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      pageSize={pageSize}
      onPageChange={handlePageChange}
      className={className}
    />
  );
}
