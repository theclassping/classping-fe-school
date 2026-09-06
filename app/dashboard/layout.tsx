import { ReactNode } from "react";
import DashboardChrome from "./components/DashboardChrome";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return <DashboardChrome>{children}</DashboardChrome>;
}
