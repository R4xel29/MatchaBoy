import { ReactNode } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted/30 flex">
      {/* Sidebar Navigation */}
      <AdminSidebar />

      {/* Main Content Area — padding for desktop sidebar + mobile header */}
      <main className="flex-1 lg:pl-64 pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
