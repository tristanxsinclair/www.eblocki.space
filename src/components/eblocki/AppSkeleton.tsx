import { Skeleton } from "@/components/ui/skeleton";

/**
 * Full-page loading skeleton that matches the AppShell layout.
 * Used in the Protected wrapper to avoid a jarring "Loading…" flash.
 * Background matches Capacitor splash (#0a0e14) for seamless transition.
 */
export function AppSkeleton() {
  return (
    <div className="min-h-screen-safe flex flex-col bg-background">
      {/* Mobile brand bar skeleton */}
      <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border safe-top safe-x">
        <Skeleton className="h-6 w-24" />
      </div>

      {/* Content area */}
      <div className="flex-1 p-4 md:p-6 space-y-4">
        {/* Page title */}
        <Skeleton className="h-5 w-40" />

        {/* Primary card */}
        <div className="rounded-md border border-border bg-card/40 p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Secondary cards grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-card/40 p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="rounded-md border border-border bg-card/40 p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>

        {/* List items */}
        <div className="space-y-2">
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
      </div>

      {/* Bottom nav skeleton */}
      <div className="md:hidden fixed bottom-0 inset-x-0 border-t border-border bg-card/95 safe-bottom">
        <div className="grid grid-cols-4 py-3 px-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Skeleton className="h-5 w-5 rounded-sm" />
              <Skeleton className="h-2 w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
