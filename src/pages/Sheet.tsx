import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import type { BehaviouralState } from "@/lib/eblocki/states";
import { STATE_LABELS } from "@/lib/eblocki/states";
import { Seo } from "@/components/Seo";
import { Link } from "react-router-dom";
import { MissionCard } from "@/components/eblocki/MissionCard";
import { useMomentum } from "@/hooks/useMomentum";
import { useDailyObjectives } from "@/hooks/useDailyObjectives";
import { STATE_COPY, nextBestAction } from "@/lib/eblocki/momentum";
import { MODE_LABELS, type Mode } from "@/lib/eblocki/modes";
import { cn } from "@/lib/utils";
import { Flame, Snowflake, ChevronDown, ShieldCheck, Sparkles } from "lucide-react";

const FIELDS: { key: string; label: string; section: "core" | "audit"; placeholder: string }[] = [
  { key: "prime_objective", label: "Prime Objective", section: "core",
    placeholder: "What is the one objective that would make today count?" },
  { key: "law_proof", label: "Law Proof", section: "core",
    placeholder: "What concrete law artifact will you produce today (e.g. one IRAC answer)?" },
  { key: "psychology_proof", label: "Psychology Proof", section: "core",
    placeholder: "What CAEE paragraph or applied artifact will you produce?" },
  { key: "eblocki_proof", label: "Eblocki Proof", section: "core",
    placeholder: "What proof shows the Eblocki standard held today?" },
  { key: "friction_task", label: "Friction Task", section: "core",
    placeholder: "What is the highest-friction task you would normally avoid?" },
  { key: "avoidance_signal", label: "Avoidance Signal", section: "core",
    placeholder: "What behaviour would prove you are dodging the real task?" },
  { key: "next_best_action", label: "Next Best Action", section: "core",
    placeholder: "What is the smallest action that creates evidence right now?" },
  { key: "end_output", label: "End Output", section: "audit",
    placeholder: "What did you actually produce today?" },
  { key: "end_proof", label: "End Proof", section: "audit",
    placeholder: "What artifact would survive the Court of Evidence?" },
  { key: "end_avoidance", label: "End Avoidance", section: "audit",
    placeholder: "Where did avoidance show up today?" },
  { key: "end_pattern", label: "End Pattern", section: "audit",
    placeholder: "What pattern repeats and needs an upgrade?" },
  { key: "tomorrow_first_move", label: "Tomorrow's First Move", section: "audit",
    placeholder: "First controllable action for tomorrow morning." },
];

const STATES: BehaviouralState[] = ["locked_in","momentum","strategic_build","scattered","avoidant","overloaded","low_energy","hype_drift","academic_displacement","recovery"];

