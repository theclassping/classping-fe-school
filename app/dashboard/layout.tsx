import { ReactNode } from "react";
import { Bell, ChevronDown } from "lucide-react";
import DashboardSidebar from "./DashboardSidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="app-shell">
      <DashboardSidebar />

      <div className="page">
        <header className="topbar">
          <div className="topbar-school">
            <span className="school-avatar">TK</span>
            <div>
              <strong>TK Harapan Bangsa</strong>
              <small>Tahun Ajaran 2026/2027</small>
            </div>
          </div>

          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Notifications">
              <Bell aria-hidden="true" />
              <span />
            </button>
            <div className="profile">
              <span className="profile-avatar">AS</span>
              <div>
                <strong>Andini Sari</strong>
                <small>Administrator</small>
              </div>
              <ChevronDown aria-hidden="true" />
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}