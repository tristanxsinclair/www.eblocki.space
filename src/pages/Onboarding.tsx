import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Plus,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { haptics } from "@/hooks/useHaptics";
import { cn } from "@/lib/utils";

type Arena = {
  id: string;
  name: string;
  why: string;
  success: string;
  weakEffort: string;
  proof: string;
  standards: string;
};

type SupabaseUserMode = {
  mode_id: string;
  display_name: string;
  description: string | null;
  keywords: string[] | null;
  proof_examples: string[] | null;
  weak_evidence_examples: string[] | null;
  strong_evidence_examples: string[] | null;
};

const STEP_COUNT = 6;

const newArena = (): Arena => ({
  id: crypto.randomUUID(),
  name: "",
  why: "",
  success: "",
  weakEffort: "",
  proof: "",
  standards: "",
});

function cleanModeId(name: string) {
  return (
    name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "CUSTOM_MODE"
  );
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildModeFromArena(arena: Arena) {
  const modeId = cleanModeId(arena.name);
  return {
    mode_id: modeId,
    display_name: arena.name.trim() || "Custom Mode",
    description:
      arena.why.trim() ||
      `Personalised Eblocki mode for ${arena.name || "this performance arena"}.`,
    keywords: [arena.name, ...splitList(arena.standards), ...splitList(arena.proof)].filter(Boolean),
    proof_examples: splitList(arena.proof).length
      ? splitList(arena.proof)
      : [`Completed proof artifact for ${arena.name || "this arena"}`],
    weak_evidence_examples: [
      arena.weakEffort || "Thinking, planning, or consuming information without producing evidence.",
    ],
    strong_evidence_examples: [
      arena.success || "A concrete artifact with applied detail, reflection, and a next upgrade.",
    ],
    elite_evidence_examples: [
      `Elite evidence in ${arena.name || "this arena"} includes output, application, feedback, correction, and a next measurable upgrade.`,
    ],
    preferred_response_framework:
      "Bottom Line Up Front → Analysis → Actionable System → HD/Elite Upgrade",
    scoring_criteria: {
      custom: ["artifact produced", "applied detail", "feedback quality", "reflection", "next upgrade"],
    },
    research_needs: splitList(arena.standards),
    tone_adjustments:
      "Direct, strategic, proof-first. Keep academic integrity and do not fabricate sources.",
    is_default: false,
    is_active: true,
  };
}

function modeToArena(mode: SupabaseUserMode): Arena {
  return {
    id: mode.mode_id ?? crypto.randomUUID(),
    name: mode.display_name,
    why: mode.description ?? "",
    success: mode.strong_evidence_examples?.[0] ?? "",
    weakEffort: mode.weak_evidence_examples?.[0] ?? "",
    proof: (mode.proof_examples ?? []).join(", "),
    standards: (mode.keywords ?? []).join(", "),
  };
}

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [identitySummary, setIdentitySummary] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [coachingStyle, setCoachingStyle] = useState("direct");
  const [strictnessLevel, setStrictnessLevel] = useState(7);
  const [prefersDetailedAnalysis, setPrefersDetailedAnalysis] = useState(true);
  const [challengeAvoidance, setChallengeAvoidance] = useState(true);
  const [autoCreateProofContracts, setAutoCreateProofContracts] = useState(true);
  const [arenas, setArenas] = useState<Arena[]>([newArena()]);
  const [openArenaId, setOpenArenaId] = useState<string | null>(arenas[0].id);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [{ data: profile }, { data: modes }] = await Promise.all([
          supabase.from("user_onboarding_profiles").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("user_modes").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
        ]);
        if (profile) {
          setIdentitySummary(profile.identity_summary || "");
          setRoles(profile.roles || []);
          setGoals(profile.goals || []);
          setCoachingStyle(profile.coaching_style || "direct");
          setStrictnessLevel(profile.strictness_level ?? 7);
          setPrefersDetailedAnalysis(profile.prefers_detailed_analysis ?? true);
          setChallengeAvoidance(profile.challenge_avoidance ?? true);
          setAutoCreateProofContracts(profile.auto_create_proof_contracts ?? true);
        }
        if (modes && modes.length > 0) {
          const mapped = modes.map(modeToArena);
          setArenas(mapped);
          setOpenArenaId(mapped[0].id);
        }
      } catch (e) {
        // swallow — fresh form is fine
      }
    })();
  }, [user]);

  const generatedModes = useMemo(
    () => arenas.filter((a) => a.name.trim()).map((a) => buildModeFromArena(a)),
    [arenas],
  );

  const canAdvance = useMemo(() => {
    if (step === 0) return true; // welcome
    if (step === 1) return identitySummary.trim().length >= 10;
    if (step === 2) return true; // roles/goals optional
    if (step === 3) return arenas.some((a) => a.name.trim().length > 0);
    if (step === 4) return true; // coaching
    if (step === 5) return generatedModes.length > 0;
    return true;
  }, [step, identitySummary, arenas, generatedModes]);

  const goNext = () => {
    if (!canAdvance) {
      haptics.warning();
      return;
    }
    haptics.light();
    setStep((s) => Math.min(STEP_COUNT - 1, s + 1));
  };
  const goBack = () => {
    haptics.light();
    setStep((s) => Math.max(0, s - 1));
  };

  const updateArena = (id: string, key: keyof Arena, value: string) =>
    setArenas((cur) => cur.map((a) => (a.id === id ? { ...a, [key]: value } : a)));

  const addArena = () => {
    haptics.light();
    const a = newArena();
    setArenas((cur) => [...cur, a]);
    setOpenArenaId(a.id);
  };

  const removeArena = (id: string) => {
    haptics.medium();
    setArenas((cur) => (cur.length === 1 ? cur : cur.filter((a) => a.id !== id)));
  };

  const saveOnboarding = async () => {
    if (!user) return toast.error("Sign in first.");
    setSaving(true);
    try {
      const { error: profileError } = await supabase
        .from("user_onboarding_profiles")
        .upsert(
          {
            user_id: user.id,
            identity_summary: identitySummary,
            roles,
            goals,
            coaching_style: coachingStyle,
            strictness_level: strictnessLevel,
            prefers_detailed_analysis: prefersDetailedAnalysis,
            challenge_avoidance: challengeAvoidance,
            auto_create_proof_contracts: autoCreateProofContracts,
            completed_onboarding: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      if (profileError) throw profileError;

      const modeRows = generatedModes.map((m) => ({ user_id: user.id, ...m }));
      const { error: modesError } = await supabase
        .from("user_modes")
        .upsert(modeRows, { onConflict: "user_id,mode_id" });
      if (modesError) throw modesError;

      haptics.success();
      toast.success("Your Eblocki OS is live.");
      navigate("/proof-week");
    } catch (error: any) {
      haptics.error();
      toast.error(error?.message || "Failed to save onboarding.");
    } finally {
      setSaving(false);
    }
  };

  const stepLabels = ["Welcome", "Identity", "Context", "Arenas", "Coaching", "Confirm"];

  return (
    <div className="min-h-screen-safe flex flex-col bg-background">
      <Seo
        title="Setup OS | EBLOCKI"
        description="Configure your operating modes, identity claims, and arenas to start the proof loop."
        path="/onboarding"
      />

      {/* Header — slim, sticky, safe-area aware */}
      <header className="safe-top sticky top-0 z-20 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {String(step + 1).padStart(2, "0")} / {String(STEP_COUNT).padStart(2, "0")}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">
            {stepLabels[step]}
          </span>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-muted-foreground hover:text-foreground p-1 -mr-1"
            aria-label="Skip onboarding"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4 pb-3">
          <div className="flex gap-1">
            {Array.from({ length: STEP_COUNT }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i <= step ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Step body — single column, large type, generous padding */}
      <main className="flex-1 px-5 py-6 pb-40 max-w-xl w-full mx-auto">
        {step === 0 && <StepWelcome onStart={goNext} />}

        {step === 1 && (
          <StepBlock
            kicker="Identity"
            title="Who is this system being built for?"
            sub="One paragraph. Eblocki uses this to coach you like a performance system, not a chatbot."
          >
            <Textarea
              autoFocus
              value={identitySummary}
              onChange={(e) => setIdentitySummary(e.target.value)}
              placeholder="I'm a university student, casual salesperson, athlete, and creator trying to convert scattered ambition into measurable output."
              className="min-h-[180px] text-base leading-relaxed"
            />
            <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mt-3">
              {identitySummary.trim().length < 10
                ? `${10 - identitySummary.trim().length} more chars`
                : "Ready"}
            </p>
          </StepBlock>
        )}

        {step === 2 && (
          <StepBlock
            kicker="Context"
            title="Your roles and goals"
            sub="Tap to add chips. Both are optional — but they sharpen the coach."
          >
            <ChipField
              label="Roles"
              placeholder="student, athlete, founder…"
              values={roles}
              onChange={setRoles}
            />
            <div className="h-5" />
            <ChipField
              label="Goals"
              placeholder="exam prep, sales, fitness…"
              values={goals}
              onChange={setGoals}
            />
          </StepBlock>
        )}

        {step === 3 && (
          <StepBlock
            kicker="Arenas"
            title="Where does proof matter?"
            sub="One arena per area of life. Tap to expand and fill in. The first one needs a name."
          >
            <div className="space-y-3">
              {arenas.map((arena, i) => (
                <ArenaCard
                  key={arena.id}
                  index={i}
                  arena={arena}
                  open={openArenaId === arena.id}
                  onOpen={() => setOpenArenaId(openArenaId === arena.id ? null : arena.id)}
                  onChange={(k, v) => updateArena(arena.id, k, v)}
                  onRemove={() => removeArena(arena.id)}
                  canRemove={arenas.length > 1}
                />
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={addArena}
              className="mt-4 w-full h-12"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add another arena
            </Button>
          </StepBlock>
        )}

        {step === 4 && (
          <StepBlock
            kicker="Coaching"
            title="Set the pressure level."
            sub="Eblocki keeps BLUF and proof contracts. This controls how hard it pushes."
          >
            <div className="grid grid-cols-2 gap-3">
              {(["gentle", "balanced", "direct", "strict"] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => {
                    haptics.select();
                    setCoachingStyle(style);
                  }}
                  className={cn(
                    "min-h-[88px] rounded-xl border p-4 text-left transition active:scale-[0.98]",
                    coachingStyle === style
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card",
                  )}
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
                    {style}
                  </span>
                  <p className="text-xs text-muted-foreground mt-2 leading-snug">
                    {style === "gentle" && "Supportive, still proof-based."}
                    {style === "balanced" && "Clear guidance, moderate pressure."}
                    {style === "direct" && "Sharp, strategic, action-first."}
                    {style === "strict" && "Avoidance gets called out."}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-border bg-card p-4">
              <div className="flex items-baseline justify-between">
                <label className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                  Strictness
                </label>
                <span className="font-mono text-base tabular-nums">{strictnessLevel}/10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={strictnessLevel}
                onChange={(e) => setStrictnessLevel(Number(e.target.value))}
                onTouchEnd={() => haptics.select()}
                className="w-full mt-3 h-2 accent-primary"
              />
              <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
                <span>soft</span>
                <span>brutal</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <ToggleRow
                title="Detailed analysis"
                sub="Coach explains the why before the move."
                active={prefersDetailedAnalysis}
                onToggle={() => setPrefersDetailedAnalysis((v) => !v)}
              />
              <ToggleRow
                title="Call out avoidance"
                sub="Name patterns when you dodge the work."
                active={challengeAvoidance}
                onToggle={() => setChallengeAvoidance((v) => !v)}
              />
              <ToggleRow
                title="Auto proof contracts"
                sub="Convert intentions into measurable artifacts."
                active={autoCreateProofContracts}
                onToggle={() => setAutoCreateProofContracts((v) => !v)}
              />
            </div>
          </StepBlock>
        )}

        {step === 5 && (
          <StepBlock
            kicker="Confirm"
            title="Your Court of Evidence is ready."
            sub="These modes route your coach prompts before generic defaults."
          >
            <div className="space-y-3">
              {generatedModes.map((mode) => (
                <div key={mode.mode_id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                      {mode.mode_id}
                    </span>
                  </div>
                  <h3 className="font-semibold mt-1.5 text-base">{mode.display_name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                    {mode.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs font-mono uppercase tracking-widest text-primary">
                First contract
              </p>
              <p className="text-sm mt-1.5">
                Create one Daily Control Sheet and submit your first proof artifact in your
                highest-value mode.
              </p>
            </div>
          </StepBlock>
        )}
      </main>

      {/* Sticky thumb-zone CTA */}
      <nav className="safe-bottom fixed bottom-0 inset-x-0 z-20 bg-background/90 backdrop-blur-md border-t border-border">
        <div className="px-4 py-3 max-w-xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="lg"
            onClick={goBack}
            disabled={step === 0}
            className="h-12 px-4"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {step < STEP_COUNT - 1 ? (
            <Button
              onClick={goNext}
              disabled={!canAdvance}
              size="lg"
              className="flex-1 h-12 text-base"
            >
              {step === 0 ? "Begin" : "Continue"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={saveOnboarding}
              disabled={saving || generatedModes.length === 0}
              size="lg"
              className="flex-1 h-12 text-base"
            >
              {saving ? "Saving…" : "Activate my OS"}
              <Check className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </nav>
    </div>
  );
}

/* ---------------- subcomponents ---------------- */

function StepBlock({
  kicker,
  title,
  sub,
  children,
}: {
  kicker: string;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">
        {kicker}
      </span>
      <h1 className="text-2xl font-semibold mt-2 leading-tight">{title}</h1>
      {sub && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{sub}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function StepWelcome({ onStart }: { onStart: () => void }) {
  return (
    <section className="animate-in fade-in duration-500 flex flex-col items-start justify-center min-h-[60vh]">
      <div className="h-14 w-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-6">
        <Target className="h-7 w-7 text-primary" />
      </div>
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">
        Eblocki Setup
      </span>
      <h1 className="text-3xl font-semibold mt-3 leading-tight">
        Build the operating system that turns ambition into evidence.
      </h1>
      <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
        Six short steps. About three minutes. You can edit any of this later in Settings.
      </p>
      <ul className="mt-6 space-y-2 text-sm">
        {["Identity claim", "Performance arenas", "Coaching pressure", "Your custom modes"].map(
          (item) => (
            <li key={item} className="flex items-center gap-2 text-muted-foreground">
              <Check className="h-4 w-4 text-primary" />
              {item}
            </li>
          ),
        )}
      </ul>
      <button onClick={onStart} className="sr-only">
        Begin
      </button>
    </section>
  );
}

function ChipField({
  label,
  placeholder,
  values,
  onChange,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const v = draft.trim();
    if (!v) return;
    if (values.includes(v)) {
      setDraft("");
      return;
    }
    haptics.select();
    onChange([...values, v]);
    setDraft("");
  };
  return (
    <div>
      <label className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <div className="mt-2 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={placeholder}
          className="h-12 text-base"
        />
        <Button type="button" onClick={commit} size="lg" variant="secondary" className="h-12 px-4">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {values.map((v) => (
            <button
              key={v}
              onClick={() => {
                haptics.light();
                onChange(values.filter((x) => x !== v));
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono uppercase tracking-wider px-3 py-1.5"
            >
              {v}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ArenaCard({
  index,
  arena,
  open,
  onOpen,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  arena: Arena;
  open: boolean;
  onOpen: () => void;
  onChange: (k: keyof Arena, v: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={onOpen}
        className="w-full min-h-[56px] flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Arena {index + 1}
          </span>
          <p className="text-sm font-medium truncate mt-0.5">
            {arena.name || "Untitled arena"}
          </p>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/60 pt-3">
          <FieldLabel>Name</FieldLabel>
          <Input
            value={arena.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="University Psychology, Sales, Fitness, Content…"
            className="h-12 text-base"
          />

          <FieldLabel>Why does this matter?</FieldLabel>
          <Textarea
            value={arena.why}
            onChange={(e) => onChange("why", e.target.value)}
            placeholder="What's at stake here?"
            className="min-h-[80px]"
          />

          <FieldLabel>Strong performance looks like</FieldLabel>
          <Textarea
            value={arena.success}
            onChange={(e) => onChange("success", e.target.value)}
            placeholder="What does a great week produce?"
            className="min-h-[80px]"
          />

          <FieldLabel>Weak effort looks like</FieldLabel>
          <Textarea
            value={arena.weakEffort}
            onChange={(e) => onChange("weakEffort", e.target.value)}
            placeholder="What does dodging the work look like?"
            className="min-h-[80px]"
          />

          <FieldLabel>Proof artifacts (comma-separated)</FieldLabel>
          <Textarea
            value={arena.proof}
            onChange={(e) => onChange("proof", e.target.value)}
            placeholder="essay, sales call recording, training log…"
            className="min-h-[64px]"
          />

          <FieldLabel>Standards / rubrics / sources</FieldLabel>
          <Textarea
            value={arena.standards}
            onChange={(e) => onChange("standards", e.target.value)}
            placeholder="HD criteria, ICP framework, RPE scale…"
            className="min-h-[64px]"
          />

          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              onClick={onRemove}
              className="w-full h-11 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove arena
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
      {children}
    </label>
  );
}

function ToggleRow({
  title,
  sub,
  active,
  onToggle,
}: {
  title: string;
  sub: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        haptics.select();
        onToggle();
      }}
      className={cn(
        "w-full min-h-[64px] rounded-xl border p-4 flex items-center justify-between gap-4 text-left transition active:scale-[0.99]",
        active ? "border-primary bg-primary/10" : "border-border bg-card",
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
      <div
        className={cn(
          "h-6 w-10 rounded-full p-0.5 transition-colors flex-shrink-0",
          active ? "bg-primary" : "bg-muted",
        )}
      >
        <div
          className={cn(
            "h-5 w-5 rounded-full bg-background shadow transition-transform",
            active && "translate-x-4",
          )}
        />
      </div>
    </button>
  );
}