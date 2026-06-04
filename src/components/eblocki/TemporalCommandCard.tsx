import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Radar, ArrowRight, ShieldAlert, Sparkles, Crosshair } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { computeTemporal, type TemporalResult } from "@/lib/eblocki/temporal-engine";
import { generateFutureNarrative } from "@/lib/eblocki/future-narrative";
import { TemporalMap } from "./TemporalMap";

export function TemporalCommandCard() {
  const { user } = useAuth();
  const [result, setResult] = useState<TemporalResult | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [{ data: arts }, { data: verds }, { data: led }, { data: modes }, { data: dcs }] = await Promise.all([
        supabase
          .from("proof_artifacts")
          .select("id,domain,quality_score,evidence_strength,transfer_flag,pressure_flag,proof_tier,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("court_verdicts")
          .select("verdict,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("identity_ledger")
          .select("kind,domain,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("user_modes")
          .select("mode_id")
          .eq("user_id", user.id)
          .eq("is_active", true),
        supabase
          .from("daily_control_sheets")
          .select("state")
          .eq("user_id", user.id)
          .order("sheet_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      try {
        const r = computeTemporal({
          artifacts: arts ?? [],
          verdicts: verds ?? [],
          ledger: led ?? [],
          activeDomains: (modes ?? []).map((m: { mode_id: string }) => m.mode_id),
          state: dcs?.state ?? null,
        });
        setResult(r);
      } catch {
        // Engine must never break the dashboard
        setResult(null);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const narrative = useMemo(() => (result ? generateFutureNarrative(result) : null), [result]);

  if (!result) return null;

  if (!result.hasEvidence) {
    return (
      <Card className="panel p-4 border-primary/40 bg-primary/5">
        <div className="flex items-start gap-2">
          <Radar className="h-4 w-4 text-primary mt-0.5" />
          <div className="flex-1">
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Temporal Engine // Standby</div>
            <p className="text-sm mt-1">
              Not enough evidence yet. Submit one proof artifact to activate future modelling.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {narrative?.proofThatChangesPath}
            </p>
          </div>
          <Link to="/proof"><Button size="sm">Submit Proof</Button></Link>
        </div>
      </Card>
    );
  }

  const corrected = result.trajectories.corrected_path;
  return (
    <Card className="panel p-4 md:p-5 border-primary/30">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Radar className="h-4 w-4 text-primary" />
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary m-0">
            Temporal Engine // Future Forecast
          </h2>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase text-muted-foreground">
          <span>Power {result.futurePowerScore}/100</span>
          <span>Drift {Math.round(result.risk.drift)}/100</span>
          <span>Confidence {Math.round(result.confidence.score * 100)}%</span>
        </div>
      </div>

      <p className="text-sm mt-2">{narrative?.bluf}</p>

      <div className="mt-3 grid md:grid-cols-3 gap-3">
        <Cell icon={<Crosshair className="h-3.5 w-3.5 text-primary" />} label="Proof that changes the path">
          {result.intervention.command}
        </Cell>
        <Cell icon={<ShieldAlert className="h-3.5 w-3.5 text-destructive" />} label="Main risk">
          {result.risk.primaryFailureMode.replace(/_/g, " ")} — {narrative?.mainRisk}
        </Cell>
        <Cell icon={<Sparkles className="h-3.5 w-3.5 text-primary" />} label="Main opportunity">
          {corrected.opportunity}
        </Cell>
      </div>

      <div className="mt-4">
        <TemporalMap result={result} />
      </div>

      <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
        <div className="text-[11px] text-muted-foreground">
          {narrative?.uncertaintyWarning}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Hide details" : "Show trajectories"}
          </Button>
          <Link to="/proof"><Button size="sm">Execute Proof <ArrowRight className="h-3 w-3 ml-1" /></Button></Link>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 grid md:grid-cols-2 gap-3">
          {(Object.values(result.trajectories)).map((t) => (
            <div key={t.name} className="rounded-sm border border-border p-3 bg-card/40">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-foreground">
                  {t.label}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  P {Math.round(t.probability * 100)}% · C {Math.round(t.confidence * 100)}%
                </span>
              </div>
              <div className="text-xs mt-1">
                <span className="text-muted-foreground">Outcome:</span> {t.likelyOutcome}
              </div>
              <div className="text-xs mt-1">
                <span className="text-muted-foreground">Proof:</span> {t.proofRequirement}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] font-mono uppercase text-muted-foreground">
                <span>Growth {Math.round(t.vector.growth)}</span>
                <span>Risk {Math.round(t.vector.risk)}</span>
                <span>Identity {Math.round(t.vector.identity)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Cell({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-border p-3 bg-card/40">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 text-sm leading-snug">{children}</p>
    </div>
  );
}