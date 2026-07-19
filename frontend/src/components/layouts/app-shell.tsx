'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/navigation/sidebar';
import { Topbar } from '@/components/navigation/topbar';
import { NAVIGATION_BY_AREA } from '@/config/navigation';

export function AppShell({
  area,
  title,
  children,
}: {
  area: 'admin' | 'portal' | 'staff';
  title: string;
  children: React.ReactNode;
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 flex relative">
      <Sidebar
        title={title}
        items={NAVIGATION_BY_AREA[area]}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />
      <div className="flex min-h-screen flex-1 flex-col min-w-0 overflow-hidden">
        <Topbar
          title={title}
          area={area}
          onToggleSidebar={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              setIsMobileOpen(!isMobileOpen);
            } else {
              setIsCollapsed(!isCollapsed);
            }
          }}
          onOpenMobileSidebar={() => setIsMobileOpen(true)}
          isCollapsed={isCollapsed}
        />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
