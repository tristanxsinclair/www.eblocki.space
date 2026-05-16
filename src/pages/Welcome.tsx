import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Check, ShieldCheck, Sparkles, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { logEvent } from "@/lib/eblocki/analytics";
import { Seo } from "@/components/Seo";

/**
 * Short, premium welcome flow. Five steps, <2 minutes, ends by seeding
 * the user's selected modes + a tiny first proof mission and dropping
 * them on the dashboard with one obvious action.
 */

const MODE_BANK = [
  { id: "LAW_MAX", name: "LAW MAX", line: "IRAC depth, authority discipline." },
  { id: "PSYCH_HD", name: "PSYCH HD", line: "CAEE depth, post-2016 evidence." },
  { id: "SALES_CLOSE", name: "SALES CLOSE", line: "Objection scripts, attachment." },
  { id: "EBLOCKI_BUILD", name: "EBLOCKI BUILD", line: "Ship code, refine prompts." },
  { id: "ATHLETE_MODE", name: "ATHLETE MODE", line: "Reps logged, movement noted." },
  { id: "FINANCE_BASICS", name: "FINANCE BASICS", line: "Tracker entries, saving rules." },
  { id: "GENERAL_EXECUTION", name: "GENERAL EXECUTION", line: "Resisted tasks, real artifacts." },
];

const GOAL_BANK = [
  "Reduce avoidance",
  "Improve consistency",
  "Increase deep work",
  "Stop fake productivity",
  "Improve study structure",
];

