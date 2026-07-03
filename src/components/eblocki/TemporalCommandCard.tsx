import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Radar, ArrowRight, ShieldAlert, Sparkles, Crosshair } from "lucide-react";
import { type TemporalResult } from "@/lib/eblocki/temporal-engine";
import { generateFutureNarrative } from "@/lib/eblocki/future-narrative";
import { TemporalMap } from "./TemporalMap";
import { buildTemporalProofUrl } from "@/lib/eblocki/temporal-proof-link";
import {
  buildTemporalEvidenceExplanation,
  type TemporalEvidenceExplanation,
} from "@/lib/eblocki/temporal-evidence-explanation";

export interface TemporalCommandCardProps {
  result: TemporalResult | null;
}

export function TemporalCommandCard({ result }: TemporalCommandCardProps) {
  const [expanded, setExpanded] = useState(false);

  const narrative = useMemo(() => (result ? generateFutureNarrative(result) : null), [result]);
  const evidenceExplanation = useMemo(
    () => (result ? buildTemporalEvidenceExplanation(result) : null),
    [result],
  );

  const forecastProofUrl = useMemo(() => {
    if (!result) return "/proof";
    return buildTemporalProofUrl({
      domain: result.intervention.domain,
      proof: result.intervention.artifactRequired || result.intervention.command,
      reason: result.risk.primaryFailureMode,
      timebox: result.intervention.timeboxMinutes
        ? `${Math.max(1, Math.round(result.intervention.timeboxMinutes / 60))}h`
        : "24h",
    });
  }, [result]);

  if (!result) return null;

  if (!result.hasEvidence) {
    return (
      <Card className="panel min-w-0 p-4 border-primary/40 bg-primary/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <Radar className="h-4 w-4 shrink-0 text-primary sm:mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Temporal Engine // Standby</div>
            <p className="mt-1 break-words text-sm">
              Not enough evidence yet. Submit one proof artifact to activate future modelling.
            </p>
            <p className="mt-1 break-words text-xs text-muted-foreground">
              {narrative?.proofThatChangesPath}
            </p>
          </div>
          <Link className="shrink-0" to={forecastProofUrl}>
            <Button size="sm">Submit Proof</Button>
          </Link>
        </div>
        {evidenceExplanation && (
          <EvidenceDisclosureGrid explanation={evidenceExplanation} />
        )}
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

      {evidenceExplanation && (
        <EvidenceDisclosureGrid explanation={evidenceExplanation} />
      )}

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
          <Link to={forecastProofUrl}>
            <Button size="sm">Submit proof that changes this path <ArrowRight className="h-3 w-3 ml-1" /></Button>
          </Link>
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

function EvidenceDisclosureGrid({
  explanation,
}: {
  explanation: TemporalEvidenceExplanation;
}) {
  return (
    <div className="mt-3 grid min-w-0 gap-2 md:grid-cols-2">
      <details className="min-w-0 rounded-sm border border-border bg-card/40 p-3">
        <summary className="cursor-pointer break-words font-mono text-[9px] uppercase tracking-widest text-foreground">
          Why this forecast exists
        </summary>
        <div className="mt-2 min-w-0 space-y-2 break-words text-xs text-muted-foreground">
          <p className="text-foreground">{explanation.primaryForecastClaim}</p>
          <ul className="space-y-1">
            {explanation.supportingEvidence.slice(0, 3).map((statement) => (
              <li key={statement}>• {statement}</li>
            ))}
          </ul>
          <p>{explanation.uncertaintyStatement}</p>
        </div>
      </details>

      <details className="min-w-0 rounded-sm border border-border bg-card/40 p-3">
        <summary className="cursor-pointer break-words font-mono text-[9px] uppercase tracking-widest text-foreground">
          What would prove it wrong
        </summary>
        <div className="mt-2 min-w-0 space-y-2 break-words text-xs text-muted-foreground">
          <p className="text-foreground">{explanation.disconfirmingProof}</p>
          {explanation.proofChangingCommand !== explanation.disconfirmingProof && (
            <p>
              <span className="font-medium text-foreground">Proof-changing command:</span>{" "}
              {explanation.proofChangingCommand}
            </p>
          )}
        </div>
      </details>
    </div>
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