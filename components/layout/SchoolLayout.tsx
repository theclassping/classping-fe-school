import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <Sidebar />

      <div className="page">
        <Topbar />

        <main id="main">
          {children}
        </main>
      </div>
    </div>
  );
}