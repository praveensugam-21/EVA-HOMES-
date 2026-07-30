import { useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/dashboard/Sidebar";

const MODE_STORAGE_KEY = "eva_dashboard_mode";

/**
 * Shared shell for every buyer/seller dashboard page: top Navbar, a left
 * Sidebar (buyer or seller nav depending on `mode`), and a content area.
 * Pages should render inside this instead of building their own layout,
 * so navigation stays in one neatly organized place.
 *
 * Buyer/seller-specific pages should pass an explicit `mode` — doing so
 * also remembers it as the "last active dashboard mode". Shared pages
 * (Notifications, Profile, Settings) can omit `mode` entirely and this
 * layout falls back to whichever mode was last active, so the sidebar
 * stays contextually correct without every shared page needing to know.
 */
export default function DashboardLayout({ mode: explicitMode, title, subtitle, actions, children }) {
  const [mode] = useState(() => {
    if (explicitMode) {
      localStorage.setItem(MODE_STORAGE_KEY, explicitMode);
      return explicitMode;
    }
    return localStorage.getItem(MODE_STORAGE_KEY) || "buyer";
  });

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar />
      <div className="pt-16 flex">
        <Sidebar mode={mode} />
        <main className="flex-1 min-w-0 px-6 py-8 lg:px-10">
          <div className="max-w-5xl mx-auto space-y-6">
            {(title || actions) && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  {title && <h1 className="text-2xl font-bold tracking-tight text-zinc-950">{title}</h1>}
                  {subtitle && <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>}
                </div>
                {actions && <div className="flex items-center gap-3">{actions}</div>}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
