import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { haptics } from "@/hooks/useHaptics";
import { STUDENT_NAV, isStudentNavActive } from "./app-navigation";

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = navRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const publish = () => {
      if (el.offsetHeight > 0)
        document.documentElement.style.setProperty(
          "--app-nav-h",
          `${el.offsetHeight}px`,
        );
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      ref={navRef}
      aria-label="Primary mobile navigation"
      className="mobile-dock fixed inset-x-0 bottom-0 z-40 border-t border-border safe-bottom safe-x md:hidden"
    >
      <ul className="grid grid-cols-5">
        {STUDENT_NAV.map((item) => {
          const active = isStudentNavActive(item.paths, pathname);
          return (
            <li key={item.to} className="min-w-0">
              <Link
                to={item.to}
                aria-current={active ? "page" : undefined}
                onClick={() => haptics.select()}
                className={cn("student-tab", active && "is-active")}
              >
                <span className="student-tab-icon">
                  <item.icon className="h-5 w-5" />
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
