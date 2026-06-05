import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Radar, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import {
  calibrateForecast,
  type TemporalForecastSnapshot,
  type TemporalCalibrationResult,
} from "@/lib/eblocki/temporal-calibration";

interface FeedbackData {
  snapshot: TemporalForecastSnapshot;
  calibration: TemporalCalibrationResult;
  snapshotAt: string;
}

export function TemporalFeedbackPanel() {
  const { user } = useAuth();
  const [data, setData] = useState<FeedbackData | null>(null);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      // Fetch most recent artifact with a temporal snapshot.
      const { data: rows } = await supabase
        .from("proof_artifacts")
        .select("id, created_at, temporal_snapshot")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (cancelled) return;
      const withSnap = (rows ?? []).find(
        (r: any) => r.temporal_snapshot && typeof r.temporal_snapshot === "object",
      );
      if (!withSnap) {
        setEmpty(true);
        return;
      }
      const snapshot = (withSnap as any).temporal_snapshot as TemporalForecastSnapshot;
      const snapshotAt = (withSnap as any).created_at;

      // Pull evidence produced after snapshot.
      const { data: arts } = await supabase
        .from("proof_artifacts")
        .select("id,domain,quality_score,evidence_strength,transfer_flag,pressure_flag,proof_tier,created_at")
        .eq("user_id", user.id)
        .gt("created_at", snapshotAt)
        .order("created_at", { ascending: true })
        .limit(50);

      const { data: verds } = await supabase
        .from("court_verdicts")
        .select("verdict,created_at")
        .eq("user_id", user.id)
        .gt("created_at", snapshotAt)
        .limit(50);

      try {
        const calibration = calibrateForecast(snapshot, {
          windowHours: 24,
          artifactsAfter: arts ?? [],
          verdictsAfter: verds ?? [],
          ledgerAfter: [],
        });
        setData({ snapshot, calibration, snapshotAt });
      } catch {
        setEmpty(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (empty || (!data && user)) {
    return (
      <Card className="panel p-4 border-border">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Temporal Feedback // Standby
          </span>
        </div>
        <p className="text-sm mt-2 text-muted-foreground">
          Temporal feedback activates after your next proof cycle.
        </p>
      </Card>
    );
  }
  if (!data) return null;

  const { snapshot, calibration } = data;
  const verdict = calibration.realityCheck.verdict;
  const icon =
    verdict === "accurate" ? <CheckCircle2 className="h-4 w-4 text-success" /> :
    verdict === "inaccurate" ? <AlertTriangle className="h-4 w-4 text-destructive" /> :
    <Radar className="h-4 w-4 text-primary" />;

  return (
    <Card className="panel p-4 md:p-5 border-primary/20">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary m-0">
            Temporal Feedback // Reality Check
          </h2>
        </div>
        <span className="font-mono text-[10px] uppercase text-muted-foreground">
          Accuracy {calibration.accuracyScore}/100 · {calibration.modelVersion}
        </span>
      </div>

      <p className="text-sm mt-2">{calibration.explanation}</p>

      <div className="mt-3 grid sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <Cell label="Forecast">{snapshot.primaryPath.replace(/_/g, " ")}</Cell>
        <Cell label="Followed">{calibration.forecastFollowed ? "yes" : "no"}</Cell>
        <Cell label="Risk occurred">{String(calibration.riskOccurred)}</Cell>
        <Cell label="Proof improved">{calibration.proofImproved ? "yes" : "no"}</Cell>
      </div>

      <div className="mt-3 text-[11px] text-muted-foreground border-t border-border pt-3">
        <span className="text-foreground">Next observation:</span>{" "}
        {calibration.realityCheck.nextObservationTarget}
      </div>

      {calibration.suggestedWeightAdjustments.length > 0 && (
        <div className="mt-2 text-[11px] text-muted-foreground">
          <span className="text-foreground">Advisory:</span>{" "}
          {calibration.suggestedWeightAdjustments.map((s) => s.reason).join(" · ")}
        </div>
      )}
    </Card>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-border p-2 bg-card/40">
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-sm mt-0.5">{children}</div>
    </div>
  );
}