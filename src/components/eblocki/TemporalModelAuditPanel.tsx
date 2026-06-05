import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { computeTemporal } from "@/lib/eblocki/temporal-engine";
import { auditTemporalLoop, type TemporalLoopAuditResult } from "@/lib/eblocki/temporal-loop-audit";
import { getTemporalSnapshotSummary, type TemporalSnapshotSummary } from "@/lib/eblocki/temporal-snapshot";
import { logEvent } from "@/lib/eblocki/analytics";
import { Activity, AlertTriangle, ChevronDown, ShieldCheck } from "lucide-react";

function statusTone(status: TemporalLoopAuditResult["status"]): string {
  switch (status) {
    case "operational": return "border-primary/40 text-primary";
    case "degraded": return "border-destructive/40 text-destructive";
    case "partial": return "border-amber-400/40 text-amber-300";
    case "inactive": return "border-border text-muted-foreground";
  }
}

export function TemporalModelAuditPanel() {
  const { user } = useAuth();
  const [audit, setAudit] = useState<TemporalLoopAuditResult | null>(null);
  const [snapshot, setSnapshot] = useState<TemporalSnapshotSummary | null>(null);
  const [modelVersion, setModelVersion] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<string>("low");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [{ data: arts }, { data: verds }, { data: led }, { data: modes }, { data: dcs }] = await Promise.all([
          supabase.from("proof_artifacts")
            .select("id,domain,quality_score,evidence_strength,transfer_flag,pressure_flag,proof_tier,created_at,temporal_snapshot")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(200),
          supabase.from("court_verdicts")
            .select("verdict,created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(200),
          supabase.from("identity_ledger")
            .select("kind,domain,created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(100),
          supabase.from("user_modes")
            .select("mode_id")
            .eq("user_id", user.id)
            .eq("is_active", true),
          supabase.from("daily_control_sheets")
            .select("state")
            .eq("user_id", user.id)
            .order("sheet_date", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);
        if (cancelled) return;

        const forecast = computeTemporal({
          artifacts: arts ?? [],
          verdicts: verds ?? [],
          ledger: led ?? [],
          activeDomains: (modes ?? []).map((mode) => mode.mode_id),
          state: dcs?.state ?? null,
        });
        const result = auditTemporalLoop({
          forecast,
          proofRows: arts ?? [],
          verdicts: verds ?? [],
          dashboardCanShowEmptyState: true,
        });
        const snapshotSummary = getTemporalSnapshotSummary(
          (arts ?? []).find((artifact) => artifact.temporal_snapshot)?.temporal_snapshot ?? null,
        );

        setAudit(result);
        setSnapshot(snapshotSummary);
        setModelVersion(forecast.modelVersion);
        setConfidence(forecast.confidence.band);
        logEvent("temporal_loop_audit_status", {
          loopStatus: result.status,
          modelVersion: forecast.modelVersion,
          confidenceLevel: forecast.confidence.band,
          intelligenceLevel: result.status,
        });
      } catch {
        if (cancelled) return;
        const result = auditTemporalLoop({ dashboardCanShowEmptyState: true });
        setAudit({
          ...result,
          status: "degraded",
          userSafeSummary: "Temporal loop detected missing or invalid snapshot data.",
          developerSafeSummary: `${result.developerSafeSummary}; panel_fetch=failed`,
        });
        setSnapshot(getTemporalSnapshotSummary(null));
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const keyFindings = useMemo(
    () => (audit?.findings ?? []).filter((finding) => !finding.ok).slice(0, 3),
    [audit],
  );

  if (!audit) {
    return (
      <Card className="panel p-4 border-border/80 bg-card/50">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Model Audit</span>
        </div>
      </Card>
    );
  }

  const icon = audit.status === "degraded"
    ? <AlertTriangle className="h-4 w-4 text-destructive" />
    : <ShieldCheck className="h-4 w-4 text-primary" />;

  return (
    <Card className="panel p-4 border-border/80 bg-card/50">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Model Audit</div>
            <div className="mt-0.5 text-sm truncate">{audit.userSafeSummary}</div>
          </div>
        </div>
        <span className={`shrink-0 rounded-sm border px-2 py-1 font-mono text-[9px] uppercase tracking-widest ${statusTone(audit.status)}`}>
          {audit.status}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
        <AuditCell label="Model" value={modelVersion ?? snapshot?.modelVersion ?? "pending"} />
        <AuditCell label="Snapshot" value={snapshot?.valid ? "valid" : snapshot?.exists ? "legacy" : "none"} />
        <AuditCell label="Calibration" value={audit.findings.find((finding) => finding.ability === "calibration_classification")?.ok ? "ready" : "waiting"} />
        <AuditCell label="Confidence" value={confidence} />
        <AuditCell label="Data Quality" value={audit.status === "degraded" ? "check" : "stable"} />
        <AuditCell label="Next Fix" value={audit.nextFix} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
        <div className="text-[11px] text-muted-foreground">
          {keyFindings.length > 0 ? keyFindings.map((finding) => finding.ability.replace(/_/g, " ")).join(" · ") : "No blocking audit findings."}
        </div>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => setExpanded((open) => !open)}>
          Detail <ChevronDown className={`ml-1 h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </Button>
      </div>

      {expanded && (
        <div className="mt-3 rounded-sm border border-border bg-background/40 p-3 text-[11px] text-muted-foreground">
          <div className="font-mono uppercase tracking-widest text-[9px] text-foreground">Developer-safe detail</div>
          <div className="mt-1">{audit.developerSafeSummary}</div>
          {audit.missingPieces.length > 0 && (
            <div className="mt-2">Missing: {audit.missingPieces.join(", ")}</div>
          )}
        </div>
      )}
    </Card>
  );
}

function AuditCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-background/30 p-2 min-w-0">
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-foreground">{value}</div>
    </div>
  );
}
