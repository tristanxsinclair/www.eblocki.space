import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/eblocki/AppShell";
import { OperatorChip } from "@/components/eblocki/OperatorChip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { Seo } from "@/components/Seo";
import { useMomentum } from "@/hooks/useMomentum";
import { STATE_COPY } from "@/lib/eblocki/momentum";
import { cn } from "@/lib/utils";
import { Flame, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";

/**
 * Daily Operating Command Centre.
 *
 * Six-section behavioural loop:
 *  1. Prime Objective
 *  2. Proof Required
 *  3. State Snapshot
 *  4. Friction Task
 *  5. Next Best Action (deterministic suggestion + user-owned commitment)
 *  6. End-of-Day Audit
 *
 * Persists to `daily_control_sheets` (existing columns only). Energy/focus
 * and proof-shape inputs are ephemeral session state — they feed the
 * deterministic Next Best Action recommendation without faking storage.
 */

type Domain = "law" | "psychology" | "sales" | "soccer" | "eblocki" | "finance" | "life";
const DOMAINS: { id: Domain; label: string }[] = [
  { id: "law", label: "Law" },
  { id: "psychology", label: "Psychology" },
  { id: "sales", label: "Sales" },
  { id: "soccer", label: "Soccer" },
  { id: "eblocki", label: "Eblocki" },
  { id: "finance", label: "Finance" },
  { id: "life", label: "Life" },
];

type ProofLevel = "contact" | "output" | "depth" | "pressure" | "transfer" | "identity";
const PROOF_LEVELS: { id: ProofLevel; label: string; hint: string }[] = [
  { id: "contact", label: "Contact", hint: "Touched the work" },
  { id: "output", label: "Output", hint: "Produced an artifact" },
  { id: "depth", label: "Depth", hint: "Applied + reasoned" },
  { id: "pressure", label: "Pressure", hint: "Held under load" },
  { id: "transfer", label: "Transfer", hint: "Used across contexts" },
  { id: "identity", label: "Identity", hint: "Repeated, owned" },
];

interface NbaSuggestion {
  action: string;
  reason: string;
  effort: string;
}

/** Deterministic Next Best Action — never fakes AI. */
function recommendNextAction(input: {
  primeObjective: string;
  proofsToday: number;
  avgQuality: number;
  state: string;
  energy: number;
  focus: number;
  frictionTask: string;
  frictionDone: boolean;
}): NbaSuggestion {
  const { primeObjective, proofsToday, avgQuality, state, energy, focus, frictionTask, frictionDone } = input;

  if (!primeObjective.trim()) {
    return {
      action: "Define one prime objective.",
      reason: "Without a target, the day fragments into reaction.",
      effort: "60 seconds.",
    };
  }
  if (state === "at_risk") {
    return {
      action: "Submit one minimum-viable proof before the day ends.",
      reason: "Streak at risk. The artifact protects the pattern.",
      effort: "10 focused minutes.",
    };
  }
  if (proofsToday === 0) {
    if (energy <= 3 || focus <= 3) {
      return {
        action: "Run a 10-minute proof sprint on the smallest visible artifact.",
        reason: "Low energy. Minimum viable proof beats a missed day.",
        effort: "10 minutes. One artifact.",
      };
    }
    return {
      action: "Produce the first proof artifact for the prime objective.",
      reason: "No artifact yet. Reading is exposure; output is evidence.",
      effort: "25-minute focused block.",
    };
  }
  if (frictionTask.trim() && !frictionDone) {
    return {
      action: "Execute the smallest visible version of the friction task.",
      reason: "Avoidance compounds. Friction marks the growth edge.",
      effort: "Shrink it until you can start in under 2 minutes.",
    };
  }
  if (avgQuality > 0 && avgQuality < 6) {
    return {
      action: "Deepen one existing artifact instead of starting a new one.",
      reason: "Volume is there. Quality is the bottleneck.",
      effort: "20 minutes on depth, not coverage.",
    };
  }
  if (state === "momentum" || state === "elite") {
    return {
      action: "Convert momentum into one high-resistance artifact.",
      reason: "Strong day. Raise depth, not volume.",
      effort: "One 45-minute block on hard work.",
    };
  }
  return {
    action: "Stack one more proof artifact today.",
    reason: "Pattern reinforces by repetition under load.",
    effort: "25 minutes, then audit.",
  };
}

const SECTION_LABEL = "font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground";
const SECTION_ACCENT = "font-mono text-[10px] uppercase tracking-[0.28em] text-primary";

export default function Sheet() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const { snapshot } = useMomentum();

  // Persisted DCS fields
  const [primeObjective, setPrimeObjective] = useState("");
  const [frictionTask, setFrictionTask] = useState("");
  const [avoidanceSignal, setAvoidanceSignal] = useState("");
  const [nextBestAction, setNextBestAction] = useState("");
  const [endOutput, setEndOutput] = useState("");
  const [endProof, setEndProof] = useState("");
  const [endAvoidance, setEndAvoidance] = useState("");
  const [endPattern, setEndPattern] = useState("");
  const [tomorrowFirstMove, setTomorrowFirstMove] = useState("");

  // Ephemeral session state — feeds the recommendation, no DB column.
  const [domain, setDomain] = useState<Domain>("eblocki");
  const [proofDescription, setProofDescription] = useState("");
  const [proofLevel, setProofLevel] = useState<ProofLevel>("output");
  const [proofQuality, setProofQuality] = useState<number>(3);
  const [energy, setEnergy] = useState(5);
  const [focus, setFocus] = useState(5);
  const [frictionDone, setFrictionDone] = useState(false);

  const [todayProofs, setTodayProofs] = useState<Array<{ id: string; title: string; quality_score: number | null }>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("daily_control_sheets")
      .select("*")
      .eq("user_id", user.id)
      .eq("sheet_date", today)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setPrimeObjective(data.prime_objective ?? "");
        setFrictionTask(data.friction_task ?? "");
        setAvoidanceSignal(data.avoidance_signal ?? "");
        setNextBestAction(data.next_best_action ?? "");
        setEndOutput(data.end_output ?? "");
        setEndProof(data.end_proof ?? "");
        setEndAvoidance(data.end_avoidance ?? "");
        setEndPattern(data.end_pattern ?? "");
        setTomorrowFirstMove(data.tomorrow_first_move ?? "");
      });
    void supabase
      .from("proof_artifacts")
      .select("id, title, quality_score, created_at")
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00.000Z`)
      .order("created_at", { ascending: false })
      .then(({ data }) => setTodayProofs(data ?? []));
  }, [user, today]);

  const dateLabel = useMemo(
    () => new Date(today).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
    [today],
  );

  const safeSnap = snapshot ?? {
    state: "cold" as const,
    momentum_score: 0,
    streak_days: 0,
    proofs_today: todayProofs.length,
    avg_quality: 0,
    identity_signal: "Submit one artifact to begin.",
  };
  const stateMeta = STATE_COPY[safeSnap.state];
  const proofsToday = Math.max(safeSnap.proofs_today, todayProofs.length);
  const proofSubmitted = proofsToday > 0;

  const recommendation = useMemo(
    () =>
      recommendNextAction({
        primeObjective,
        proofsToday,
        avgQuality: safeSnap.avg_quality ?? 0,
        state: safeSnap.state,
        energy,
        focus,
        frictionTask,
        frictionDone,
      }),
    [primeObjective, proofsToday, safeSnap.avg_quality, safeSnap.state, energy, focus, frictionTask, frictionDone],
  );

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("daily_control_sheets").upsert(
        {
          user_id: user.id,
          sheet_date: today,
          prime_objective: primeObjective || null,
          friction_task: frictionTask || null,
          avoidance_signal: avoidanceSignal || null,
          next_best_action: nextBestAction || null,
          end_output: endOutput || null,
          end_proof: endProof || null,
          end_avoidance: endAvoidance || null,
          end_pattern: endPattern || null,
          tomorrow_first_move: tomorrowFirstMove || null,
        },
        { onConflict: "user_id,sheet_date" },
      );
      if (error) throw error;
      toast.success("Day captured.");
    } catch (e: any) {
      toast.error(e.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const adoptRecommendation = () => setNextBestAction(recommendation.action);

  return (
    <AppShell>
      <Seo
        title="Daily Operating Command Centre | EBLOCKI"
        description="Define one prime objective, submit proof, audit the day. The behavioural evidence loop."
        path="/sheet"
      />
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6 motion-calm">
        {/* HEADER — Today */}
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className={SECTION_LABEL}>Today · {dateLabel}</span>
            <div className="flex items-center gap-2">
              <OperatorChip />
              <span className={cn("font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-sm bg-muted/40",
                safeSnap.state === "at_risk" ? "text-destructive" : "text-foreground/80",
              )}>
                {stateMeta.label}
              </span>
              {safeSnap.streak_days >= 1 && (
                <span className={cn(
                  "inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest",
                  safeSnap.state === "at_risk" ? "text-destructive" : "text-primary",
                )}>
                  <Flame className="h-3 w-3" />{safeSnap.streak_days}d
                </span>
              )}
              <span className={cn(
                "inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest",
                proofSubmitted ? "text-primary" : "text-muted-foreground",
              )}>
                <ShieldCheck className="h-3 w-3" />{proofsToday} proof{proofsToday === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
            Today is judged by proof, not intention.
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            One artifact makes the day count. No artifact, no progress claim.
          </p>
        </header>

        {/* 1. PRIME OBJECTIVE — visual anchor */}
        <section aria-label="Prime objective" className="space-y-3">
          <span className={SECTION_ACCENT}>01 · Prime Objective</span>
          <div className="relative">
            <div className="absolute -inset-px rounded-xl bg-gradient-to-b from-primary/15 to-transparent pointer-events-none" />
            <Card className="relative panel p-5 md:p-6 border-border/60 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prime" className={SECTION_LABEL}>
                  What output makes today count?
                </Label>
                <Textarea
                  id="prime"
                  value={primeObjective}
                  onChange={(e) => setPrimeObjective(e.target.value)}
                  placeholder="One prime objective. Everything else is secondary."
                  rows={2}
                  className="resize-none bg-background/40 border-border/50 text-base md:text-lg leading-relaxed focus-visible:ring-0 focus-visible:border-primary/50"
                />
              </div>
              <div>
                <span className={SECTION_LABEL}>Domain</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {DOMAINS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDomain(d.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-sm font-mono text-[10px] uppercase tracking-widest border transition-colors",
                        domain === d.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* 2. PROOF REQUIRED */}
        <section aria-label="Proof required" className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={SECTION_ACCENT}>02 · Proof Required</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {proofSubmitted ? "Submitted" : "Pending"}
            </span>
          </div>
          <Card className={cn(
            "panel p-5 border-border/60 space-y-4",
            proofSubmitted && "border-primary/40",
          )}>
            <p className="text-sm text-muted-foreground italic">
              No artifact, no progress claim. What exists outside your head?
            </p>
            <div className="space-y-2">
              <Label htmlFor="proof-desc" className={SECTION_LABEL}>Proof description</Label>
              <Textarea
                id="proof-desc"
                value={proofDescription}
                onChange={(e) => setProofDescription(e.target.value)}
                placeholder="The artifact you will submit. Concrete and visible."
                rows={2}
                className="resize-none bg-background/40 border-border/50"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <span className={SECTION_LABEL}>Level</span>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {PROOF_LEVELS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProofLevel(p.id)}
                      title={p.hint}
                      className={cn(
                        "px-2 py-1.5 rounded-sm font-mono text-[10px] uppercase tracking-widest border transition-colors",
                        proofLevel === p.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className={SECTION_LABEL}>Quality target · {proofQuality}/5</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={proofQuality}
                  onChange={(e) => setProofQuality(parseInt(e.target.value, 10))}
                  className="mt-3 w-full accent-primary"
                />
                <div className="mt-1 flex justify-between font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  <span>contact</span><span>elite</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Today: {proofsToday} submitted
              </span>
              <Link to="/proof">
                <Button size="sm" className="font-mono text-[10px] uppercase tracking-widest">
                  Submit artifact <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            {todayProofs.length > 0 && (
              <ul className="space-y-1.5 pt-1">
                {todayProofs.slice(0, 3).map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                    <span className="truncate">{p.title}</span>
                    {typeof p.quality_score === "number" && (
                      <span className="ml-auto font-mono text-[10px] text-muted-foreground">{p.quality_score}/10</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        {/* 3. STATE SNAPSHOT */}
        <section aria-label="State snapshot" className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={SECTION_ACCENT}>03 · State Snapshot</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {stateMeta.label}
            </span>
          </div>
          <Card className="panel p-5 border-border/60 space-y-4">
            <SliderRow label="Energy" value={energy} onChange={setEnergy} />
            <SliderRow label="Focus" value={focus} onChange={setFocus} />
            <p className="text-xs text-muted-foreground border-t border-border/40 pt-3 leading-relaxed">
              {stateMeta.tone}
            </p>
          </Card>
        </section>

        {/* 4. FRICTION TASK */}
        <section aria-label="Friction task" className="space-y-3">
          <span className={SECTION_ACCENT}>04 · Friction Task</span>
          <Card className="panel p-5 border-border/60 space-y-4">
            <p className="text-sm text-muted-foreground italic">
              The avoided task is the signal. Shrink it until it becomes executable.
            </p>
            <div className="space-y-2">
              <Label htmlFor="friction" className={SECTION_LABEL}>What you would normally dodge</Label>
              <Input
                id="friction"
                value={frictionTask}
                onChange={(e) => setFrictionTask(e.target.value)}
                placeholder="Name it plainly."
                className="bg-background/40 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avoidance" className={SECTION_LABEL}>What avoidance looks like today</Label>
              <Input
                id="avoidance"
                value={avoidanceSignal}
                onChange={(e) => setAvoidanceSignal(e.target.value)}
                placeholder="The tell. Re-organising notes, scrolling, planning instead of executing."
                className="bg-background/40 border-border/50"
              />
            </div>
            <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={frictionDone}
                onChange={(e) => setFrictionDone(e.target.checked)}
                className="accent-primary h-4 w-4"
              />
              <span className="text-sm">Friction task executed</span>
            </label>
          </Card>
        </section>

        {/* 5. NEXT BEST ACTION — deterministic suggestion */}
        <section aria-label="Next best action" className="space-y-3">
          <span className={SECTION_ACCENT}>05 · Next Best Action</span>
          <Card className="panel p-5 border-primary/30 bg-primary/[0.03] space-y-4">
            <div className="space-y-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                System recommendation
              </span>
              <p className="text-base md:text-lg leading-snug font-medium">
                {recommendation.action}
              </p>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className={SECTION_LABEL}>Reason</dt>
                  <dd className="mt-1 text-muted-foreground leading-relaxed">{recommendation.reason}</dd>
                </div>
                <div>
                  <dt className={SECTION_LABEL}>Effort</dt>
                  <dd className="mt-1 text-muted-foreground leading-relaxed">{recommendation.effort}</dd>
                </div>
              </dl>
              <Button
                variant="outline"
                size="sm"
                onClick={adoptRecommendation}
                className="font-mono text-[10px] uppercase tracking-widest"
              >
                Adopt as commitment
              </Button>
            </div>
            <div className="space-y-2 pt-3 border-t border-border/40">
              <Label htmlFor="nba" className={SECTION_LABEL}>Your committed action</Label>
              <Textarea
                id="nba"
                value={nextBestAction}
                onChange={(e) => setNextBestAction(e.target.value)}
                placeholder="A 20-minute move you can start without thinking."
                rows={2}
                className="resize-none bg-background/40 border-border/50"
              />
            </div>
          </Card>
        </section>

        {/* 6. END-OF-DAY AUDIT — progressive disclosure */}
        <section aria-label="End-of-day audit" className="space-y-3">
          <Accordion type="single" collapsible>
            <AccordionItem value="audit" className="border-border/60">
              <AccordionTrigger className={cn(SECTION_ACCENT, "hover:no-underline py-3")}>
                06 · End-of-Day Audit
              </AccordionTrigger>
              <AccordionContent>
                <Card className="panel p-5 border-border/60 space-y-4 mt-2">
                  <p className="text-sm text-muted-foreground italic">
                    Close the loop before the day ends. What actually happened?
                  </p>
                  <AuditField id="out" label="Output" placeholder="What you actually produced — not what you planned."
                    value={endOutput} onChange={setEndOutput} />
                  <AuditField id="prf" label="Proof" placeholder="The artifact that would survive scrutiny."
                    value={endProof} onChange={setEndProof} />
                  <AuditField id="avd" label="Avoidance" placeholder="Where avoidance showed up. Name it without judgement."
                    value={endAvoidance} onChange={setEndAvoidance} />
                  <AuditField id="pat" label="Pattern" placeholder="What repeated and needs an upgrade."
                    value={endPattern} onChange={setEndPattern} />
                  <AuditField id="tom" label="Tomorrow's first move" placeholder="One controllable opening action."
                    value={tomorrowFirstMove} onChange={setTomorrowFirstMove} />
                </Card>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Save bar */}
        <div className="sticky bottom-4 z-10 flex justify-end pt-2">
          <Button
            size="sm"
            onClick={save}
            disabled={saving}
            className="font-mono text-[10px] uppercase tracking-widest shadow-lg"
          >
            {saving ? "Saving…" : "Save day"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className={SECTION_LABEL}>{label}</span>
        <span className="font-mono text-xs tabular-nums text-foreground">{value}/10</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="mt-2 w-full accent-primary"
      />
    </div>
  );
}

function AuditField({
  id, label, value, onChange, placeholder,
}: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`audit-${id}`} className={SECTION_LABEL}>{label}</Label>
      <Textarea
        id={`audit-${id}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="resize-none bg-background/40 border-border/50 focus-visible:ring-0 focus-visible:border-primary/50"
      />
    </div>
  );
}