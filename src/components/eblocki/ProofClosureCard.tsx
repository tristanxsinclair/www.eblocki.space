import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDot,
  FileCheck2,
  Gavel,
  MessageSquare,
  ShieldAlert,
  Target,
} from "lucide-react";
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
import { verdictIdentityImpact } from "@/lib/eblocki/verdict-identity-impact";
import type { EvidenceStrength } from "@/lib/eblocki/proof-scoring";
import { cn } from "@/lib/utils";

const EVIDENCE_STRENGTHS: EvidenceStrength[] = ["weak", "moderate", "strong", "elite"];

function isEvidenceStrength(value: string | null | undefined): value is EvidenceStrength {
  return EVIDENCE_STRENGTHS.includes(value as EvidenceStrength);
}

interface ProofClosureCardProps {
  view: DashboardViewModel;
  proofToday: boolean;
  hasAnyProof: boolean;
  todayArtifact?: DashboardProofRow | null;
  todayISO: string;
}

/**
 * The single daily evidence protocol used across mobile and desktop.
 * It joins command, proof requirement, verdict state, and next action without
 * creating a second behavioural engine or implying progress before proof exists.
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
  const identityImpact = isEvidenceStrength(todayArtifact?.evidence_strength)
    ? verdictIdentityImpact(todayArtifact.evidence_strength)
    : null;
  const commandLine = hasAnyProof
    ? view.commandSummary.title
    : "Submit one proof from today.";
  const isClosed = closure.status === "closed";
  const proofFiled = closure.status !== "open";
  const verdictAssessed = closure.status === "still_open" || isClosed;
  const showSecondary = closure.secondaryCta && closure.secondaryCta !== "Back tomorrow";
  const protocol = [
    {
      label: "Command",
      value: proofFiled ? "Action recorded in today’s ledger." : commandLine,
      complete: proofFiled,
      active: !proofFiled,
    },
    {
      label: "Proof",
      value: proofFiled ? verdictDisplay : "Visible artifact required before judgment.",
      complete: proofFiled,
      active: !proofFiled,
    },
    {
      label: "Verdict",
      value: isClosed
        ? "Counted. Standard raised."
        : verdictAssessed
          ? closure.verdict
          : "Awaiting assessment",
      complete: isClosed,
      active: proofFiled && !isClosed,
    },
  ];

  return (
    <Card className="operator-panel-accent motion-entrance overflow-hidden mobile-safe-card text-wrap-safe min-w-0 max-w-full">
      <header className="min-w-0 border-b border-border/90 p-5 sm:p-6 md:p-7">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.08] px-2.5 py-1 operator-label-signal">
            {isClosed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleDot className="h-3.5 w-3.5" />}
            {closure.statusEyebrow}
          </span>
          <span className="operator-label">{todayISO}</span>
        </div>

        <h2 className="mt-4 operator-heading-2 max-w-2xl break-words">{closure.headline}</h2>
        {(closure.status === "open" || closure.subline) && (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground break-words">
            {closure.status === "open" ? PROOF_DEFINITION_ONCE : closure.subline}
          </p>
        )}
      </header>

      <div className="grid min-w-0 lg:grid-cols-[minmax(0,1.45fr)_minmax(17rem,0.55fr)]">
        <div className="min-w-0 p-5 sm:p-6 md:p-7">
          <ol
            className="mt-6 grid gap-px overflow-hidden rounded-lg border border-border/90 bg-border/90 sm:grid-cols-3"
            aria-label="Daily evidence protocol"
          >
            {protocol.map((step, index) => (
              <li key={step.label} className="min-w-0 bg-background/75 p-3.5 sm:p-4">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full border font-mono text-[10px]",
                      step.complete
                        ? "border-primary bg-primary text-primary-foreground"
                        : step.active
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground",
                    )}
                  >
                    {step.complete ? <Check className="h-3.5 w-3.5" /> : `0${index + 1}`}
                  </span>
                  <span className={cn("operator-label", step.active && "text-primary")}>{step.label}</span>
                </div>
                <p className="mt-2 text-sm font-medium leading-5 text-foreground break-words">{step.value}</p>
              </li>
            ))}
          </ol>

          <dl className="mt-4 grid gap-2 sm:grid-cols-3">
            <Signal icon={<FileCheck2 />} label="Artifact" value={view.commandSummary.proofRequired} />
            <Signal icon={<ShieldAlert />} label="Risk" value={riskLine} />
            <Signal icon={<Gavel />} label="Latest verdict" value={verdictDisplay} />
          </dl>

          {identityImpact && (
            <div
              className="mt-4 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/[0.045] p-3.5"
              data-testid="dashboard-verdict-identity-impact"
            >
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <div className="operator-label-signal">Identity consequence</div>
                <p className="mt-1 text-sm font-medium text-foreground break-words">{identityImpact.headline}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground break-words">{identityImpact.subtext}</p>
              </div>
            </div>
          )}
        </div>

        <aside className="order-first flex min-w-0 flex-col justify-between border-b border-border/90 bg-background/45 p-5 sm:p-6 lg:order-none lg:border-b-0 lg:border-l">
          <div>
            <div className="operator-label">Next command</div>
            <p className="mt-2 text-base font-semibold leading-6 text-foreground break-words">{nextCommand}</p>
            {closure.status === "still_open" && (
              <p className="mt-3 text-xs leading-5 text-muted-foreground break-words">
                Upgrade the visible output before treating today as closed.
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <Link to={proofHref} className="w-full">
              <Button
                size="default"
                className="w-full min-h-[44px] native-tap"
                onClick={() => {
                  void logEvent("activation_landing_primary_cta_clicked", {
                    route: "/dashboard",
                    destination: proofHref,
                    ctaName: "daily_protocol_primary",
                  });
                }}
              >
                <Gavel className="h-3.5 w-3.5 mr-1.5" />
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
            {closure.status === "open" && hasAnyProof && (
              <Link to="/coach" className="w-full">
                <Button size="default" variant="outline" className="w-full min-h-[44px] native-tap">
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                  Ask coach after proof
                </Button>
              </Link>
            )}
          </div>
        </aside>
      </div>
    </Card>
  );
}

function Signal({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/80 bg-background/35 p-3">
      <dt className="flex items-center gap-2 operator-label">
        <span className="text-primary [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1.5 text-xs leading-5 text-muted-foreground break-words">{value}</dd>
    </div>
  );
}
