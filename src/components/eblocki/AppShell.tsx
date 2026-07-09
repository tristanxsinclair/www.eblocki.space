import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { LayoutDashboard, MessageSquare, Gavel, Settings, LogOut, Sparkles, Hexagon, Swords, Hammer } from "lucide-react";
import { usePushRegistration } from "@/hooks/usePushRegistration";
import { LevelUpListener } from "./LevelUpListener";
import { MobileBottomNav } from "./MobileBottomNav";
import { EblockiLogo } from "./EblockiLogo";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/start-today", label: "Start Today", icon: Sparkles },
  { to: "/proof", label: "Proof", icon: Gavel },
  { to: "/systems", label: "Systems", icon: Hammer },
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
      {/* Mobile brand bar */}
      <header className="md:hidden flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card/40 safe-top safe-x w-full max-w-full">
        <Link to="/dashboard" className="flex items-center gap-2 native-tap min-w-0">
          <EblockiLogo variant="compact" size="sm" />
        </Link>
      </header>

      {/* Desktop / tablet sidebar */}
      <aside className="hidden md:flex md:w-60 md:min-h-screen border-r border-border bg-card/60 backdrop-blur-sm md:flex-col md:sticky md:top-0 md:h-screen safe-x md:safe-bottom max-w-full min-w-0">
        <Link to="/dashboard" className="flex items-center gap-2.5 px-5 py-5 border-b border-border md:w-full native-tap">
          <EblockiLogo variant="compact" size="md" />
        </Link>
        <nav className="flex-1 flex md:flex-col gap-1 p-3 min-w-0 max-w-full overflow-y-auto">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-[0.16em] whitespace-nowrap native-tap shrink-0 min-h-[40px] motion-hover",
                  isActive
                    ? "bg-primary/12 text-primary ring-1 ring-primary/25 shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.15)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )
              }
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:flex md:flex-col gap-2 p-4 border-t border-border bg-background/40">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground truncate">{user?.email}</div>
          <button
            onClick={async () => { await signOut(); nav("/"); }}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-destructive motion-hover"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden pb-24 md:pb-0" id="main">{children}</main>
      <MobileBottomNav />
      <LevelUpListener />
    </div>
  );
}
