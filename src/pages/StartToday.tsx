import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Seo } from "@/components/Seo";
import { ArrowRight, CheckCircle2, Crosshair, Gavel, Loader2, MessageSquare, Sparkles } from "lucide-react";

type UserMode = { mode_id: string; display_name: string };

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
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
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
    supabase
      .from("user_modes")
      .select("mode_id, display_name")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("display_name")
      .then(({ data }) => {
        setModes((data as UserMode[]) ?? []);
        setLoadingModes(false);
      });
    // Prefill from existing sheet
    supabase
      .from("daily_control_sheets")
      .select("prime_objective,avoidance_signal,next_best_action")
      .eq("user_id", user.id)
      .eq("sheet_date", today)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setForm((f) => ({
          ...f,
          prime_objective: data.prime_objective ?? f.prime_objective,
          avoidance_signal: data.avoidance_signal ?? f.avoidance_signal,
          next_best_action: data.next_best_action ?? f.next_best_action,
        }));
      });
  }, [user, today]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

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
      // Upsert daily control sheet
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

      // Create proof contract
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
    } catch (e: any) {
      setError(e?.message || "Could not save Start Today. Your inputs are preserved — try again.");
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
            {planMode ? "Plan today" : "Start with one proof."}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {planMode
              ? "Define the next proof artifact. One objective. One artifact."
              : "Submit one piece of real work and Eblocki will check whether it actually proves progress."}
          </p>
        </header>

        {!planMode && !done && (
          <Card className="panel p-5 md:p-6 border-primary/40 bg-primary/5 space-y-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Activation</div>
            <p className="text-sm text-muted-foreground">
              Skip the planning. Submit one piece of real work — an essay paragraph, study notes, or a past-paper answer — and get an honest check.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link to="/proof?first=1" className="w-full sm:w-auto">
                <Button size="sm" className="w-full sm:w-auto">
                  Submit first proof
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </Link>
              <Button size="sm" variant="outline" onClick={openPlanner} className="w-full sm:w-auto">
                Plan today instead
              </Button>
            </div>
          </Card>
        )}

        {planMode && !done && (
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
              <Link to="/coach"><Button variant="outline" size="sm" className="w-full"><MessageSquare className="h-3 w-3 mr-1.5" />Open Coach</Button></Link>
              <Link to="/proof"><Button size="sm" className="w-full"><Gavel className="h-3 w-3 mr-1.5" />Submit Proof</Button></Link>
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
              ← Back to command centre
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