const STEPS = ["Philosophy", "Modes", "Goals", "First proof", "Momentum"] as const;

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
  }, [step, selectedModes, selectedGoals]);

  const toggle = (list: string[], v: string, setter: (n: string[]) => void) => {
    setter(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  };

  const finish = async (skipped = false) => {
    if (!user) return;
    setSubmitting(true);
    try {
      // Persist modes (idempotent upsert per mode)
      if (selectedModes.length > 0) {
        const rows = selectedModes.map((m) => {
          const meta = MODE_BANK.find((x) => x.id === m)!;
          return {
            user_id: user.id,
            mode_id: m,
            display_name: meta.name,
            description: meta.line,
            is_active: true,
            is_default: m === selectedModes[0],
          };
        });
        await supabase.from("user_modes").upsert(rows, { onConflict: "user_id,mode_id" });
      }

      // Persist goals + welcome flag on profile (upsert)
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
      toast.success(skipped ? "Welcome skipped." : "You're in. Proof beats intention.");
      navigate("/dashboard");
    } catch (e: any) {
      toast.error(e?.message || "Could not save preferences.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo title="Welcome | EBLOCKI" description="A two-minute intro to proof-first behavioural execution." path="/welcome" />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-12 space-y-6">
        {/* progress */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-sm transition-colors",
                i <= step ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
          <span>Step {step + 1} of {STEPS.length}</span>
          <button
            onClick={() => finish(true)}
            disabled={submitting}
            className="hover:text-foreground"
          >
            Skip
          </button>
        </div>

        {step === 0 && <PhilosophyStep />}
        {step === 1 && (
          <ModesStep selected={selectedModes} toggle={(v) => toggle(selectedModes, v, setSelectedModes)} />
        )}
        {step === 2 && (
          <GoalsStep selected={selectedGoals} toggle={(v) => toggle(selectedGoals, v, setSelectedGoals)} />
        )}
        {step === 3 && <FirstProofStep />}
        {step === 4 && <MomentumStep />}

        <div className="flex items-center justify-between gap-3 pt-2">
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
              disabled={!canAdvance || submitting}
            >
              Continue <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => finish(false)} disabled={submitting}>
              {submitting ? "Locking in…" : "Enter Eblocki"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function PhilosophyStep() {
  const lines = [
    { left: "Proof", right: "Intention" },
    { left: "Depth", right: "Checkbox completion" },
    { left: "Behaviour", right: "Motivation" },
  ];
  return (
    <Card className="panel p-5 sm:p-7 space-y-5">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
        Welcome
      </span>
      <h1 className="text-2xl sm:text-3xl font-semibold leading-tight">
        Eblocki is not a productivity app.
      </h1>
      <p className="text-sm text-muted-foreground">
        It is a behavioural operating system. It rewards what you actually produce,
        not what you intend to do.
      </p>
      <div className="space-y-2 pt-2">
        {lines.map((l) => (
          <div key={l.left} className="flex items-center gap-3 text-sm">
            <span className="font-mono text-primary min-w-[80px]">{l.left}</span>
            <span className="text-muted-foreground">›</span>
            <span className="line-through text-muted-foreground">{l.right}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ModesStep({ selected, toggle }: { selected: string[]; toggle: (v: string) => void }) {
  return (
    <Card className="panel p-5 sm:p-7 space-y-4">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Modes</span>
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold">Pick the arenas that matter.</h2>
      <p className="text-sm text-muted-foreground">
        Modes route your missions, coaching, and proof standards. Pick at least one — you can change later.
      </p>
      <div className="grid sm:grid-cols-2 gap-2 pt-2">
        {MODE_BANK.map((m) => {
          const on = selected.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              className={cn(
                "text-left rounded-md border p-3 transition-all touch-manipulation",
                on ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-widest">{m.name}</span>
                {on && <Check className="h-3.5 w-3.5 text-primary" />}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{m.line}</p>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function GoalsStep({ selected, toggle }: { selected: string[]; toggle: (v: string) => void }) {
  return (
    <Card className="panel p-5 sm:p-7 space-y-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Behavioural goals</span>
      <h2 className="text-xl sm:text-2xl font-semibold">What are you trying to fix?</h2>
      <p className="text-sm text-muted-foreground">
        These shape your daily mission seeding and notification tone. Pick at least one.
      </p>
      <div className="grid gap-2 pt-2">
        {GOAL_BANK.map((g) => {
          const on = selected.includes(g);
          return (
            <button
              key={g}
              type="button"
              onClick={() => toggle(g)}
              className={cn(
                "text-left rounded-md border p-3 transition-all touch-manipulation flex items-center justify-between",
                on ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
              )}
            >
              <span className="text-sm">{g}</span>
              {on && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function FirstProofStep() {
  return (
    <Card className="panel p-5 sm:p-7 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">First proof</span>
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold">How proof works.</h2>
      <ol className="space-y-2.5 text-sm">
        <li className="flex gap-3">
          <span className="font-mono text-primary">01</span>
          <span>Pick a mission on your dashboard.</span>
        </li>
        <li className="flex gap-3">
          <span className="font-mono text-primary">02</span>
          <span>Do the actual work. Even 10 minutes counts if it produces a real artifact.</span>
        </li>
        <li className="flex gap-3">
          <span className="font-mono text-primary">03</span>
          <span>Open Proof Capture. Describe what you produced — specifically.</span>
        </li>
        <li className="flex gap-3">
          <span className="font-mono text-primary">04</span>
          <span>Lock in evidence. "Done" and "yes" are rejected on purpose.</span>
        </li>
      </ol>
      <p className="text-[11px] text-muted-foreground italic border-l-2 border-primary/40 pl-2">
        Goal: one real proof in your first session. Five minutes is enough.
      </p>
    </Card>
  );
}

function MomentumStep() {
  return (
    <Card className="panel p-5 sm:p-7 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Momentum</span>
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold">Momentum is earned, not faked.</h2>
      <p className="text-sm text-muted-foreground">
        Your momentum score combines three things — none of them are activity:
      </p>
      <div className="space-y-2 pt-1">
        <Row label="Proof quality" body="Depth of the artifacts you produce." />
        <Row label="Consistency" body="Days you defend the standard, not days you log in." />
        <Row label="Resistance" body="Hard tasks attempted, not easy wins stacked." />
      </div>
      <p className="text-[11px] text-muted-foreground italic">
        Shallow streaks get flagged. Inflated activity gets penalised. This is by design.
      </p>
    </Card>
  );
}

function Row({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <span className="font-mono text-[10px] uppercase tracking-widest text-primary">{label}</span>
      <p className="text-sm mt-1">{body}</p>
    </div>
  );
}