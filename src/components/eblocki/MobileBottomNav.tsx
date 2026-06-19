import { useState } from "react";
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
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";

const PRIMARY = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/proof", label: "Proof", icon: Gavel },
  { to: "/coach", label: "Coach", icon: MessageSquare },
] as const;

const SECONDARY = [
  { to: "/operator", label: "Operator", icon: Hexagon },
  { to: "/gameforge", label: "GameForge", icon: Swords },
  { to: "/modes", label: "Modes", icon: Layers },
  { to: "/start-today", label: "Start Today", icon: Sparkles },
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

  const moreActive = SECONDARY.some((item) => location.pathname.startsWith(item.to));

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 safe-bottom safe-x"
    >
      <ul className="grid grid-cols-4">
        {PRIMARY.map((item) => (
          <li key={item.to} className="min-w-0">
            <NavLink
              to={item.to}
              end={item.to === "/dashboard"}
              className={({ isActive }) =>
                cn(
                  "native-tap flex flex-col items-center justify-center gap-0.5 min-h-[56px] px-1 py-1.5 text-[10px] font-mono uppercase tracking-widest",
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
                      "flex h-6 w-10 items-center justify-center rounded-sm",
                      isActive && "bg-primary/10 border border-primary/30",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
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
                  "native-tap flex flex-col items-center justify-center gap-0.5 min-h-[56px] w-full px-1 py-1.5 text-[10px] font-mono uppercase tracking-widest",
                  moreActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-10 items-center justify-center rounded-sm",
                    moreActive && "bg-primary/10 border border-primary/30",
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
                        "native-tap flex items-center gap-3 rounded-sm border border-border bg-background/40 px-3 py-3 min-h-[48px] text-sm",
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
                  className="native-tap mt-2 inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-destructive min-h-[44px]"
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