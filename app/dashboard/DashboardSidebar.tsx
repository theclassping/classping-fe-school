"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  School,
  GraduationCap,
  CreditCard,
  ClipboardList,
  Award,
  Settings,
} from "lucide-react";
import LogoutButton from "./LogoutButton";

type DashboardSidebarProps = {
  open?: boolean;
  onNavigate?: () => void;
};

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
    label: "Laporan Aktivitas",
    href: "/dashboard/activities",
    icon: ClipboardList,
  },
  {
    label: "Penilaian",
    href: "/dashboard/assessment",
    icon: Award,
  },
  {
    label: "Pembayaran",
    href: "/dashboard/payments",
    icon: CreditCard,
  },
];

export default function DashboardSidebar({ open = false, onNavigate }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <Link href="/dashboard" className="brand" aria-label="ClassPing home" onClick={onNavigate}>
        <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
        <span>class<span>ping</span></span>
      </Link>

      <nav className="main-nav admin-nav" aria-label="Main navigation">
        <p className="nav-label">MENU UTAMA</p>

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
              onClick={onNavigate}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <p className="nav-label">PENGATURAN</p>
         <Link
          href="/dashboard/profile"
          className={`nav-item ${pathname.startsWith("/dashboard/profile") ? "active" : ""}`}
          onClick={onNavigate}
        >
          <School aria-hidden="true" />
          <span>Profil Sekolah</span>
        </Link>
        <Link
          href="/dashboard/settings"
          className={`nav-item ${pathname.startsWith("/dashboard/settings") ? "active" : ""}`}
          onClick={onNavigate}
        >
          <Settings aria-hidden="true" />
          <span>Pengaturan</span>
        </Link>
      </nav>

      <div className="help-card">
        <span className="help-icon">?</span>
        <strong>Butuh bantuan?</strong>
        <p>Tim ClassPing siap membantu Anda.</p>
        <button type="button">Hubungi Kami</button>
      </div>

      <LogoutButton />
    </aside>
  );
}
