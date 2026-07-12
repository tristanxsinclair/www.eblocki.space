import { useLocation } from "react-router-dom";
import { useRef, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight CSS-based page transition wrapper.
 * Fades content in on route change using the existing motion-entrance animation.
 * No external animation library needed.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const prevKey = useRef(location.pathname);

  useEffect(() => {
    if (prevKey.current !== location.pathname && ref.current) {
      ref.current.classList.remove("page-enter");
      // Force reflow to restart animation
      void ref.current.offsetWidth;
      ref.current.classList.add("page-enter");
      prevKey.current = location.pathname;
    }
  }, [location.pathname]);

  return (
    <div ref={ref} className={cn("page-enter w-full min-h-0")}>
      {children}
    </div>
  );
}
