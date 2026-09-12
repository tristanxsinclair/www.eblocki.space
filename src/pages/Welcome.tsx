import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BrainCircuit, Check, FileCheck2, Gavel, ShieldCheck, Sparkles, Target, Trophy } from "lucide-react";
import { toast } from "sonner";
import { EblockiLogo } from "@/components/eblocki/EblockiLogo";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/lib/eblocki/analytics";
import { cn } from "@/lib/utils";

const MODE_BANK = [
  { id: "LAW_MAX", name: "Law", line: "IRAC depth, authority discipline." },
  { id: "PSYCH_HD", name: "Psychology", line: "CAEE depth, post-2016 evidence." },
  { id: "SALES_CLOSE", name: "Sales", line: "Objection scripts, attachment." },
  { id: "EBLOCKI_BUILD", name: "Build", line: "Ship code, refine systems." },
  { id: "ATHLETE_MODE", name: "Athlete", line: "Reps logged, movement noted." },
  { id: "FINANCE_BASICS", name: "Finance", line: "Tracker entries, saving rules." },
  { id: "GENERAL_EXECUTION", name: "General", line: "Resisted tasks, real artifacts." },
] as const;

const GOAL_BANK = [
  "Reduce avoidance",
  "Improve consistency",
  "Increase deep work",
  "Stop fake productivity",
  "Improve study structure",
] as const;

const STEPS = ["System", "Arenas", "Targets", "Proof", "Progression"] as const;

export default function Welcome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedModes, setSelectedModes] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void logEvent("welcome_started");
  }, []);

  useEffect(() => {
    void logEvent("welcome_step_viewed", { step: STEPS[step] });
  }, [step]);

  const canAdvance = useMemo(() => {
    if (step === 1) return selectedModes.length > 0;
    if (step === 2) return selectedGoals.length > 0;
    return true;
  }, [step, selectedGoals, selectedModes]);

  const toggle = (list: string[], value: string, setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const finish = async (skipped = false) => {
    if (!user) return;
    setSubmitting(true);
    try {
      if (selectedModes.length > 0) {
        const rows = selectedModes.map((modeId) => {
          const meta = MODE_BANK.find((mode) => mode.id === modeId)!;
          return {
            user_id: user.id,
            mode_id: modeId,
            display_name: meta.name,
            description: meta.line,
            is_active: true,
            is_default: modeId === selectedModes[0],
          };
        });
        await supabase.from("user_modes").upsert(rows, { onConflict: "user_id,mode_id" });
      }

      await supabase
        .from("user_onboarding_profiles")
        .upsert(
          {
            user_id: user.id,
            goals: selectedGoals,
            seen_welcome: true,
          },
          { onConflict: "user_id" },
        );

      void logEvent(skipped ? "welcome_skipped" : "welcome_completed", {
        count: selectedModes.length,
      });
      toast.success(skipped ? "Welcome skipped. Start your first quest." : "Your run is ready. Start with proof.");
      navigate("/proof?first=1");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not save preferences.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="operator-surface min-h-screen text-foreground">
      <Seo title="Build Your Eblocki Run" description="Configure a proof-first life game around the arenas and behavioural targets that matter to you." path="/welcome" />

      <header className="operator-chrome border-b safe-top safe-x">
        <div className="container flex min-h-16 items-center justify-between gap-4">
          <EblockiLogo variant="compact" size="md" />
          <button
            onClick={() => finish(true)}
            disabled={submitting}
            className="operator-interactive operator-hit px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            Skip to first proof
          </button>
        </div>
      </header>

      <main className="grid-bg min-h-[calc(100vh-4rem)] safe-x safe-bottom">
        <div className="container grid gap-6 py-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                <span>System setup</span>
                <span>Step {step + 1} of {STEPS.length}</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5" aria-label={`Setup progress: step ${step + 1} of ${STEPS.length}`}>
                {STEPS.map((name, index) => (
                  <div key={name} className="flex flex-1 flex-col gap-2">
                    <div className={cn("h-1 rounded-full transition-colors", index <= step ? "bg-primary" : "bg-muted")} />
                    <span className={cn("hidden font-mono text-[8px] uppercase tracking-wider sm:block", index === step ? "text-primary" : "text-muted-foreground")}>{name}</span>
                  </div>
                ))}
              </div>
            </div>

            {step === 0 && <SystemStep />}
            {step === 1 && <ModesStep selected={selectedModes} toggle={(value) => toggle(selectedModes, value, setSelectedModes)} />}
            {step === 2 && <GoalsStep selected={selectedGoals} toggle={(value) => toggle(selectedGoals, value, setSelectedGoals)} />}
            {step === 3 && <FirstProofStep />}
            {step === 4 && <ProgressionStep />}

            <div className="flex items-center justify-between gap-3 pt-1">
              <Button variant="ghost" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || submitting}>
                Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep((current) => current + 1)} disabled={!canAdvance || submitting}>
                  Continue <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button onClick={() => finish(false)} disabled={submitting}>
                  {submitting ? "Building run…" : "Start first quest"} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          <RunMap step={step} selectedModes={selectedModes.length} selectedGoals={selectedGoals.length} />
        </div>
      </main>
    </div>
  );
}

