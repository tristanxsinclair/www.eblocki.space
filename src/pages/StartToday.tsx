import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Seo } from "@/components/Seo";
import { buildDashboardViewModel } from "@/lib/eblocki/dashboard-view-model";
import { buildProofEntryHref, UGLY_START_COPY } from "@/lib/eblocki/first-proof";
import { localDayKey } from "@/lib/eblocki/local-day";
import { ArrowRight, CheckCircle2, Crosshair, Gavel, Loader2, MessageSquare, Sparkles } from "lucide-react";

type UserMode = { mode_id: string; display_name: string };
type DailyControlSheetRow = Pick<Tables<"daily_control_sheets">, "prime_objective" | "avoidance_signal" | "next_best_action" | "state">;
type ProofCommitmentRow = Tables<"proof_commitments">;
type ProofArtifactRow = Pick<
  Tables<"proof_artifacts">,
  "id" | "domain" | "title" | "artifact_type" | "evidence_strength" | "quality_score" | "transfer_flag" | "pressure_flag" | "created_at" | "next_upgrade" | "temporal_snapshot"
>;

const STEPS = [
  {
    key: "prime_objective",
    label: "Prime Objective",
    prompt: "What is the one objective that would make today count?",
    placeholder: "e.g. Submit one IRAC answer for LAWS1005 statutory interpretation.",
  },
  {
    key: "focus_mode",
    label: "Focus Mode",
    prompt: "Which mode does this objective live in?",
    placeholder: "",
  },
  {
    key: "avoidance_signal",
    label: "Avoidance Signal",
    prompt: "What behaviour would prove you are dodging the real task?",
    placeholder: "e.g. Reorganising notes instead of writing answers.",
  },
  {
    key: "next_best_action",
    label: "Next Controllable Action",
    prompt: "What is the smallest action that creates evidence?",
    placeholder: "e.g. Open a blank doc and write the Issue + Rule for one question.",
  },
  {
    key: "required_artifact",
    label: "Required Proof Artifact",
    prompt: "What proof artifact will confirm completion?",
    placeholder: "e.g. One 300-word IRAC answer saved as proof.",
  },
] as const;

