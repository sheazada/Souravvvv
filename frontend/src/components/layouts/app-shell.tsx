"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/navigation/sidebar";
import { Topbar } from "@/components/navigation/topbar";
import { NAVIGATION_BY_AREA } from "@/config/navigation";

export function AppShell({
  area,
  title,
  children,
}: {
  area: "admin" | "portal" | "staff";
  title: string;
  children: React.ReactNode;
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="relative flex min-h-screen bg-slate-100 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.10),transparent_32rem)] dark:bg-slate-950">
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
            if (typeof window !== "undefined" && window.innerWidth < 1024) {
              setIsMobileOpen(!isMobileOpen);
            } else {
              setIsCollapsed(!isCollapsed);
            }
          }}
          onOpenMobileSidebar={() => setIsMobileOpen(true)}
          isCollapsed={isCollapsed}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto w-full max-w-[1500px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