function SystemStep() {
  return (
    <Card className="operator-panel-accent overflow-hidden">
      <div className="border-b border-border bg-primary/[0.04] px-5 py-3">
        <span className="operator-label-signal">Welcome to Eblocki</span>
      </div>
      <div className="space-y-6 p-5 sm:p-8">
        <div>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Build a life game that cannot lie to you.</h1>
          <p className="operator-body mt-4 max-w-2xl">
            Eblocki turns behaviour into evidence, evidence into a verdict, the verdict into a correction, and repeated correction into a character you actually earned.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <IntroRule number="01" title="Do the work" body="The quest happens outside Eblocki." />
          <IntroRule number="02" title="File the proof" body="No artifact means no progress claim." />
          <IntroRule number="03" title="Raise the standard" body="Strong corrections change what counts next." />
        </div>
      </div>
    </Card>
  );
}

function ModesStep({ selected, toggle }: { selected: string[]; toggle: (value: string) => void }) {
  return (
    <Card className="operator-panel p-5 sm:p-8">
      <div className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /><span className="operator-label-signal">Your arenas</span></div>
      <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">Where do you want proof of growth?</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Pick at least one. Each arena gets its own evidence standard, mastery trail, and future quests.</p>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {MODE_BANK.map((mode) => {
          const active = selected.includes(mode.id);
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => toggle(mode.id)}
              aria-pressed={active}
              className={cn("operator-interactive min-h-20 rounded-md border p-4 text-left transition-colors", active ? "border-primary bg-primary/[0.07]" : "border-border bg-background/35 hover:border-primary/45")}
            >
              <div className="flex items-center justify-between gap-3"><span className="font-semibold">{mode.name}</span>{active && <Check className="h-4 w-4 text-primary" />}</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{mode.line}</p>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function GoalsStep({ selected, toggle }: { selected: string[]; toggle: (value: string) => void }) {
  return (
    <Card className="operator-panel p-5 sm:p-8">
      <div className="flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-primary" /><span className="operator-label-signal">Behavioural targets</span></div>
      <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">What must the system help you change?</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Pick at least one. These targets shape first-week guidance; they do not count as evidence by themselves.</p>
      <div className="mt-6 grid gap-2">
        {GOAL_BANK.map((goal) => {
          const active = selected.includes(goal);
          return (
            <button
              key={goal}
              type="button"
              onClick={() => toggle(goal)}
              aria-pressed={active}
              className={cn("operator-interactive flex min-h-14 items-center justify-between rounded-md border p-4 text-left transition-colors", active ? "border-primary bg-primary/[0.07]" : "border-border bg-background/35 hover:border-primary/45")}
            >
              <span className="text-sm font-medium">{goal}</span>{active && <Check className="h-4 w-4 text-primary" />}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function FirstProofStep() {
  return (
    <Card className="operator-panel p-5 sm:p-8">
      <div className="flex items-center gap-2"><Gavel className="h-4 w-4 text-primary" /><span className="operator-label-signal">First proof cycle</span></div>
      <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">Your first result is a verdict and a correction.</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Bring one artifact from real work. Eblocki keeps the attempt and the next upgrade together.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <ProtocolStep icon={FileCheck2} number="01" title="Submit the artifact" body="Paste or attach the paragraph, answer, notes, log, or shipped change." />
        <ProtocolStep icon={Gavel} number="02" title="Read the verdict" body="See what is observed, what is inferred, and which standard applies." />
        <ProtocolStep icon={Target} number="03" title="Find the decisive gap" body="Work on the one correction most likely to raise the result." />
        <ProtocolStep icon={Sparkles} number="04" title="Submit the stronger attempt" body="Keep both attempts visible and let verified improvement affect progression." />
      </div>
      <p className="mt-5 border-l-2 border-primary/40 pl-3 text-xs italic leading-5 text-muted-foreground">Five minutes is enough to begin. Your artifact remains inside your private proof history under the existing account controls.</p>
    </Card>
  );
}

function ProgressionStep() {
  return (
    <Card className="operator-panel-accent overflow-hidden">
      <div className="border-b border-border bg-primary/[0.04] px-5 py-3"><span className="operator-label-signal">Progression contract</span></div>
      <div className="space-y-5 p-5 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-primary/35 bg-primary/[0.08]"><Trophy className="h-5 w-5 text-primary" /></span>
          <div><h1 className="text-2xl font-semibold sm:text-3xl">Progress feels like a game because the evidence moves.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Your daily route adapts from completed work, Court verdicts, resistance, and neglected domains—not from opening the app.</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <ProgressionRule title="Streak" body="Protected by evidence; weak proof can defend it without pretending to be mastery." />
          <ProgressionRule title="XP + levels" body="Awarded from authoritative verdict events, not client-side animation." />
          <ProgressionRule title="Next quest" body="Targets the weakest useful standard while the evidence is recent." />
        </div>
        <div className="rounded-md border border-primary/25 bg-background/45 p-4"><div className="operator-label-signal">Ready state</div><p className="mt-2 text-sm">Your arenas and targets are configured. One real artifact activates the system.</p></div>
      </div>
    </Card>
  );
}

function RunMap({ step, selectedModes, selectedGoals }: { step: number; selectedModes: number; selectedGoals: number }) {
  return (
    <aside className="operator-panel-accent overflow-hidden lg:sticky lg:top-6" aria-label="Your Eblocki run">
      <div className="border-b border-border bg-primary/[0.04] px-4 py-3"><div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.2em]"><span className="text-primary">Run configuration</span><span className="text-muted-foreground">Preview</span></div></div>
      <div className="p-5">
        <div className="operator-label-signal">Rookie operator</div>
        <h2 className="mt-1 text-xl font-semibold">First run loading</h2>
        <div className="mt-5 space-y-1.5">
          {STEPS.map((name, index) => {
            const state = index < step ? "complete" : index === step ? "current" : "locked";
            return (
              <div key={name} className={cn("flex min-h-12 items-center gap-3 rounded-md border px-3", state === "current" ? "border-primary bg-primary/[0.06]" : "border-border bg-background/35")}>
                <span className={cn("grid h-6 w-6 place-items-center rounded-full border font-mono text-[9px]", state === "complete" ? "border-primary bg-primary text-primary-foreground" : state === "current" ? "border-primary text-primary" : "border-border text-muted-foreground")}>
                  {state === "complete" ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                <div><div className="text-xs font-medium">{name}</div><div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">{state}</div></div>
              </div>
            );
          })}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <RunMetric label="Arenas" value={String(selectedModes)} />
          <RunMetric label="Targets" value={String(selectedGoals)} />
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> No artifact // no XP</div>
      </div>
    </aside>
  );
}

function IntroRule({ number, title, body }: { number: string; title: string; body: string }) {
  return <div className="operator-panel p-4"><div className="operator-label-signal">{number}</div><h2 className="mt-2 font-semibold">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p></div>;
}

function ProtocolStep({ icon: Icon, number, title, body }: { icon: typeof Target; number: string; title: string; body: string }) {
  return <div className="operator-panel p-4"><div className="flex items-center justify-between"><span className="operator-label">{number}</span><Icon className="h-4 w-4 text-primary" /></div><h2 className="mt-3 font-semibold">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p></div>;
}

function ProgressionRule({ title, body }: { title: string; body: string }) {
  return <div className="rounded-md border border-border bg-background/35 p-4"><div className="operator-label-signal">{title}</div><p className="mt-2 text-xs leading-5 text-muted-foreground">{body}</p></div>;
}

function RunMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-border bg-background/35 p-3"><div className="operator-number text-xl font-semibold">{value}</div><div className="operator-label mt-1">{label}</div></div>;
}
