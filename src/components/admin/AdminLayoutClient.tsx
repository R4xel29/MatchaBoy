'use client';

import { ReactNode, useState, useEffect } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminIncomingOrderAlarm } from './AdminIncomingOrderAlarm';
import { AdminAIAssistantWidget } from './AdminAIAssistantWidget';

export function AdminLayoutClient({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('admin_sidebar_collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="min-h-dvh bg-[#F8F9FB] flex flex-col">
      <AdminSidebar isCollapsed={isCollapsed} onToggleCollapse={toggleCollapsed} />
      <AdminIncomingOrderAlarm />

      {/* Main Content */}
      <main
        className={`pt-14 lg:pt-0 min-h-dvh transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[260px]'
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
      <AdminAIAssistantWidget />
    </div>
  );
}
