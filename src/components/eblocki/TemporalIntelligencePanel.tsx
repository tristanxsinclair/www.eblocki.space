import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { computeTemporal } from "@/lib/eblocki/temporal-engine";
import {
  calibrateForecast,
  type TemporalCalibrationResult,
} from "@/lib/eblocki/temporal-calibration";
import {
  summariseInterventionMemory,
  recordFromCalibration,
} from "@/lib/eblocki/intervention-memory";
import {
  computeTemporalIntelligenceScore,
  type TemporalIntelligenceScore,
} from "@/lib/eblocki/temporal-intelligence-score";
import { normaliseTemporalSnapshot, type TemporalSnapshotPayload } from "@/lib/eblocki/temporal-snapshot";
import {
  buildTemporalCalibrationHistory,
  type TemporalCalibrationHistorySummary,
} from "@/lib/eblocki/temporal-calibration-history";

export function TemporalIntelligencePanel() {
  const { user } = useAuth();
  const [score, setScore] = useState<TemporalIntelligenceScore | null>(null);
  const [history, setHistory] = useState<TemporalCalibrationHistorySummary | null>(null);
  const [reliability, setReliability] = useState<number>(0);
  const [evaluations, setEvaluations] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [{ data: arts }, { data: verds }, { data: led }, { data: modes }] = await Promise.all([
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
      ]);
      if (cancelled) return;

      try {
        const proofRows = arts ?? [];
        const result = computeTemporal({
          artifacts: proofRows,
          verdicts: verds ?? [],
          ledger: led ?? [],
          activeDomains: (modes ?? []).map((mode) => mode.mode_id),
        });

        const calibrations: TemporalCalibrationResult[] = [];
        const records: ReturnType<typeof recordFromCalibration>[] = [];
        const snapshots = proofRows
          .map((row) => ({ row, snapshot: normaliseTemporalSnapshot(row.temporal_snapshot) }))
          .filter((entry): entry is { row: typeof proofRows[number]; snapshot: TemporalSnapshotPayload } => entry.snapshot !== null)
          .slice(0, 10);
        for (const { row, snapshot } of snapshots) {
          const after = proofRows.filter(
            (candidate) => new Date(candidate.created_at).getTime() > new Date(row.created_at).getTime(),
          );
          const verdictsAfter = (verds ?? []).filter(
            (verdict) => new Date(verdict.created_at).getTime() > new Date(row.created_at).getTime(),
          );
          try {
            const cal = calibrateForecast(snapshot, {
              windowHours: 24,
              artifactsAfter: after,
              verdictsAfter,
              ledgerAfter: [],
            });
            calibrations.push(cal);
            records.push(recordFromCalibration(snapshot.artifactRequired, snapshot.domain, cal));
          } catch {
            // skip invalid calibration pairs
          }
        }

        const memory = summariseInterventionMemory(records);
        const tis = computeTemporalIntelligenceScore({ result, calibrations, memory });
        setScore(tis);
        setHistory(buildTemporalCalibrationHistory(proofRows, verds ?? []));
        setReliability(memory.interventionReliabilityScore);
        setEvaluations(memory.totalEvaluations);
      } catch {
        setScore(null);
        setHistory(null);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const items = useMemo(() => {
    if (!score) return [];
    return Object.entries(score.components).map(([k, v]) => ({ k, v: Math.round(v) }));
  }, [score]);

  if (!score) return null;

  return (
    <Card className="panel p-4 md:p-5 border-primary/20">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary m-0">
            Temporal Intelligence // System Calibration
          </h2>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase text-muted-foreground">
          <span>{score.modelVersion}</span>
          <span>Reliability {reliability}%</span>
          <span>{evaluations} eval</span>
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-3">
        <span className="font-mono text-3xl text-primary">{score.score}</span>
        <span className="text-xs text-muted-foreground">/100 · {score.level.replace(/_/g, " ")}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
        {items.map((it) => (
          <div key={it.k} className="rounded-sm border border-border p-2 bg-card/40">
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              {it.k.replace(/([A-Z])/g, " $1")}
            </div>
            <div className="text-sm mt-0.5">{it.v}/100</div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid md:grid-cols-2 gap-3 text-xs">
        <div className="rounded-sm border border-border p-2 bg-card/40">
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Calibration history</div>
          <div className="text-sm mt-0.5">{history?.summary ?? "Calibration history is forming."}</div>
        </div>
        <div className="rounded-sm border border-border p-2 bg-card/40">
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Next observation target</div>
          <div className="text-sm mt-0.5">{score.nextObservationTarget}</div>
        </div>
      </div>
    </Card>
  );
}
