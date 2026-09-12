import { useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { LayoutDashboard, MessageSquare, Gavel, Settings, LogOut, Sparkles, Hexagon, Swords, Hammer } from "lucide-react";
import { usePushRegistration } from "@/hooks/usePushRegistration";
import { LevelUpListener } from "./LevelUpListener";
import { MobileBottomNav } from "./MobileBottomNav";
import { EblockiLogo } from "./EblockiLogo";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

const NAV = [
  { to: "/dashboard", label: "Today", icon: LayoutDashboard },
  { to: "/proof", label: "Log Action", icon: Gavel },
  { to: "/start-today", label: "Quests", icon: Sparkles },
  { to: "/coach", label: "Game Master", icon: MessageSquare },
  { to: "/gameforge", label: "Arena", icon: Swords },
  { to: "/operator", label: "Character", icon: Hexagon },
  { to: "/systems", label: "Intel", icon: Hammer },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  usePushRegistration();
  const mobileTopRef = useRef<HTMLDivElement | null>(null);

  // Publish the combined mobile top-bar (banner + brand header) height as
  // --app-header-h so pages that opt into .pt-header-safe stay clear of the
  // status bar and any test-mode banner. Desktop is unaffected — the desktop
  // sidebar layout does not consume this var.
  useEffect(() => {
    const el = mobileTopRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const publish = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) document.documentElement.style.setProperty("--app-header-h", `${Math.round(h)}px`);
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="app-frame min-h-[100dvh] min-h-screen-safe flex flex-col md:flex-row w-full max-w-full overflow-x-hidden">
      {/* Mobile top: test-mode banner + sticky brand bar. Owns --app-header-h. */}
      <div
        ref={mobileTopRef}
        className="operator-chrome mobile-app-chrome md:hidden sticky top-0 z-30 w-full max-w-full"
      >
        <PaymentTestModeBanner />
        <header className="flex min-h-14 items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-2 safe-top safe-x w-full max-w-full">
          <Link to="/dashboard" className="operator-interactive operator-hit flex items-center gap-2 min-w-0">
            <EblockiLogo variant="compact" size="sm" />
          </Link>
        </header>
      </div>

      {/* Desktop / tablet sidebar */}
      <aside className="operator-chrome mission-sidebar hidden md:flex md:w-[264px] md:min-h-screen border-r md:flex-col md:sticky md:top-0 md:h-screen safe-x md:safe-bottom max-w-full min-w-0">
        <Link to="/dashboard" className="operator-interactive flex min-h-[76px] items-center gap-2.5 border-b border-white/[0.06] px-6 py-4 md:w-full">
          <EblockiLogo variant="compact" size="md" />
        </Link>
        <nav className="flex-1 flex md:flex-col gap-1.5 p-4 min-w-0 max-w-full overflow-y-auto">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  "operator-interactive mission-nav-link flex items-center gap-3 px-3.5 py-2 text-[12px] font-medium whitespace-nowrap shrink-0 min-h-[46px]",
                  isActive
                    ? "is-active bg-white/[0.07] text-foreground ring-1 ring-white/[0.09]"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
                )
              }
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:flex md:flex-col gap-2 p-5 border-t border-white/[0.06] bg-black/10">
          <div className="text-[11px] font-medium text-muted-foreground truncate">{user?.email}</div>
          <button
            onClick={async () => { await signOut(); nav("/"); }}
            className="operator-interactive operator-hit inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden pb-nav-safe md:pb-0" id="main">{children}</main>
      <MobileBottomNav />
      <LevelUpListener />
    </div>
  );
}
