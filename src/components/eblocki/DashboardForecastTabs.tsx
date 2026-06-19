import { type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileCollapse } from "./MobileCollapse";

/**
 * Command-First Dashboard wrapper: collapses every advanced diagnostic into
 * a single Tabs surface (Forecast / Evidence / Audit) so the user sees the
 * Command, Proof CTA, Risk line and latest Verdict above the fold.
 *
 * Presentational only — accepts already-rendered slot nodes. The Dashboard
 * keeps ownership of data fetching and child state.
 */
interface DashboardForecastTabsProps {
  /** Currently selected tab value. Controlled by parent for analytics. */
  value: string;
  onValueChange: (value: string) => void;
  forecastSlot: ReactNode;
  evidenceSlot: ReactNode;
  auditSlot: ReactNode;
}

export function DashboardForecastTabs({
  value,
  onValueChange,
  forecastSlot,
  evidenceSlot,
  auditSlot,
}: DashboardForecastTabsProps) {
  return (
    <section className="space-y-3 min-w-0" aria-labelledby="dashboard-diagnostics-heading">
      <div className="hidden md:flex items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Diagnostics
          </div>
          <h2 id="dashboard-diagnostics-heading" className="text-sm font-semibold mt-0.5">
            Forecast · Evidence · Audit
          </h2>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          one tap to expand
        </span>
      </div>
      <MobileCollapse
        eyebrow="Diagnostics"
        label="Forecast · Evidence · Audit"
        trackId="dashboard_diagnostics"
      >
        <Tabs value={value} onValueChange={onValueChange} className="space-y-3">
          <TabsList className="grid w-full grid-cols-3 h-auto bg-card/60 border border-border p-1">
            <TabsTrigger value="forecast" className="text-xs">Forecast</TabsTrigger>
            <TabsTrigger value="evidence" className="text-xs">Evidence</TabsTrigger>
            <TabsTrigger value="audit" className="text-xs">Audit</TabsTrigger>
          </TabsList>
          <TabsContent value="forecast" className="space-y-3 min-w-0">
            {forecastSlot}
          </TabsContent>
          <TabsContent value="evidence" className="space-y-3 min-w-0">
            {evidenceSlot}
          </TabsContent>
          <TabsContent value="audit" className="space-y-3 min-w-0">
            {auditSlot}
          </TabsContent>
        </Tabs>
      </MobileCollapse>
    </section>
  );
}