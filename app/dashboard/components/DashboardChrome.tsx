"use client";

import { ReactNode, useState } from "react";
import DashboardSidebar from "../DashboardSidebar";
import SchoolHeader from "./SchoolHeader";

export default function DashboardChrome({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <DashboardSidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      {sidebarOpen && <button className="sidebar-scrim" type="button" aria-label="Tutup menu" onClick={() => setSidebarOpen(false)} />}
      <div className="page">
        <SchoolHeader onMenuClick={() => setSidebarOpen((open) => !open)} />
        {children}
      </div>
    </div>
  );
}
