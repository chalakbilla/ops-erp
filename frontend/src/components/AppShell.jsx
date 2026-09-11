import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/inventory", label: "Inventory", roles: ["admin", "operations", "sales"] },
  { to: "/work-orders", label: "Work Orders", roles: ["admin", "operations", "sales"] },
  { to: "/transfers", label: "Transfers", roles: ["admin", "operations", "sales"] },
  { to: "/orders", label: "Customer Orders", roles: ["admin", "operations", "sales"] },
];

const ROLE_LABEL = {
  admin: "Admin",
  operations: "Operations",
  sales: "Sales",
};

export default function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <div className="aurora-bg" />

      <aside className="hidden w-64 shrink-0 flex-col gap-8 border-r border-white/10 p-6 md:flex">
        <div>
          <p className="text-lg font-semibold tracking-tight">
            <span className="gradient-text">Meridian</span> ERP
          </p>
          <p className="mt-1 text-xs text-white/45">Operations control center</p>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.filter((item) => item.roles.includes(user?.role)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "glass text-white"
                    : "text-white/55 hover:bg-white/5 hover:text-white/85"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto">
          <div className="glass rounded-2xl p-4">
            <p className="text-sm font-medium">{user?.username}</p>
            <p className="mt-0.5 text-xs text-white/50">{ROLE_LABEL[user?.role] || user?.role}</p>
            <button
              onClick={logout}
              className="mt-3 w-full rounded-lg border border-white/15 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/10 px-6 py-4 md:hidden">
          <p className="font-semibold">
            <span className="gradient-text">Meridian</span> ERP
          </p>
          <button onClick={logout} className="text-xs text-white/60">
            Sign out
          </button>
        </header>

        <nav className="flex gap-2 overflow-x-auto border-b border-white/10 px-4 py-3 md:hidden">
          {NAV_ITEMS.filter((item) => item.roles.includes(user?.role)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${
                  isActive ? "glass" : "text-white/55"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 p-6 md:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
