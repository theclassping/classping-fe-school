"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  School,
  GraduationCap,
  UserRound,
  BookOpen,
  CreditCard,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import LogoutButton from "./LogoutButton";

const menuItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Users",
    href: "/dashboard/users",
    icon: Users,
  },
  {
    label: "Schools",
    href: "/dashboard/schools",
    icon: School,
  },
  {
    label: "Students",
    href: "/dashboard/students",
    icon: GraduationCap,
  },
  {
    label: "Teachers",
    href: "/dashboard/teachers",
    icon: UserRound,
  },
  {
    label: "Classes",
    href: "/dashboard/classes",
    icon: BookOpen,
  },
  {
    label: "Payments",
    href: "/dashboard/payments",
    icon: CreditCard,
  },
  {
    label: "Activities",
    href: "/dashboard/activities",
    icon: ClipboardList,
  },
  {
    label: "Assessment",
    href: "/dashboard/assessment",
    icon: BarChart3,
  },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-logo">
        <div className="dashboard-logo-mark">C</div>

        <div>
          <strong>ClassPing</strong>
          <small>School CMS</small>
        </div>
      </div>

      <nav className="dashboard-nav">
        <div className="dashboard-nav-section">

          {menuItems.map((item) => {
            const Icon = item.icon;

            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`dashboard-nav-item ${
                  active ? "active" : ""
                }`}
              >
                <Icon size={17} strokeWidth={1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="dashboard-sidebar-bottom">
        <Link
          href="/dashboard/settings"
          className={`dashboard-nav-item ${
            pathname.startsWith("/dashboard/settings")
              ? "active"
              : ""
          }`}
        >
          <Settings size={17} strokeWidth={1.8} />
          <span>Settings</span>
        </Link>

        <div className="dashboard-logout">
          <LogOut size={17} strokeWidth={1.8} />
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}