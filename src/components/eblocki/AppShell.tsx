import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookOpen, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePushRegistration } from "@/hooks/usePushRegistration";
import { cn } from "@/lib/utils";
import { MobileBottomNav } from "./MobileBottomNav";
import { EblockiLogo } from "./EblockiLogo";
import { STUDENT_NAV, isStudentNavActive } from "./app-navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  usePushRegistration();
  const mobileTopRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = mobileTopRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const publish = () => {
      if (el.offsetHeight > 0)
        document.documentElement.style.setProperty(
          "--app-header-h",
          `${el.offsetHeight}px`,
        );
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="app-frame student-app flex min-h-screen-safe w-full flex-col md:flex-row">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-background focus:p-3"
      >
        Skip to content
      </a>
      <div
        ref={mobileTopRef}
        className="mobile-app-chrome sticky top-0 z-30 md:hidden"
      >
        <header className="student-mobile-header">
          <Link
            to="/dashboard"
            aria-label="Eblocki Today"
            className="flex min-h-11 items-center"
          >
            <EblockiLogo variant="compact" size="md" />
          </Link>
          <Link
            to="/settings"
            aria-label="Settings"
            title="Settings"
            className="student-icon-button"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </header>
      </div>
      <aside className="student-sidebar sticky top-0 hidden h-dvh w-[224px] shrink-0 flex-col border-r border-border md:flex">
        <Link
          to="/dashboard"
          className="flex h-24 items-center px-7"
          aria-label="Eblocki Today"
        >
          <EblockiLogo variant="compact" size="lg" />
        </Link>
        <nav
          className="flex-1 space-y-1 px-3 py-3"
          aria-label="Primary navigation"
        >
          {STUDENT_NAV.map((item) => {
            const active = isStudentNavActive(item.paths, pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn("student-nav-link", active && "is-active")}
              >
                <item.icon className="h-[18px] w-[18px]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-border p-3">
          <Link to="/modes" className="student-nav-link">
            <BookOpen className="h-[18px] w-[18px]" />
            Study areas
          </Link>
          <Link to="/settings" className="student-nav-link">
            <Settings className="h-[18px] w-[18px]" />
            Settings
          </Link>
          <p className="truncate px-3 py-4 text-xs text-muted-foreground">
            {user?.email}
          </p>
        </div>
      </aside>
      <main
        className="min-w-0 flex-1 pb-nav-safe md:pb-0"
        id="main"
        tabIndex={-1}
      >
        {children}
      </main>
      <MobileBottomNav />
    </div>
  );
}
