import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, CircleDot, Gavel, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DashboardViewModel, DashboardProofRow } from "@/lib/eblocki/dashboard-view-model";
import {
  PROOF_DEFINITION_ONCE,
  plainEvidenceStrength,
  plainRiskLine,
  resolveTodayClosure,
} from "@/lib/eblocki/user-facing-copy";
import { logEvent } from "@/lib/eblocki/analytics";

interface ProofClosureCardProps {
  view: DashboardViewModel;
  proofToday: boolean;
  hasAnyProof: boolean;
  todayArtifact?: DashboardProofRow | null;
  todayISO: string;
}

/**
 * Mobile-first daily closure card. One dominant surface: open or closed,
 * one proof command, one primary CTA. A day closes only when proof counts.
 */
export function ProofClosureCard({
  view,
  proofToday,
  hasAnyProof,
  todayArtifact,
  todayISO,
}: ProofClosureCardProps) {
  const proofHref = hasAnyProof ? "/proof" : "/proof?first=1";
  const nextCommand = view.commandSummary.nextBestAction || view.commandLayer.nextCheckpoint;
  const riskLine = plainRiskLine(view.commandSummary.highestRisk);

  const closure = resolveTodayClosure(
    proofToday,
    todayArtifact?.evidence_strength,
    todayArtifact?.quality_score,
  );

  const verdictDisplay = proofToday && todayArtifact
    ? plainEvidenceStrength(todayArtifact.evidence_strength)
    : closure.verdict;

  if (closure.status !== "open") {
    const StatusIcon = closure.status === "closed" ? CheckCircle2 : CircleDot;
    const showSecondary = closure.secondaryCta && closure.secondaryCta !== "Back tomorrow";

    return (
      <Card className="panel p-5 border-primary/50 bg-primary/5 mobile-safe-card text-wrap-safe min-w-0 max-w-full">
        <div className="flex items-center gap-2">
          <StatusIcon className="h-4 w-4 text-primary shrink-0" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
            {closure.statusEyebrow}
          </span>
        </div>
        <h2 className="mt-3 text-xl font-semibold leading-tight break-words">{closure.headline}</h2>
        <dl className="mt-4 grid gap-2 text-sm">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Latest verdict</dt>
            <dd className="mt-0.5 font-medium text-foreground">{verdictDisplay}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Next command</dt>
            <dd className="mt-0.5 text-foreground break-words">{nextCommand}</dd>
          </div>
        </dl>
        {closure.subline && (
          <p className="mt-3 text-xs text-muted-foreground break-words">{closure.subline}</p>
        )}
        {closure.status === "still_open" && (
          <p className="mt-3 text-xs text-muted-foreground break-words">
            Improve today&apos;s proof with stronger visible output before you call the day done.
          </p>
        )}
        <div className="mt-4 flex flex-col gap-2">
          <Link to={proofHref} className="w-full">
            <Button size="default" className="w-full min-h-[44px] native-tap">
              {closure.primaryCta}
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </Link>
          {showSecondary && closure.secondaryCta && (
            <Link to={proofHref} className="w-full">
              <Button size="default" variant="outline" className="w-full min-h-[44px] native-tap">
                {closure.secondaryCta}
              </Button>
            </Link>
          )}
        </div>
      </Card>
    );
  }

  const commandLine = hasAnyProof
    ? view.commandSummary.title
    : "Submit one proof from today.";

  return (
    <Card className="panel p-5 border-primary/50 bg-primary/5 mobile-safe-card text-wrap-safe min-w-0 max-w-full">
      <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Today · {todayISO}</span>
      <h2 className="mt-2 text-xl font-semibold leading-tight break-words">{closure.headline}</h2>
      <p className="mt-2 text-sm text-foreground break-words">{commandLine}</p>
      <p className="mt-2 text-sm text-muted-foreground break-words">{PROOF_DEFINITION_ONCE}</p>
      {hasAnyProof && (
        <p className="mt-2 text-xs text-muted-foreground break-words">
          <span className="text-foreground">Risk if you skip:</span> {riskLine}
        </p>
      )}
      <div className="mt-4 flex flex-col gap-2">
        <Link to={proofHref} className="w-full">
          <Button
            size="default"
            className="w-full min-h-[44px] native-tap"
            onClick={() => {
              void logEvent("activation_landing_primary_cta_clicked", {
                route: "/dashboard",
                destination: proofHref,
                ctaName: "mobile_closure_submit_proof",
              });
            }}
          >
            <Gavel className="h-3.5 w-3.5 mr-1.5" />
            {closure.primaryCta}
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </Link>
        {hasAnyProof && (
          <Link to="/coach" className="w-full">
            <Button size="default" variant="outline" className="w-full min-h-[44px] native-tap">
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Ask coach after proof
            </Button>
          </Link>
        )}
      </div>
      <p className="mt-4 text-xs text-muted-foreground break-words">
        After proof, Eblocki will judge whether it counted and give your next command.
      </p>
    </Card>
  );
}