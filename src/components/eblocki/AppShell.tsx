import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { LayoutDashboard, MessageSquare, Gavel, Settings, LogOut, Crosshair, Sparkles, Hexagon, Swords } from "lucide-react";
import { usePushRegistration } from "@/hooks/usePushRegistration";
import { LevelUpListener } from "./LevelUpListener";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/start-today", label: "Start Today", icon: Sparkles },
  { to: "/proof", label: "Proof", icon: Gavel },
  { to: "/coach", label: "Coach", icon: MessageSquare },
  { to: "/gameforge", label: "GameForge", icon: Swords },
  { to: "/operator", label: "Operator", icon: Hexagon },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  usePushRegistration();

  return (
    <div className="min-h-screen-safe flex flex-col md:flex-row w-full max-w-full overflow-x-hidden">
      <aside className="md:w-56 md:min-h-screen border-b md:border-b-0 md:border-r border-border bg-card/40 flex md:flex-col safe-top safe-x md:safe-bottom w-full max-w-full min-w-0">
        <Link to="/dashboard" className="flex items-center gap-2 px-4 py-4 border-b border-border md:w-full native-tap">
          <div className="h-7 w-7 rounded-sm bg-primary flex items-center justify-center text-primary-foreground">
            <Crosshair className="h-4 w-4" />
          </div>
          <span className="font-mono text-sm tracking-[0.2em]">EBLOCKI</span>
        </Link>
        <nav className="flex-1 flex md:flex-col gap-0.5 p-2 overflow-x-auto min-w-0 max-w-full" style={{ WebkitOverflowScrolling: "touch" }}>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-3 py-2 rounded-sm font-mono text-xs uppercase tracking-wider whitespace-nowrap native-tap shrink-0 min-h-[44px]",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )
              }
            >
              <n.icon className="h-3.5 w-3.5" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:block p-3 border-t border-border">
          <div className="text-[10px] font-mono uppercase text-muted-foreground truncate">{user?.email}</div>
          <button
            onClick={async () => { await signOut(); nav("/"); }}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-3 w-3" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden" id="main">{children}</main>
      <LevelUpListener />
    </div>
  );
}
