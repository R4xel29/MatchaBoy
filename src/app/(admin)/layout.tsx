import { ReactNode } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#F8F9FB]">
      <AdminSidebar />

      {/* Main Content */}
      <main className="lg:pl-[260px] pt-14 lg:pt-0 min-h-dvh">
        <div className="max-w-[1200px] mx-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
