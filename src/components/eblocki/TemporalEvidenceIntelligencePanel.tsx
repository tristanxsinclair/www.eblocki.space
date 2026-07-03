import { Link } from "react-router-dom";
import { ArrowRight, GitBranch, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MobileCollapse } from "@/components/eblocki/MobileCollapse";
import type {
  CounterfactualPath,
  TemporalForecast,
} from "@/lib/eblocki/temporal-evidence-intelligence";

type Props = {
  forecast: TemporalForecast;
  className?: string;
};

const PATH_LABELS: Record<CounterfactualPath["path"], string> = {
  current: "Current path",
  corrected: "Corrected path",
  decay: "Decay path",
  escalation: "Escalation path",
};

function readable(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function confidencePercent(value: number): string {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  return Math.round(safeValue * 100) + "%";
}

function listValue(values: string[], fallback = "None recorded"): string {
  return values.length ? values.join(", ") : fallback;
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-sm border border-border bg-background/30 p-2.5">
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 break-words text-sm text-foreground [overflow-wrap:anywhere]">
        {value}
      </div>
    </div>
  );
}

function PathCard({ path }: { path: CounterfactualPath }) {
  return (
    <article className="min-w-0 rounded-sm border border-border bg-background/30 p-3">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h4 className="min-w-0 break-words text-sm font-semibold">
          {PATH_LABELS[path.path]}
        </h4>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {confidencePercent(path.confidence)}
        </span>
      </div>
      <p className="mt-2 break-words text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
        {path.summary}
      </p>
      <p className="mt-2 break-words border-t border-border pt-2 text-xs text-muted-foreground [overflow-wrap:anywhere]">
        <span className="text-foreground">Evidence:</span>{" "}
        {path.evidence[0] ?? "Available evidence does not support a stronger claim yet."}
      </p>
    </article>
  );
}

export function TemporalEvidenceIntelligencePanel({ forecast, className }: Props) {
  const paths = [
    forecast.currentPath,
    forecast.correctedPath,
    forecast.decayPath,
    forecast.escalationPath,
  ];
  const snapshot = forecast.evidenceSnapshot;
  const firstDisconfirming = forecast.disconfirmingProof[0] ?? null;
  const insufficientEvidence = forecast.calibrationStatus === "insufficient_evidence";
  const evidenceMessage = snapshot.dataQuality === "empty"
    ? "No proof history yet. Submit one measurable artifact to activate Temporal Evidence."
    : "Early forecast. Confidence is limited until more proof exists.";

  return (
    <Card
      className={[
        "panel min-w-0 max-w-full overflow-hidden border-primary/25 bg-card/60 p-4 md:p-5",
        "mobile-safe-card",
        className,
      ].filter(Boolean).join(" ")}
      aria-labelledby="temporal-evidence-heading"
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <Radar className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <h2 id="temporal-evidence-heading" className="break-words text-lg font-semibold">
              Temporal Evidence
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Forecast, not fate.</p>
        </div>
        <div className="min-w-0 text-left sm:text-right">
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            Primary risk
          </div>
          <div className="mt-1 break-words text-sm font-medium text-foreground [overflow-wrap:anywhere]">
            {readable(forecast.primaryRisk)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetaCell label="Horizon" value={forecast.horizon} />
        <MetaCell
          label="Confidence"
          value={readable(forecast.futureScene.confidence) + " · " + confidencePercent(forecast.confidence)}
        />
        <MetaCell label="Data quality" value={readable(snapshot.dataQuality)} />
        <MetaCell label="Proof count" value={String(snapshot.proofCount)} />
      </div>

      {insufficientEvidence ? (
        <div className="mt-4 rounded-sm border border-primary/25 bg-primary/5 p-3">
          <p className="break-words text-sm text-foreground [overflow-wrap:anywhere]">
            {evidenceMessage}
          </p>
        </div>
      ) : null}

      <section className="mt-5 min-w-0" aria-labelledby="temporal-future-scene-heading">
        <h3 id="temporal-future-scene-heading" className="text-sm font-semibold">
          Future scene
        </h3>
        <div className="mt-2 min-w-0 rounded-sm border border-border bg-background/30 p-3 md:p-4">
          <p className="break-words text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]">
            {forecast.futureScene.scene}
          </p>
          <p className="mt-3 break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
            {forecast.futureScene.uncertaintyNote}
          </p>
          <div className="mt-3 min-w-0 border-t border-border pt-3">
            <div className="font-mono text-[9px] uppercase tracking-widest text-primary">
              Proof that would change the path
            </div>
            <p className="mt-1 break-words text-sm text-foreground [overflow-wrap:anywhere]">
              {forecast.futureScene.proofThatChangesPath}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-5 min-w-0" aria-labelledby="temporal-paths-heading">
        <div className="flex min-w-0 items-center gap-2">
          <GitBranch className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <h3 id="temporal-paths-heading" className="text-sm font-semibold">
            Four possible paths
          </h3>
        </div>
        <div className="mt-2 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          {paths.map((path) => (
            <PathCard key={path.path} path={path} />
          ))}
        </div>
      </section>

      <div className="mt-5 min-w-0">
        <MobileCollapse eyebrow="Evidence basis" label="Why this forecast exists">
          <section
            className="min-w-0 rounded-sm border border-border bg-background/20 p-3 md:p-4"
            aria-labelledby="temporal-evidence-basis-heading"
          >
            <h3 id="temporal-evidence-basis-heading" className="text-sm font-semibold">
              Why this forecast exists
            </h3>
            <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
              <MetaCell label="Proof count" value={String(snapshot.proofCount)} />
              <MetaCell
                label="Average quality"
                value={snapshot.averageProofQuality === null ? "Not enough scored proof" : String(snapshot.averageProofQuality)}
              />
              <MetaCell label="Strongest domain" value={snapshot.strongestDomain ?? "Not established"} />
              <MetaCell label="Neglected domains" value={listValue(snapshot.neglectedDomains)} />
              <MetaCell label="Court verdicts" value={listValue(snapshot.recentCourtVerdicts)} />
              <MetaCell label="Adversarial risks" value={listValue(snapshot.recentAdversarialRisks)} />
              <MetaCell label="State trend" value={listValue(snapshot.stateTrend)} />
              <MetaCell label="Data quality" value={readable(snapshot.dataQuality)} />
            </div>
          </section>
        </MobileCollapse>
      </div>

      <section
        className="mt-5 min-w-0 rounded-sm border border-primary/30 bg-primary/5 p-3 md:p-4"
        aria-labelledby="temporal-change-path-heading"
      >
        <h3 id="temporal-change-path-heading" className="text-sm font-semibold">
          What would change this
        </h3>
        <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
          <div className="min-w-0">
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Proof required
            </div>
            <p className="mt-1 break-words text-sm text-foreground [overflow-wrap:anywhere]">
              {forecast.proofRequired}
            </p>
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Blocked action
            </div>
            <p className="mt-1 break-words text-sm text-foreground [overflow-wrap:anywhere]">
              {forecast.blockedAction}
            </p>
          </div>
        </div>

        {firstDisconfirming ? (
          <div className="mt-3 min-w-0 border-t border-primary/20 pt-3">
            <p className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
              <span className="text-foreground">{firstDisconfirming.claim}</span>{" "}
              {firstDisconfirming.proofThatWouldDisproveIt}
            </p>
          </div>
        ) : null}

        <Link to="/proof" className="mt-4 block w-full sm:inline-block sm:w-auto">
          <Button size="sm" className="w-full sm:w-auto">
            Submit proof that changes this path
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </Link>
      </section>
    </Card>
  );
}