export default function StartToday() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const planMode = searchParams.get("plan") === "1";
  const today = useMemo(() => localDayKey(), []);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Record<string, string>>({
    prime_objective: "",
    focus_mode: "",
    avoidance_signal: "",
    next_best_action: "",
    required_artifact: "",
  });
  const [modes, setModes] = useState<UserMode[]>([]);
  const [loadingModes, setLoadingModes] = useState(true);
  const [gateError, setGateError] = useState<string | null>(null);
  const [todaySheet, setTodaySheet] = useState<DailyControlSheetRow | null>(null);
  const [pendingContracts, setPendingContracts] = useState<ProofCommitmentRow[]>([]);
  const [allArtifacts, setAllArtifacts] = useState<ProofArtifactRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ contractId: string | null } | null>(null);

  const openPlanner = () => {
    const next = new URLSearchParams(searchParams);
    next.set("plan", "1");
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoadingModes(true);
      setGateError(null);
      try {
        const [modesRes, sheetRes, pendingRes, artifactsRes] = await Promise.all([
          supabase
            .from("user_modes")
            .select("mode_id, display_name")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .order("display_name"),
          supabase
            .from("daily_control_sheets")
            .select("prime_objective,avoidance_signal,next_best_action,state")
            .eq("user_id", user.id)
            .eq("sheet_date", today)
            .maybeSingle(),
          supabase
            .from("proof_commitments")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "pending")
            .order("created_at", { ascending: false }),
          supabase
            .from("proof_artifacts")
            .select("id,domain,title,artifact_type,evidence_strength,quality_score,transfer_flag,pressure_flag,created_at,next_upgrade,temporal_snapshot")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(200),
        ]);

        if (modesRes.error) throw modesRes.error;
        if (sheetRes.error) throw sheetRes.error;
        if (pendingRes.error) throw pendingRes.error;
        if (artifactsRes.error) throw artifactsRes.error;
        if (cancelled) return;

        const seededSheet = (sheetRes.data as DailyControlSheetRow | null) ?? null;
        setModes((modesRes.data as UserMode[]) ?? []);
        setTodaySheet(seededSheet);
        setPendingContracts((pendingRes.data as ProofCommitmentRow[]) ?? []);
        setAllArtifacts((artifactsRes.data as ProofArtifactRow[]) ?? []);
        if (seededSheet) {
          setForm((f) => ({
            ...f,
            prime_objective: seededSheet.prime_objective ?? f.prime_objective,
            avoidance_signal: seededSheet.avoidance_signal ?? f.avoidance_signal,
            next_best_action: seededSheet.next_best_action ?? f.next_best_action,
          }));
        }
      } catch (fetchError) {
        if (!cancelled) {
          const message = fetchError instanceof Error ? fetchError.message : "Could not load today's command.";
          setGateError(message);
        }
      } finally {
        if (!cancelled) setLoadingModes(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, today]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const recentProofs = useMemo(() => allArtifacts.slice(0, 5), [allArtifacts]);
  const view = useMemo(
    () =>
      buildDashboardViewModel({
        today: todaySheet,
        pending: pendingContracts,
        recentProofs,
        allArtifacts,
        modesCount: modes.length,
      }),
    [todaySheet, pendingContracts, recentProofs, allArtifacts, modes.length],
  );
  const hasProofToday = view.evidenceSummary.proofsTodayCount > 0;
  const submitProofHref = buildProofEntryHref({
    firstProof: allArtifacts.length === 0,
    uglyStart: !hasProofToday,
  });
  const stateLabel = typeof todaySheet?.state === "string" && todaySheet.state.trim()
    ? todaySheet.state.replace(/_/g, " ")
    : null;

  const current = STEPS[step];
  const canAdvance =
    current.key === "focus_mode"
      ? !!form.focus_mode
      : (form[current.key] ?? "").trim().length > 0;

  const submit = async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: sheetErr } = await supabase
        .from("daily_control_sheets")
        .upsert(
          {
            user_id: user.id,
            sheet_date: today,
            prime_objective: form.prime_objective,
            avoidance_signal: form.avoidance_signal,
            next_best_action: form.next_best_action,
          },
          { onConflict: "user_id,sheet_date" }
        );
      if (sheetErr) throw sheetErr;

      const mode = form.focus_mode || "EBLOCKI";
      const domain = mode.toLowerCase();
      const { data: pc, error: pcErr } = await supabase
        .from("proof_commitments")
        .insert({
          user_id: user.id,
          domain,
          mode,
          title: form.prime_objective,
          required_artifact: form.required_artifact,
          evidence_standard:
            "Concrete artifact + applied detail + reflection + next upgrade.",
          status: "pending",
          due_date: today,
        })
        .select("id")
        .maybeSingle();
      if (pcErr) throw pcErr;

      setDone({ contractId: pc?.id ?? null });
    } catch (submitError: unknown) {
      const message = submitError instanceof Error
        ? submitError.message
        : "Could not save Start Today. Your inputs are preserved — try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <Seo
        title="Start Today | EBLOCKI"
        description="Define the one objective, one artifact, one timer. Convert intention into a Proof Contract in under 60 seconds."
        path="/start"
      />
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-5">
        <header>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Start Today</span>
          <h1 className="text-2xl md:text-3xl font-semibold mt-1">
            {planMode ? (hasProofToday ? "Plan today" : "Command gate") : "Command gate"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {hasProofToday
              ? (planMode
                ? "Define the next proof artifact. One objective. One artifact."
                : "Today's proof exists. Planning is unlocked if you need it.")
              : "Open the real task. Produce one measurable artifact. Planning stays blocked until proof exists."}
          </p>
        </header>

        {loadingModes && !done && (
          <Card className="panel p-4 md:p-5 border-border/80 bg-card/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading today&apos;s command…
            </div>
          </Card>
        )}

        {gateError && !done && (
          <Card className="panel p-4 md:p-5 border-destructive/40 bg-destructive/5 text-sm text-destructive">
            Supabase load error: {gateError}
          </Card>
        )}

        {gateError && !done && !loadingModes && (
          <Card className="panel p-4 md:p-5 border-border/80 bg-card/50 mobile-safe-card">
            <p className="text-sm text-muted-foreground text-wrap-safe">
              Proof submission is still available. State gating is paused until today&apos;s data loads again.
            </p>
            <Link to="/proof" className="mt-3 inline-flex w-full sm:w-auto">
              <Button size="sm" className="w-full sm:w-auto">
                Open proof
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </Card>
        )}

        {!done && !loadingModes && !gateError && !hasProofToday && (
          <>
            <Card className="panel p-5 md:p-6 border-primary/40 bg-primary/5 space-y-4 mobile-safe-card">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Command Gate</span>
                    <GatePill label={`route ${view.commandLayer.activeRoute.replace(/_/g, " ")}`} />
                    {stateLabel && <GatePill label={`state ${stateLabel}`} />}
                  </div>
                  <h2 className="mt-2 text-xl font-semibold leading-tight text-wrap-safe">
                    {allArtifacts.length === 0
                      ? "No proof yet. Submit one measurable artifact to activate the command layer."
                      : "No proof yet today. Submit one measurable artifact to activate the command layer."}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground text-wrap-safe">
                    Planning is blocked until proof exists.
                  </p>
                </div>
              </div>

              <GateSection label="One command" value={view.commandLayer.todayCommand} />

              <div className="grid gap-3 sm:grid-cols-2">
                <GateSection label="Proof required" value={view.commandLayer.proofContract} />
                <GateSection label="Timebox" value={view.commandLayer.timebox} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <GateList
                  label="What counts"
                  items={view.commandLayer.requiredEvidence}
                />
                <GateList
                  label="What does not count"
                  items={view.commandLayer.whatDoesNotCount}
                />
              </div>

              {!modes.length && (
                <p className="text-xs text-muted-foreground text-wrap-safe">
                  No active mode is configured yet. The general proof standard applies until you set one up after today&apos;s proof.
                </p>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Link to={submitProofHref} className="w-full sm:w-auto">
                  <Button size="sm" className="w-full sm:w-auto">
                    Submit Proof
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </Link>
                <p className="text-xs text-muted-foreground text-wrap-safe">
                  One artifact. One standard. One verdict.
                </p>
              </div>
            </Card>

            <Card className="panel p-4 md:p-5 border-primary/30 space-y-3 mobile-safe-card">
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Ugly Start</div>
              <h2 className="text-base font-semibold text-wrap-safe">{UGLY_START_COPY.title}</h2>
              <p className="text-sm text-muted-foreground text-wrap-safe">{UGLY_START_COPY.subtitle}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <GateSection label="Timebox" value="2 minutes" />
                <GateSection label="Counts now" value="One rough sentence or one visible artifact." />
                <GateSection label="Judgment" value="Quality is not judged until the artifact exists." />
              </div>
            </Card>

            {planMode && (
              <Card className="panel p-4 md:p-5 border-border/80 bg-card/50 mobile-safe-card">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Planner locked</div>
                <p className="mt-1 text-sm text-muted-foreground text-wrap-safe">
                  Planning is blocked until proof exists. File one artifact first, then come back to forge the next contract.
                </p>
                <Link to={submitProofHref} className="mt-3 inline-flex w-full sm:w-auto">
                  <Button size="sm" className="w-full sm:w-auto">
                    Submit Proof
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </Link>
              </Card>
            )}
          </>
        )}

        {!done && !loadingModes && !gateError && hasProofToday && !planMode && (
          <Card className="panel p-5 md:p-6 border-primary/40 bg-primary/5 space-y-4 mobile-safe-card">
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Command layer active</div>
            <h2 className="text-xl font-semibold text-wrap-safe">Today&apos;s proof exists. Planning is unlocked.</h2>
            <p className="text-sm text-muted-foreground text-wrap-safe">
              Submit another artifact or open the planner if you need to set the next proof contract.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link to="/proof" className="w-full sm:w-auto">
                <Button size="sm" className="w-full sm:w-auto">
                  Submit another proof
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </Link>
              <Button size="sm" variant="outline" onClick={openPlanner} className="w-full sm:w-auto">
                Open planner
              </Button>
            </div>
          </Card>
        )}

        {planMode && !done && hasProofToday && !loadingModes && !gateError && (
          <Card className="panel p-4 md:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                Step {step + 1} / {STEPS.length} — {current.label}
              </span>
              <div className="flex gap-1">
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1 w-6 rounded-sm ${i <= step ? "bg-primary" : "bg-muted"}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm">{current.prompt}</Label>

              {current.key === "focus_mode" ? (
                loadingModes ? (
                  <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading modes…
                  </div>
                ) : modes.length === 0 ? (
                  <div className="mt-3 rounded-sm border border-primary/40 bg-primary/5 p-3">
                    <p className="text-sm">No personalised modes found. Build your Eblocki OS so the system knows what evidence matters.</p>
                    <Link to="/modes"><Button size="sm" className="mt-2">Setup OS</Button></Link>
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {modes.map((m) => (
                      <button
                        key={m.mode_id}
                        type="button"
                        onClick={() => set("focus_mode", m.mode_id)}
                        className={`text-left rounded-sm border p-2.5 transition-colors ${
                          form.focus_mode === m.mode_id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {m.mode_id}
                        </div>
                        <div className="text-sm mt-0.5">{m.display_name}</div>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <Textarea
                  className="mt-2"
                  rows={3}
                  placeholder={current.placeholder}
                  value={form[current.key] ?? ""}
                  onChange={(e) => set(current.key, e.target.value)}
                  autoFocus
                />
              )}
            </div>

            {error && (
              <div className="rounded-sm border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0 || submitting}
              >
                Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button
                  size="sm"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canAdvance}
                >
                  Next <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              ) : (
                <Button size="sm" onClick={submit} disabled={!canAdvance || submitting}>
                  {submitting ? (
                    <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Forging…</>
                  ) : (
                    <>Forge Proof Contract <ArrowRight className="h-3 w-3 ml-1" /></>
                  )}
                </Button>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground border-t border-border pt-3">
              Intentions do not compound. Proof does.
            </p>
          </Card>
        )}

        {done && (
          <Card className="panel p-5 border-primary/40 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                Today is locked in
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <Row label="Prime Objective" value={form.prime_objective} />
              <Row label="Focus Mode" value={form.focus_mode || "—"} />
              <Row label="Avoidance Signal" value={form.avoidance_signal} />
              <Row label="Next Controllable Action" value={form.next_best_action} />
              <Row label="Required Proof Artifact" value={form.required_artifact} />
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              <Link to="/coach"><Button variant="outline" size="sm" className="w-full"><MessageSquare className="h-3 w-3 mr-1.5" />Open coach</Button></Link>
              <Link to="/proof"><Button size="sm" className="w-full"><Gavel className="h-3 w-3 mr-1.5" />Submit proof</Button></Link>
              <Link to="/sheet"><Button variant="outline" size="sm" className="w-full"><Crosshair className="h-3 w-3 mr-1.5" />Today's Sheet</Button></Link>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setDone(null); setStep(0); }}
              className="w-full"
            >
              <Sparkles className="h-3 w-3 mr-1.5" /> Start another objective
            </Button>
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full text-xs font-mono text-muted-foreground hover:text-foreground"
            >
              ← Back to Today
            </button>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border p-2.5">
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value || <span className="text-muted-foreground italic">—</span>}</div>
    </div>
  );
}

function GatePill({ label }: { label: string }) {
  return (
    <span className="rounded-sm border border-border bg-background/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
      {label}
    </span>
  );
}

function GateSection({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-primary/20 bg-background/40 p-3 min-w-0">
      <div className="font-mono text-[10px] uppercase tracking-widest text-primary">{label}</div>
      <div className="mt-1 text-sm text-wrap-safe">{value}</div>
    </div>
  );
}

function GateList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-sm border border-primary/20 bg-background/40 p-3 min-w-0">
      <div className="font-mono text-[10px] uppercase tracking-widest text-primary">{label}</div>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="break-words">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
