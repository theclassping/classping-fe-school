import { ReactNode } from "react";
import DashboardSidebar from "./DashboardSidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="dashboard-shell">
      <DashboardSidebar />

      <div className="dashboard-main">
        {children}
      </div>
    </div>
  );
}