export default function Sheet() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<any>({ sheet_date: today, state: "" });
  const [saving, setSaving] = useState(false);
  const [proofs, setProofs] = useState<any[]>([]);
  const [activeMode, setActiveMode] = useState<string | null>(null);

  const { snapshot, refresh: refreshMomentum } = useMomentum();
  const { objectives, complete, skip, refresh: refreshObj } = useDailyObjectives();

  useEffect(() => {
    if (!user) return;
    supabase.from("daily_control_sheets").select("*").eq("user_id", user.id).eq("sheet_date", today).maybeSingle()
      .then(({ data }) => { if (data) setForm(data); });
    supabase
      .from("proof_artifacts")
      .select("id,title,domain,evidence_strength,quality_score,created_at,resistance_overcome")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12)
      .then(({ data }) => setProofs(data ?? []));
    supabase
      .from("user_modes")
      .select("mode_id,is_default")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .limit(1)
      .then(({ data }) => setActiveMode(data?.[0]?.mode_id ?? null));
  }, [user, today]);

  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = { ...form, user_id: user.id, sheet_date: today };
      delete payload.id; delete payload.created_at; delete payload.updated_at;
      const { error } = await supabase.from("daily_control_sheets").upsert(payload, { onConflict: "user_id,sheet_date" });
      if (error) throw error;
      toast.success("Sheet saved.");
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const createContract = async () => {
    if (!user || !form.prime_objective) return toast.error("Set a Prime Objective first.");
    const { error } = await supabase.from("proof_commitments").insert({
      user_id: user.id,
      domain: "discipline", mode: "EBLOCKI",
      title: form.prime_objective,
      required_artifact: "Concrete output proving the prime objective shipped.",
      evidence_standard: "State / Bottleneck / Artifact / Reflection / Next upgrade",
      status: "pending",
    });
    if (error) toast.error(error.message);
    else toast.success("Proof Contract created from prime objective.");
  };

  const handleComplete = async (id: string) => {
    try { await complete(id); await refreshMomentum(); } catch { /* surfaced in card */ }
  };
  const handleSkip = async (id: string) => { await skip(id); await refreshObj(); };

  const safeSnap = snapshot ?? {
    state: "cold" as const,
    momentum_score: 0, streak_days: 0, longest_streak: 0, freeze_tokens: 0,
    proofs_today: 0, resistance_overcome: 0, avg_quality: 0,
    identity_signal: "Submit one artifact to begin.",
    last_proof_at: null, hours_since_proof: Infinity,
  };
  const stateMeta = STATE_COPY[safeSnap.state];
  const coachLine = nextBestAction(safeSnap);
  const openObjectives = objectives.filter((o) => o.status === "pending" || o.status === "active");
  const primary = openObjectives[0];
  const secondary = openObjectives.slice(1);
  const doneCount = objectives.filter((o) => o.status === "completed").length;

  const dateLabel = useMemo(() =>
    new Date(today).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
  [today]);

  const stateAccent =
    safeSnap.state === "at_risk" ? "text-destructive" :
    safeSnap.state === "elite" || safeSnap.state === "momentum" ? "text-primary" :
    "text-muted-foreground";

  return (
    <AppShell>
      <Seo
        title="Daily Control Sheet | EBLOCKI"
        description="Plan the day's prime objective and audit the receipts at end of day. The sheet feeds the proof loop."
        path="/sheet"
      />
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8 motion-calm">
        {/* 1. FOCUS HEADER — calm, high-signal, large type */}
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              Control Sheet · {dateLabel}
            </span>
            <div className="flex items-center gap-2">
              {activeMode && (
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-sm bg-muted/60 text-foreground/80">
                  {MODE_LABELS[activeMode as Mode] ?? activeMode}
                </span>
              )}
              <span className={cn(
                "font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-sm bg-muted/40",
                stateAccent,
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
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
            {coachLine}
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            {safeSnap.identity_signal}
          </p>
        </header>

        {/* 2. MOMENTUM SNAPSHOT — 5 metrics, grouped, calm */}
        <section aria-label="Momentum snapshot">
          <Card className="panel p-4 md:p-5 border-border/60">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Metric label="Momentum" value={safeSnap.momentum_score} suffix="/100" accent />
              <Metric label="Proofs today" value={safeSnap.proofs_today} />
              <Metric label="Avg depth" value={(safeSnap.avg_quality ?? 0).toFixed(1)} suffix="/10" />
              <Metric label="Resistance" value={safeSnap.resistance_overcome} />
              <Metric
                label="Streak"
                value={safeSnap.streak_days}
                suffix="d"
                hint={safeSnap.freeze_tokens > 0 ? `${safeSnap.freeze_tokens} freeze` : undefined}
              />
            </div>
          </Card>
        </section>

        {/* 3. PRIMARY MISSION — visually dominant anchor */}
        <section aria-label="Primary mission" className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary">
              Primary mission
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {doneCount}/{objectives.length} closed
            </span>
          </div>
          {primary ? (
            <div className="relative">
              <div className="absolute -inset-px rounded-xl bg-gradient-to-b from-primary/15 to-transparent pointer-events-none" />
              <div className="relative">
                <MissionCard objective={primary} onComplete={handleComplete} onSkip={handleSkip} />
              </div>
            </div>
          ) : (
            <Card className="panel p-6 border-border/60 text-sm text-muted-foreground">
              {objectives.length === 0
                ? "No objectives seeded today. Open the Coach to forge one."
                : "All objectives closed. Protect the win — rest deliberately."}
            </Card>
          )}
        </section>

        {/* 4. SECONDARY MISSIONS — collapsed by default */}
        {secondary.length > 0 && (
          <section aria-label="Secondary missions">
            <Accordion type="single" collapsible>
              <AccordionItem value="secondary" className="border-border/60">
                <AccordionTrigger className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground hover:no-underline py-3">
                  Secondary missions · {secondary.length}
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  {secondary.map((o) => (
                    <div key={o.id} className="opacity-90">
                      <MissionCard objective={o} onComplete={handleComplete} onSkip={handleSkip} />
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>
        )}

        {/* 5. PROOF STREAM — evidence feed */}
        <section aria-label="Proof stream" className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary inline-flex items-center gap-2">
              <ShieldCheck className="h-3 w-3" /> Proof stream
            </span>
            <Link to="/proof" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
              Court of evidence →
            </Link>
          </div>
          {proofs.length === 0 ? (
            <Card className="panel p-5 border-border/60 text-sm text-muted-foreground">
              No evidence yet. The court has no record of you.
            </Card>
          ) : (
            <ol className="relative border-l border-border/60 pl-4 space-y-3">
              {proofs.slice(0, 8).map((p) => (
                <li key={p.id} className="relative">
                  <span className={cn(
                    "absolute -left-[21px] top-2 h-2 w-2 rounded-full",
                    p.evidence_strength === "elite" ? "bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.18)]" :
                    p.evidence_strength === "strong" ? "bg-primary/70" :
                    "bg-muted-foreground/40",
                  )} />
                  <div className="flex items-start justify-between gap-3 rounded-md border border-border/50 bg-card/50 px-3 py-2.5 hover:border-primary/30 transition-colors">
                    <div className="min-w-0">
                      <div className="text-sm truncate">{p.title}</div>
                      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span>{new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        {p.domain && <span>· {p.domain}</span>}
                        {p.resistance_overcome ? <span>· R{p.resistance_overcome}</span> : null}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {p.evidence_strength && (
                        <div className={cn(
                          "font-mono text-[10px] uppercase tracking-widest",
                          p.evidence_strength === "elite" ? "text-primary" :
                          p.evidence_strength === "strong" ? "text-foreground" :
                          "text-muted-foreground",
                        )}>{p.evidence_strength}</div>
                      )}
                      {typeof p.quality_score === "number" && (
                        <div className="text-xs text-muted-foreground">{p.quality_score}/10</div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* 6. REFLECTION / RECOVERY — progressive, calmer */}
        <section aria-label="Reflection" className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary inline-flex items-center gap-2">
              <Sparkles className="h-3 w-3" /> Reflection
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={createContract} className="font-mono text-[10px] uppercase tracking-widest">
                Contract this
              </Button>
              <Button size="sm" onClick={save} disabled={saving} className="font-mono text-[10px] uppercase tracking-widest">
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>

          <Card className="panel p-5 md:p-6 border-border/60 space-y-5">
            {/* Always-visible: prime objective + next action */}
            <ReflectionField
              id="prime_objective"
              label="One thing that would make today count"
              value={form.prime_objective ?? ""}
              onChange={(v) => set("prime_objective", v)}
              placeholder="State it plainly. No hedging."
              large
            />
            <ReflectionField
              id="next_best_action"
              label="Smallest action that creates evidence right now"
              value={form.next_best_action ?? ""}
              onChange={(v) => set("next_best_action", v)}
              placeholder="A 20-minute move you can start without thinking."
            />

            <Accordion type="multiple" className="space-y-1">
              <AccordionItem value="proof" className="border-border/40">
                <AccordionTrigger className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground hover:no-underline py-3">
                  Proof expectations · 3
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <ReflectionField id="law_proof" label="Law proof" value={form.law_proof ?? ""} onChange={(v) => set("law_proof", v)} placeholder="One IRAC answer, one case note, one statute analysis." />
                  <ReflectionField id="psychology_proof" label="Psychology proof" value={form.psychology_proof ?? ""} onChange={(v) => set("psychology_proof", v)} placeholder="One CAEE paragraph or applied artifact." />
                  <ReflectionField id="eblocki_proof" label="Eblocki proof" value={form.eblocki_proof ?? ""} onChange={(v) => set("eblocki_proof", v)} placeholder="What proves the standard held today?" />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="friction" className="border-border/40">
                <AccordionTrigger className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground hover:no-underline py-3">
                  Friction & avoidance
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <ReflectionField id="friction_task" label="Highest-friction task" value={form.friction_task ?? ""} onChange={(v) => set("friction_task", v)} placeholder="The one you'd normally dodge." />
                  <ReflectionField id="avoidance_signal" label="Avoidance signal" value={form.avoidance_signal ?? ""} onChange={(v) => set("avoidance_signal", v)} placeholder="What behaviour would prove you're avoiding?" />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="audit" className="border-border/40">
                <AccordionTrigger className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground hover:no-underline py-3">
                  End-of-day audit
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <ReflectionField id="end_output" label="What you produced" value={form.end_output ?? ""} onChange={(v) => set("end_output", v)} placeholder="Honest output, not effort." />
                  <ReflectionField id="end_proof" label="What would survive the court" value={form.end_proof ?? ""} onChange={(v) => set("end_proof", v)} placeholder="The artifact that proves it." />
                  <ReflectionField id="end_avoidance" label="Where avoidance appeared" value={form.end_avoidance ?? ""} onChange={(v) => set("end_avoidance", v)} placeholder="Name the pattern without judgement." />
                  <ReflectionField id="end_pattern" label="Pattern to upgrade" value={form.end_pattern ?? ""} onChange={(v) => set("end_pattern", v)} placeholder="What repeats and needs to change?" />
                  <ReflectionField id="tomorrow_first_move" label="Tomorrow's first move" value={form.tomorrow_first_move ?? ""} onChange={(v) => set("tomorrow_first_move", v)} placeholder="One controllable opening action." />
                  <div>
                    <Label htmlFor="sheet-state" className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Self-diagnosed state</Label>
                    <select
                      id="sheet-state"
                      value={form.state ?? ""}
                      onChange={(e) => set("state", e.target.value)}
                      className="mt-2 w-full rounded-md border border-input bg-background/40 px-3 py-2 text-sm transition-colors hover:border-primary/40 focus:border-primary/60 focus:outline-none"
                    >
                      <option value="">—</option>
                      {STATES.map(s => <option key={s} value={s}>{STATE_LABELS[s] ?? s}</option>)}
                    </select>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </section>

        {/* 7. DEEP ANALYTICS — expandable, off the main surface */}
        <section aria-label="Deep analytics">
          <Accordion type="single" collapsible>
            <AccordionItem value="analytics" className="border-border/60">
              <AccordionTrigger className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground hover:no-underline py-3">
                <span className="inline-flex items-center gap-2">
                  <ChevronDown className="h-3 w-3 opacity-0" /> {/* spacing twin */}
                  Deep analytics & calibration
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Metric label="Longest streak" value={safeSnap.longest_streak} suffix="d" />
                  <Metric label="Freeze tokens" value={safeSnap.freeze_tokens} icon={<Snowflake className="h-3 w-3" />} />
                  <Metric label="Hours since proof" value={Number.isFinite(safeSnap.hours_since_proof) ? Math.round(safeSnap.hours_since_proof) : "—"} suffix={Number.isFinite(safeSnap.hours_since_proof) ? "h" : ""} />
                  <Metric label="Proofs (recent)" value={proofs.length} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to="/dashboard"><Button variant="outline" size="sm" className="font-mono text-[10px] uppercase tracking-widest">Open dashboard</Button></Link>
                  <Link to="/start"><Button variant="outline" size="sm" className="font-mono text-[10px] uppercase tracking-widest">Start today flow</Button></Link>
                  <Link to="/coach"><Button variant="outline" size="sm" className="font-mono text-[10px] uppercase tracking-widest">Coach</Button></Link>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({
  label, value, suffix, accent, icon, hint,
}: { label: string; value: number | string; suffix?: string; accent?: boolean; icon?: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-md bg-muted/20 border border-border/40 px-3 py-3 transition-colors hover:border-border">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
        {icon}{label}
      </div>
      <div className={cn(
        "mt-1 text-2xl md:text-[26px] font-semibold tabular-nums leading-none",
        accent ? "text-primary" : "text-foreground",
      )}>
        {value}
        {suffix && <span className="text-sm text-muted-foreground font-normal ml-0.5">{suffix}</span>}
      </div>
      {hint && <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{hint}</div>}
    </div>
  );
}

function ReflectionField({
  id, label, value, onChange, placeholder, large,
}: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder: string; large?: boolean }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`sheet-${id}`} className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </Label>
      <Textarea
        id={`sheet-${id}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={large ? 2 : 2}
        className={cn(
          "resize-none bg-background/40 border-border/50 transition-colors hover:border-primary/30 focus-visible:border-primary/50 focus-visible:ring-0",
          large && "text-base md:text-lg leading-relaxed py-3",
        )}
      />
    </div>
  );
}
