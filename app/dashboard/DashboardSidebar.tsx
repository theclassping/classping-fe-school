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
} from "lucide-react";
import LogoutButton from "./LogoutButton";

const menuItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  // {
  //   label: "Users",
  //   href: "/dashboard/users",
  //   icon: Users,
  // },
  // {
  //   label: "Schools",
  //   href: "/dashboard/schools",
  //   icon: School,
  // },
  {
    label: "Data Siswa",
    href: "/dashboard/students",
    icon: GraduationCap,
  },
  // {
  //   label: "Teachers",
  //   href: "/dashboard/teachers",
  //   icon: UserRound,
  // },
  // {
  //   label: "Classes",
  //   href: "/dashboard/classes",
  //   icon: BookOpen,
  // },
  {
    label: "Laporan Aktifitas",
    href: "/dashboard/activities",
    icon: ClipboardList,
  },
  {
    label: "Penilaian",
    href: "/dashboard/assessment",
    icon: BarChart3,
  },
  {
    label: "Pembayaran",
    href: "/dashboard/payments",
    icon: CreditCard,
  },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <Link href="/dashboard" className="brand" aria-label="ClassPing home">
        <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
        <span>class<span>ping</span></span>
      </Link>

      <nav className="main-nav admin-nav" aria-label="Main navigation">
        <p className="nav-label">MAIN MENU</p>

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
              className={`nav-item ${active ? "active" : ""}`}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <p className="nav-label">SETTINGS</p>
         <Link
          href="/dashboard/profile"
          className={`nav-item ${pathname.startsWith("/dashboard/profile") ? "active" : ""}`}
        >
          <School aria-hidden="true" />
          <span>Profile Sekolah</span>
        </Link>
        <Link
          href="/dashboard/settings"
          className={`nav-item ${pathname.startsWith("/dashboard/settings") ? "active" : ""}`}
        >
          <Settings aria-hidden="true" />
          <span>Settings</span>
        </Link>
      </nav>

      <div className="help-card">
        <span className="help-icon">?</span>
        <strong>Need help?</strong>
        <p>The ClassPing team is ready to help.</p>
        <button type="button">Contact us</button>
      </div>

      <LogoutButton />
    </aside>
  );
}