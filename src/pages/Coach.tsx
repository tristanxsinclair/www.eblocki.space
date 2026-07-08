import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ProofContractCard } from "@/components/eblocki/ProofContractCard";
import { normaliseCoachResponse, parseCoachMarkdownSections, type NormalisedCoachResponse } from "@/lib/eblocki/coach-response";
import type { ProofContract } from "@/lib/eblocki/proof-contract";
import type { Mode } from "@/lib/eblocki/modes";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Brain,
  Briefcase,
  ChevronDown,
  ClipboardCopy,
  Compass,
  Dumbbell,
  Gamepad2,
  Gavel,
  Info,
  Loader2,
  Lock,
  MessageSquare,
  Package,
  Radar,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { logEvent } from "@/lib/eblocki/analytics";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileCollapse } from "@/components/eblocki/MobileCollapse";
import {
  buildCoachResponse,
  type CoachEngineResult,
  type CoachResponseMode,
} from "@/lib/eblocki/coach-engine";
import { EblockiLogo } from "@/components/eblocki/EblockiLogo";
import {
  ProofSubmitButton,
  MotionVerdictCard,
  MotionLockIn,
  MotionNextStep,
} from "@/components/eblocki/motion";

const MODE_CHIPS: Array<{
  label: string;
  value: CoachResponseMode | "auto";
  icon: ReactNode;
}> = [
  { label: "Auto", value: "auto", icon: <Sparkles className="h-3.5 w-3.5" /> },
  { label: "Study", value: "study_coach", icon: <BookOpen className="h-3.5 w-3.5" /> },
  { label: "Law", value: "law_reasoning", icon: <Scale className="h-3.5 w-3.5" /> },
  { label: "Psychology", value: "psychology_reasoning", icon: <Brain className="h-3.5 w-3.5" /> },
  { label: "Sales", value: "sales_coach", icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { label: "Sport", value: "sport_coach", icon: <Dumbbell className="h-3.5 w-3.5" /> },
  { label: "Product", value: "product_builder", icon: <Package className="h-3.5 w-3.5" /> },
  { label: "Life", value: "life_strategy", icon: <Compass className="h-3.5 w-3.5" /> },
  { label: "Execution Lock", value: "execution_lock", icon: <Lock className="h-3.5 w-3.5" /> },
];

const QUICK_PROMPTS = [
  "Diagnose what is actually blocking this.",
  "Give me the answer and the proof action.",
  "Turn these notes into a practice plan.",
  "Challenge the weak thinking here.",
  "Generate a GameForge pack if practice is the right move.",
];

type CoachRouteState = {
  coachSeed?: string;
  mode?: CoachResponseMode | "auto";
};

type CoachHistoryRow = {
  id: string;
  mode: string | null;
  user_input: string;
};

function coerceMode(value: string | null | undefined): CoachResponseMode | "auto" {
  const match = MODE_CHIPS.find((chip) => chip.value === value);
  return match?.value ?? "auto";
}

function getCoachProcessingText(mode: CoachResponseMode | "auto"): string {
  if (mode === "auto") {
    return "Coach is diagnosing...";
  }

  const modeMap: Record<string, string> = {
    study_coach: "Study",
    law_reasoning: "Law",
    psychology_reasoning: "Psychology",
    sales_coach: "Sales",
    sport_coach: "Sport",
    product_builder: "Product",
    life_strategy: "Life",
    execution_lock: "Execution",
  };

  const label = modeMap[mode] ?? "Coach";
  return `Coach is reasoning in ${label} mode...`;
}

function splitRemoteResponse(text: string): string {
  return text.replace(/^##\s*/gm, "").trim();
}

function normaliseProofContractMode(value: string | null | undefined): Mode {
  switch ((value ?? "").toUpperCase()) {
    case "LAW_MAX":
      return "LAW_MAX";
    case "PSYCH_HD":
      return "PSYCH_HD";
    case "SALES_CLOSE":
      return "SALES_CLOSE";
    case "EBLOCKI":
    case "EBLOCKI_BUILD":
      return "EBLOCKI";
    case "SPORT":
    case "ATHLETE_MODE":
      return "SPORT";
    case "BRAND":
      return "BRAND";
    case "CAREER_MONEY":
    case "FINANCE_BASICS":
      return "CAREER_MONEY";
    default:
      return "GENERAL_EXECUTION";
  }
}

function buildProofContractCardValue(result: NormalisedCoachResponse): ProofContract {
  const contract = result.proofContract;
  return {
    shouldCreate: contract.shouldCreate,
    domain: contract.domain,
    mode: normaliseProofContractMode(contract.mode),
    title: contract.title,
    requiredArtifact: contract.requiredArtifact,
    evidenceStandard: contract.evidenceStandard,
    dueDate: contract.dueDate,
    seriousnessScore: contract.seriousnessScore,
    reason: contract.reason,
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function displayToken(value: string | null | undefined): string {
  if (!value) return "Not detected";
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function Coach() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const location = useLocation();
  const routeState = (location.state ?? {}) as CoachRouteState;
  const [params] = useSearchParams();
  const [input, setInput] = useState(params.get("prompt") ?? routeState.coachSeed ?? "");
  const [selectedMode, setSelectedMode] = useState<CoachResponseMode | "auto">(coerceMode(params.get("mode") ?? routeState.mode));
  const [loading, setLoading] = useState(false);
  const [remoteResult, setRemoteResult] = useState<NormalisedCoachResponse | null>(null);
  const [engineResult, setEngineResult] = useState<CoachEngineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [localCommitmentId, setLocalCommitmentId] = useState<string | null>(null);
  const [history, setHistory] = useState<CoachHistoryRow[]>([]);

  const committedId = remoteResult?.commitmentId ?? localCommitmentId;

  useEffect(() => {
    if (!user) return;
    supabase
      .from("coach_interactions")
      .select("id, mode, user_input")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setHistory(data ?? []));
  }, [user, remoteResult]);

  const responseAnswer = useMemo(() => {
    if (remoteResult?.response) return splitRemoteResponse(remoteResult.response);
    return engineResult?.answer ?? "";
  }, [remoteResult, engineResult]);

  const responseSections = useMemo(() => {
    if (!remoteResult?.response) return [];
    const parsed = parseCoachMarkdownSections(remoteResult.response);
    // Only render as sections when the response actually has multiple
    // headings — otherwise fall back to the single Answer card below.
    return parsed.length >= 2 ? parsed : [];
  }, [remoteResult]);

  const send = async () => {
    const text = input.trim();
    if (!text) {
      const emptyResult = buildCoachResponse({ input: "", preferredMode: selectedMode });
      setEngineResult(emptyResult);
      setRemoteResult(null);
      return;
    }

    const deterministic = buildCoachResponse({ input: text, preferredMode: selectedMode });
    setEngineResult(deterministic);
    setRemoteResult(null);
    setError(null);
    setLocalCommitmentId(null);
    setLoading(true);

    logEvent("coach_prompt_submitted", {
      domain: deterministic.detectedDomain,
      responseMode: deterministic.responseMode,
      proofActionType: deterministic.proofActionType,
    });
    logEvent("coach_mode_detected", {
      domain: deterministic.detectedDomain,
      state: deterministic.detectedState,
      responseMode: deterministic.responseMode,
    });
    logEvent("coach_proof_action_generated", {
      domain: deterministic.detectedDomain,
      responseMode: deterministic.responseMode,
      proofActionType: deterministic.proofActionType,
    });
    if (deterministic.suggestedGameForgePack) {
      logEvent("coach_gameforge_suggested", {
        domain: deterministic.detectedDomain,
        mode: deterministic.suggestedGameForgePack.mode,
        style: deterministic.suggestedGameForgePack.style,
        suggested: true,
      });
    }

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("coach", {
        body: {
          message: text,
          mode: selectedMode === "auto" ? undefined : selectedMode,
        },
      });
      if (invokeError) {
        setError(invokeError.message || "Coach function failed. Deterministic diagnosis is still available.");
        return;
      }
      if (!data) {
        setError("Coach returned no response. Deterministic diagnosis is still available.");
        return;
      }
      const normalised = normaliseCoachResponse(data);
      setRemoteResult(normalised);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unexpected coach error. Deterministic diagnosis is still available."));
    } finally {
      setLoading(false);
    }
  };

  const commit = async () => {
    if (!remoteResult || !user || committedId) return;
    setCommitting(true);
    try {
      const { data, error: insertError } = await supabase
        .from("proof_commitments")
        .insert({
          user_id: user.id,
          coach_interaction_id: remoteResult.interactionId ?? null,
          domain: remoteResult.proofContract.domain,
          mode: remoteResult.proofContract.mode,
          title: remoteResult.proofContract.title,
          required_artifact: remoteResult.proofContract.requiredArtifact,
          evidence_standard: remoteResult.proofContract.evidenceStandard,
          status: "pending",
        })
        .select("id")
        .single();
      if (insertError) throw insertError;
      if (!data?.id) throw new Error("No commitment id returned.");
      setLocalCommitmentId(data.id);
      toast.success("Committed to the Proof Check.");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to commit."));
    } finally {
      setCommitting(false);
    }
  };

  async function copyProofAction() {
    if (!engineResult) return;
    if (!navigator.clipboard) {
      toast.error("Clipboard unavailable. Select the proof action manually.");
      return;
    }
    await navigator.clipboard.writeText(engineResult.proofAction);
    toast.success("Proof action copied.");
  }

  return (
    <AppShell>
      <Seo
        title="Proof Coach | EBLOCKI"
        description="Diagnose the situation, get the answer, create proof, and generate a practice pack when skill repetition is the right move."
        path="/coach"
      />
      <div className="mobile-safe-page p-4 md:p-8 max-w-5xl mx-auto space-y-5 min-w-0 max-w-full text-wrap-safe pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-8">
        <header className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <EblockiLogo variant="mark" size="md" />
            <div className="min-w-0">
              {!isMobile && (
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Proof Coach // Diagnosis Engine</span>
              )}
              <h1 className="text-2xl md:text-3xl font-semibold mt-1 break-words">Bring the messy problem. Leave with proof.</h1>
            </div>
          </div>
          </header>

        <Card className="panel overflow-hidden border-primary/25 bg-card/60 max-w-full">
          <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-3 min-w-0">
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Input Console</div>
              <div className="mt-1 text-sm text-foreground break-words">Question, notes, thought dump, sales situation, legal issue, or avoidance pattern.</div>
            </div>
            <BrainCircuit className="h-4 w-4 text-primary shrink-0" />
          </div>
          <div className="p-4 md:p-5 space-y-4">
            <Textarea
              placeholder="Paste a problem, note, thought dump, question, or situation. Eblocki will diagnose it and give the next proof action."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-h-[170px] resize-none w-full max-w-full"
            />
            {isMobile ? (
              <MobileCollapse eyebrow="Optional" label="Focus area (optional)" trackId="coach_mode_chips">
                <div className="flex flex-wrap gap-2">
                  {MODE_CHIPS.map((chip) => (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => setSelectedMode(chip.value)}
                      className={cn(
                        "rounded-sm border px-3 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors min-h-[44px] flex items-center gap-1.5",
                        selectedMode === chip.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/40",
                      )}
                    >
                      {chip.icon}
                      {chip.label}
                    </button>
                  ))}
                </div>
              </MobileCollapse>
            ) : (
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Mode chips</div>
                <div className="flex flex-wrap gap-2">
                  {MODE_CHIPS.map((chip) => (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => setSelectedMode(chip.value)}
                      className={cn(
                        "rounded-sm border px-3 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center gap-1.5",
                        selectedMode === chip.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/40",
                      )}
                    >
                      {chip.icon}
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 flex-wrap border-t border-border pt-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{input.length}/5000</div>
              <ProofSubmitButton
                onClick={send}
                disabled={loading}
                className="gap-2 w-full sm:w-auto"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Diagnosing</> : <><Send className="h-4 w-4" /> Diagnose</>}
              </ProofSubmitButton>
            </div>
          </div>
        </Card>

        {/* Calm processing state while Coach is thinking */}
        {loading && (
          <div className="flex justify-center py-2">
            <div className="motion-calm flex items-center gap-2 text-muted-foreground">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              {getCoachProcessingText(selectedMode)}
            </div>
          </div>
        )}

        {!engineResult && !loading && (
          <Card className="panel p-4 md:p-5 border-border/80 bg-card/50 max-w-full overflow-hidden">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Start here</div>
            <p className="mt-2 text-sm text-muted-foreground break-words">
              Paste a real problem above (one paragraph is enough): a question, a stuck task,
              an avoidance pattern, a sales situation, a study block. Coach will diagnose it
              and return one proof action you can complete today.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <EmptyCell icon={<Radar />} title="Diagnose" body="Find the real domain, intent, state, and urgency." />
              <EmptyCell icon={<Target />} title="Proof" body="Convert the answer into one artifact requirement." />
              <EmptyCell icon={<Gamepad2 />} title="Practice" body="Send weak concepts to GameForge when repetition is useful." />
            </div>
            {isMobile && (
              <Link to="/gameforge" className="mt-3 inline-block w-full">
                <Button size="sm" variant="outline" className="w-full min-h-[44px] native-tap gap-2">
                  <Gamepad2 className="h-3.5 w-3.5" /> GameForge (after diagnosis)
                </Button>
              </Link>
            )}
          </Card>
        )}

        {loading && engineResult && (
          <Card className="panel p-4 border-primary/30 bg-primary/5 max-w-full overflow-hidden">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="break-words">Deterministic diagnosis is ready. The existing coach function is being checked for an enhanced response.</span>
            </div>
          </Card>
        )}

        {error && (
          <Card className="panel p-4 border-destructive/40 max-w-full overflow-hidden">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-mono text-[10px] uppercase tracking-widest">Coach function note</span>
            </div>
            <p className="text-sm mt-1 text-muted-foreground break-words">{error}</p>
          </Card>
        )}

        {engineResult && (
          <div className="space-y-4">
            <MotionVerdictCard className="max-w-full overflow-hidden">
              <CoachResultSummaryCard
                engineResult={engineResult}
                remoteResult={remoteResult}
                committedId={committedId}
                committing={committing}
                onCommit={commit}
              />
            </MotionVerdictCard>

            {engineResult.warning && (
              <Card className="panel p-4 border-primary/35 bg-primary/5 max-w-full overflow-hidden">
                <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Reality Check</div>
                <p className="mt-2 text-sm break-words whitespace-pre-wrap">{engineResult.warning}</p>
              </Card>
            )}

            <Card className="panel p-4 border-primary/35 bg-primary/5 max-w-full overflow-hidden">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Proof Action</div>
                <Button size="sm" variant="outline" onClick={copyProofAction} className="gap-1.5"><ClipboardCopy className="h-3.5 w-3.5" /> Copy</Button>
              </div>
              <p className="mt-2 text-sm leading-6 break-words whitespace-pre-wrap">{engineResult.proofAction}</p>
              <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{displayToken(engineResult.proofActionType)}</div>
            </Card>

            <CoachFullReasoning
              engineResult={engineResult}
              responseAnswer={responseAnswer}
              responseSections={responseSections}
            />

            {engineResult.suggestedGameForgePack && (
              <Card className="panel p-4 border-border/80 bg-card/50 max-w-full overflow-hidden">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Optional GameForge Pack</div>
                    <h3 className="mt-1 text-sm font-semibold break-words">{engineResult.suggestedGameForgePack.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground break-words">{engineResult.suggestedGameForgePack.reason}</p>
                  </div>
                  <Gamepad2 className="h-4 w-4 text-primary shrink-0" />
                </div>
                <Link
                  to="/gameforge"
                  state={{
                    seed: engineResult.suggestedGameForgePack.sourceMaterial,
                    mode: engineResult.suggestedGameForgePack.mode,
                    style: engineResult.suggestedGameForgePack.style,
                    intensity: "focused",
                  }}
                  className="mt-3 inline-flex"
                >
                  <Button size="sm">Generate GameForge Pack <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>
                </Link>
              </Card>
            )}

            {remoteResult?.proofContract.shouldCreate && (
              <ProofContractCard
                contract={buildProofContractCardValue(remoteResult)}
                onCommit={commit}
                committing={committing}
                committed={!!committedId}
              />
            )}

            {committedId && (
              <MotionLockIn active={!!committedId} className="panel p-4 border-primary/30 flex items-center justify-between flex-wrap gap-3 max-w-full overflow-hidden">
                <div className="min-w-0">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Next step</span>
                  <p className="text-sm mt-1 break-words">Contract saved. Submit the proof artifact in the Proof Check.</p>
                </div>
                <Link to="/proof"><Button size="sm">Submit Proof <ArrowRight className="h-3 w-3 ml-1" /></Button></Link>
              </Card>
            )}
          </div>
        )}

        <Card className="panel p-4 border-border/80 bg-card/50 max-w-full overflow-hidden">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Quick prompts</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <Button
                key={prompt}
                size="sm"
                variant="outline"
                className="text-xs whitespace-normal text-left h-auto py-2 motion-micro"
                onClick={() => setInput((prev) => (prev.trim() ? `${prev.trim()}\n\n${prompt}` : prompt))}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </Card>

        <Card className="panel p-4 border-border/80 bg-card/50 max-w-full overflow-hidden">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground m-0">Recent interactions</h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2 break-words">No coach interactions yet. Name a real bottleneck above to start the loop.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {history.map((h) => (
                <li key={h.id} className="py-2 text-xs break-words">
                  <span className="font-mono uppercase tracking-wider text-muted-foreground">{h.mode ?? "none"}</span>
                  <span className="ml-2 text-foreground break-words">{h.user_input.slice(0, 110)}{h.user_input.length > 110 ? "..." : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function EmptyCell({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-sm border border-border bg-background/30 p-3">
      <div className="flex items-center gap-2 text-primary [&_svg]:h-3.5 [&_svg]:w-3.5">
        {icon}
        <span className="font-mono text-[10px] uppercase tracking-widest">{title}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Signal({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-sm border border-border bg-background/30 p-3 min-w-0">
      <div className="flex items-center gap-1.5 text-primary [&_svg]:h-3.5 [&_svg]:w-3.5">
        {icon}
        <span className="font-mono text-[9px] uppercase tracking-widest">{label}</span>
      </div>
      <div className="mt-1 truncate text-sm">{value}</div>
    </div>
  );
}

function CoachResultSummaryCard({
  engineResult,
  remoteResult,
  committedId,
  committing,
  onCommit,
}: {
  engineResult: CoachEngineResult;
  remoteResult: NormalisedCoachResponse | null;
  committedId: string | null;
  committing: boolean;
  onCommit: () => void;
}) {
  const contract = remoteResult?.proofContract;
  const contractStatus = committedId
    ? "Proof Contract saved"
    : contract?.shouldCreate
      ? "Ready to save"
      : "Proof action ready";
  const proofRequired = contract?.requiredArtifact || engineResult.recommendedProofArtifact.requiredArtifact || engineResult.proofAction;
  const evidenceStandard = contract?.evidenceStandard || engineResult.recommendedProofArtifact.evidenceStandard;

  return (
    <Card className="panel p-4 md:p-5 border-primary/40 bg-primary/5 max-w-full overflow-hidden">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Coach Result</div>
          <h2 className="mt-1 text-lg font-semibold leading-snug break-words">{displayToken(engineResult.detectedIntent)}</h2>
        </div>
        <span className="rounded-sm border border-primary/40 bg-background/50 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
          {contractStatus}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <SummaryField label="Classification" value={`${displayToken(engineResult.detectedDomain)} / ${displayToken(engineResult.responseMode)}`} />
        <SummaryField label="Detected blocker" value={engineResult.diagnosis} />
        <SummaryField label="Why it matters" value={engineResult.warning || engineResult.answer} />
        <SummaryField label="Proof required" value={proofRequired} />
        <SummaryField label="Next command" value={engineResult.proofAction} emphasis />
        <SummaryField label="Proof contract status" value={evidenceStandard ? `${contractStatus}: ${evidenceStandard}` : contractStatus} />
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        {committedId ? (
          <Link to="/proof" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto min-h-[44px] native-tap">
              Submit Proof <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        ) : contract?.shouldCreate ? (
          <Button onClick={onCommit} disabled={committing} className="w-full sm:w-auto min-h-[44px] native-tap">
            {committing ? "Saving contract..." : "Save Proof Contract"}
          </Button>
        ) : (
          <Link to="/proof" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto min-h-[44px] native-tap">
              Submit Proof <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}

function SummaryField({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="rounded-sm border border-border/80 bg-background/40 p-3 min-w-0">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <p className={`mt-1 text-sm leading-6 break-words whitespace-pre-wrap ${emphasis ? "text-foreground font-medium" : "text-muted-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function CoachFullReasoning({
  engineResult,
  responseAnswer,
  responseSections,
}: {
  engineResult: CoachEngineResult;
  responseAnswer: string;
  responseSections: Array<{ heading: string; body: string }>;
}) {
  return (
    <details className="group rounded-sm border border-border bg-card/50 p-4 max-w-full overflow-hidden">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Full reasoning</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 grid gap-3">
        <Card className="panel p-4 border-border/80 bg-card/50 max-w-full overflow-hidden">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Signal label="Domain" value={displayToken(engineResult.detectedDomain)} icon={<Radar />} />
            <Signal label="Intent" value={displayToken(engineResult.detectedIntent)} icon={<Crosshair />} />
            <Signal label="State" value={displayToken(engineResult.detectedState)} icon={<BrainCircuit />} />
            <Signal label="Mode" value={displayToken(engineResult.responseMode)} icon={<MessageSquare />} />
            <Signal label="Urgency" value={displayToken(engineResult.urgency)} icon={<ShieldCheck />} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground break-words">
            Internal prompt summary: {engineResult.internalPromptSummary}
          </p>
        </Card>
        <ResponseSection title="Diagnosis" icon={<Radar />}>{engineResult.diagnosis}</ResponseSection>
        {responseSections.length > 0 ? (
          responseSections.map((section) => (
            <ResponseSection key={section.heading} title={section.heading} icon={<MessageSquare />}>
              {section.body}
            </ResponseSection>
          ))
        ) : (
          <ResponseSection title="Answer" icon={<MessageSquare />}>{responseAnswer}</ResponseSection>
        )}
        <ResponseSection title="Plan" icon={<Target />}>
          <ol className="space-y-2">
            {engineResult.plan.map((step, index) => <li key={step} className="break-words">{index + 1}. {step}</li>)}
          </ol>
        </ResponseSection>
        <ResponseSection title="Next Checkpoint" icon={<Crosshair />}>{engineResult.nextCheckpoint}</ResponseSection>
        {engineResult.followUpQuestion && <ResponseSection title="Follow-up" icon={<Info />}>{engineResult.followUpQuestion}</ResponseSection>}
      </div>
    </details>
  );
}

function ResponseSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Card className="panel p-4 border-border/80 bg-card/50 max-w-full overflow-hidden">
      <div className="flex items-center gap-2 text-primary [&_svg]:h-3.5 [&_svg]:w-3.5">
        {icon}
        <h2 className="font-mono text-[10px] uppercase tracking-widest m-0">{title}</h2>
      </div>
      <div className="mt-2 text-sm leading-6 whitespace-pre-wrap break-words text-muted-foreground min-w-0">{children}</div>
    </Card>
  );
}
