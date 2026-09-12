import { useEffect, useRef, useState } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Gavel,
  MessageSquare,
  MoreHorizontal,
  Hexagon,
  Swords,
  Layers,
  Settings,
  Sparkles,
  LogOut,
  Hammer,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { haptics } from "@/hooks/useHaptics";

const PRIMARY = [
  { to: "/dashboard", label: "Today", icon: LayoutDashboard },
  { to: "/proof", label: "Log", icon: Gavel },
  { to: "/coach", label: "GM", icon: MessageSquare },
] as const;

const SECONDARY = [
  { to: "/operator", label: "Character", icon: Hexagon },
  { to: "/gameforge", label: "Arena", icon: Swords },
  { to: "/start-today", label: "Quests", icon: Sparkles },
  { to: "/systems", label: "Intel", icon: Hammer },
  { to: "/modes", label: "Areas", icon: Layers },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

/**
 * Mobile-only fixed bottom navigation. Renders nothing on md+ screens.
 * Presentational only — uses react-router NavLink for active state and a
 * shadcn Sheet for the secondary "More" drawer. No engine, data, or auth
 * logic lives here beyond calling the existing useAuth().signOut().
 */
export function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const nav = useNavigate();
  const { user, signOut } = useAuth();
  const navRef = useRef<HTMLElement | null>(null);

  // Publish measured nav height so pages can clear it via .pb-nav-safe without
  // hard-coding magic numbers. Only mounts on mobile (component returns null
  // above md in practice via the md:hidden class on the <nav>).
  useEffect(() => {
    const el = navRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const publish = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) document.documentElement.style.setProperty("--app-nav-h", `${Math.round(h)}px`);
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const moreActive = SECONDARY.some((item) => location.pathname.startsWith(item.to));

  return (
    <nav
      ref={navRef}
      aria-label="Primary mobile navigation"
      className="operator-chrome mobile-dock md:hidden fixed bottom-0 inset-x-0 z-40 border-t safe-bottom safe-x"
    >
      <ul className="grid grid-cols-4">
        {PRIMARY.map((item) => (
          <li key={item.to} className="min-w-0">
            <NavLink
              to={item.to}
              end={item.to === "/dashboard"}
              onClick={() => haptics.select()}
              className={({ isActive }) =>
                cn(
                  "operator-interactive flex flex-col items-center justify-center gap-0.5 min-h-[58px] px-1 py-1.5 text-[10px] font-medium",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "relative flex h-7 w-11 items-center justify-center rounded-xl motion-micro",
                      isActive && "bg-white/[0.08] border border-white/[0.1]",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {isActive && (
                      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-primary motion-entrance" />
                    )}
                  </span>
                  <span className="truncate max-w-full">{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
        <li className="min-w-0">
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open more navigation"
                className={cn(
                  "operator-interactive flex flex-col items-center justify-center gap-0.5 min-h-[58px] w-full px-1 py-1.5 text-[10px] font-medium",
                  moreActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-11 items-center justify-center rounded-xl",
                    moreActive && "bg-white/[0.08] border border-white/[0.1]",
                  )}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </span>
                <span className="truncate max-w-full">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="safe-bottom max-h-[80vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground text-left">
                  More
                </SheetTitle>
              </SheetHeader>
              <ul className="mt-4 grid grid-cols-1 gap-1.5">
                {SECONDARY.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "operator-interactive flex items-center gap-3 border border-border bg-background/40 px-3 py-3 min-h-[48px] text-sm",
                        location.pathname.startsWith(item.to)
                          ? "border-primary/40 text-primary"
                          : "text-foreground hover:border-primary/30",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-border pt-3">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground truncate">
                  {user?.email}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setMoreOpen(false);
                    await signOut();
                    nav("/");
                  }}
                  className="operator-interactive operator-hit mt-2 inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
