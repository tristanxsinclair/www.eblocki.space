import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Plus, Sparkles, Trash2 } from "lucide-react";
import type { UserMode } from "@/lib/eblocki/modes";

type Arena = {
  id: string;
  name: string;
  why: string;
  success: string;
  weakEffort: string;
  proof: string;
  standards: string;
};

const DEFAULT_ARENAS: Arena[] = [
  {
    id: crypto.randomUUID(),
    name: "",
    why: "",
    success: "",
    weakEffort: "",
    proof: "",
    standards: "",
  },
];

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
    keywords: [
      arena.name,
      ...splitList(arena.standards),
      ...splitList(arena.proof),
    ].filter(Boolean),
    proof_examples: splitList(arena.proof).length
      ? splitList(arena.proof)
      : [`Completed proof artifact for ${arena.name || "this arena"}`],
    weak_evidence_examples: [
      arena.weakEffort ||
        "Thinking, planning, or consuming information without producing evidence.",
    ],
    strong_evidence_examples: [
      arena.success ||
        "A concrete artifact with applied detail, reflection, and a next upgrade.",
    ],
    elite_evidence_examples: [
      `Elite evidence in ${
        arena.name || "this arena"
      } includes output, application, feedback, correction, and a next measurable upgrade.`,
    ],
    preferred_response_framework:
      "Bottom Line Up Front → Analysis → Actionable System → HD/Elite Upgrade",
    scoring_criteria: {
      custom: [
        "artifact produced",
        "applied detail",
        "feedback quality",
        "reflection",
        "next upgrade",
      ],
    },
    research_needs: splitList(arena.standards),
    tone_adjustments:
      "Direct, strategic, proof-first. Keep academic integrity and do not fabricate sources.",
    is_default: false,
    is_active: true,
  };
}

function modeToArena(mode: UserMode): Arena {
  return {
    id: mode.mode_id ?? crypto.randomUUID(),
    name: mode.display_name,
    why: mode.description,
    success: mode.strong_evidence_examples?.[0] ?? "",
    weakEffort: mode.weak_evidence_examples?.[0] ?? "",
    proof: (mode.proof_examples ?? []).join(", "),
    standards: (mode.keywords ?? []).join(", "),
  };
}

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);

  const [identitySummary, setIdentitySummary] = useState("");
  const [roles, setRoles] = useState("");
  const [goals, setGoals] = useState("");
  const [coachingStyle, setCoachingStyle] = useState("direct");
  const [strictnessLevel, setStrictnessLevel] = useState(7);
  const [prefersDetailedAnalysis, setPrefersDetailedAnalysis] = useState(true);
  const [challengeAvoidance, setChallengeAvoidance] = useState(true);
  const [autoCreateProofContracts, setAutoCreateProofContracts] = useState(true);
  const [arenas, setArenas] = useState<Arena[]>(DEFAULT_ARENAS);

  useEffect(() => {
    if (!user) return;
    setLoadError(null);
    setOnboardingLoaded(false);

    const fetchProfile = async () => {
      try {
        const [{ data: profileData, error: profileError }, { data: modeData, error: modeError }] = await Promise.all([
          supabase.from("user_onboarding_profiles").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("user_modes").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
        ]);

        if (profileError) {
          setLoadError(profileError.message);
        } else if (profileData) {
          setIdentitySummary(profileData.identity_summary || "");
          setRoles((profileData.roles || []).join(", "));
          setGoals((profileData.goals || []).join(", "));
          setCoachingStyle(profileData.coaching_style || "direct");
          setStrictnessLevel(profileData.strictness_level ?? 7);
          setPrefersDetailedAnalysis(profileData.prefers_detailed_analysis ?? true);
          setChallengeAvoidance(profileData.challenge_avoidance ?? true);
          setAutoCreateProofContracts(profileData.auto_create_proof_contracts ?? true);
        }

        if (modeError) {
          setLoadError((prev) => prev ? `${prev}; ${modeError.message}` : modeError.message);
        } else if (modeData && modeData.length > 0) {
          setArenas(modeData.map(modeToArena));
        }
      } catch (e: any) {
        setLoadError(e?.message || "Failed to load onboarding profile.");
      } finally {
        setOnboardingLoaded(true);
      }
    };

    fetchProfile();
  }, [user]);

  const generatedModes = useMemo(
    () =>
      arenas
        .filter((arena) => arena.name.trim())
        .map((arena) => buildModeFromArena(arena)),
    [arenas]
  );

  const updateArena = (id: string, key: keyof Arena, value: string) => {
    setArenas((current) =>
      current.map((arena) =>
        arena.id === id ? { ...arena, [key]: value } : arena
      )
    );
  };

  const addArena = () => {
    setArenas((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: "",
        why: "",
        success: "",
        weakEffort: "",
        proof: "",
        standards: "",
      },
    ]);
  };

  const removeArena = (id: string) => {
    setArenas((current) =>
      current.length === 1 ? current : current.filter((arena) => arena.id !== id)
    );
  };

  const saveOnboarding = async () => {
    if (!user) {
      toast.error("You need to be signed in first.");
      return;
    }

    if (!identitySummary.trim()) {
      toast.error("Add an identity snapshot first.");
      setStep(1);
      return;
    }

    if (generatedModes.length === 0) {
      toast.error("Add at least one performance arena.");
      setStep(2);
      return;
    }

    setSaving(true);

    try {
      const { error: profileError } = await supabase
        .from("user_onboarding_profiles")
        .upsert(
          {
            user_id: user.id,
            identity_summary: identitySummary,
            roles: splitList(roles),
            goals: splitList(goals),
            coaching_style: coachingStyle,
            strictness_level: strictnessLevel,
            prefers_detailed_analysis: prefersDetailedAnalysis,
            challenge_avoidance: challengeAvoidance,
            auto_create_proof_contracts: autoCreateProofContracts,
            completed_onboarding: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (profileError) throw profileError;

      const modeRows = generatedModes.map((mode) => ({
        user_id: user.id,
        ...mode,
      }));

      const { error: modesError } = await supabase
        .from("user_modes")
        .upsert(modeRows, { onConflict: "user_id,mode_id" });

      if (modesError) throw modesError;

      toast.success("Your Eblocki OS is ready.");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Onboarding save failed:", error);
      toast.error(error?.message || "Failed to save onboarding.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <header className="space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
            Eblocki Setup
          </span>
          <h1 className="text-2xl md:text-4xl font-semibold">
            Build Your Eblocki Operating System
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-3xl">
            Most apps ask what you want to do. Eblocki asks what evidence would
            prove you are becoming that person. Define your arenas, standards,
            and proof rules.
          </p>
        </header>

        {loadError && (
          <Card className="panel border-destructive/30 p-4 bg-destructive/5">
            <p className="text-sm text-destructive">
              Error loading onboarding context: {loadError}
            </p>
            <p className="text-xs text-destructive/80 mt-2">
              If personalisation fails, create your operating system again. The data tables may be missing or restricted.
            </p>
          </Card>
        )}

        <Card className="panel p-4">
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((item) => (
              <button
                key={item}
                onClick={() => setStep(item)}
                className={`h-2 rounded-full transition ${
                  item <= step ? "bg-primary" : "bg-muted"
                }`}
                aria-label={`Go to onboarding step ${item}`}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Step {step} of 5
            </p>
            <p className="text-xs text-muted-foreground">
              Weak goals create weak feedback. Define the standard properly.
            </p>
          </div>
        </Card>

        {step === 1 && (
          <Card className="panel p-5 space-y-4">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                Identity Snapshot
              </span>
              <h2 className="text-xl font-semibold mt-1">
                Who is this system being built for?
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Give Eblocki enough context to coach you like a performance
                system, not a generic chatbot.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Identity Summary
              </label>
              <Textarea
                value={identitySummary}
                onChange={(e) => setIdentitySummary(e.target.value)}
                placeholder="Example: I am a university student, casual salesperson, athlete, and creator trying to convert scattered ambition into measurable output."
                className="min-h-[120px]"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Roles, comma-separated
                </label>
                <Input
                  value={roles}
                  onChange={(e) => setRoles(e.target.value)}
                  placeholder="student, athlete, founder, creator"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Goals, comma-separated
                </label>
                <Input
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="exam prep, sales, fitness, content"
                />
              </div>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="panel p-5 space-y-4">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                Performance Arenas
              </span>
              <h2 className="text-xl font-semibold mt-1">
                Where does proof matter?
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your modes are the arenas where Eblocki will diagnose, coach,
                and demand evidence.
              </p>
            </div>

            <div className="space-y-4">
              {arenas.map((arena, index) => (
                <Card key={arena.id} className="p-4 bg-background/40 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Arena {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeArena(arena.id)}
                      disabled={arenas.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <Input
                    value={arena.name}
                    onChange={(e) =>
                      updateArena(arena.id, "name", e.target.value)
                    }
                    placeholder="Area name, e.g. University Psychology, Sales, Fitness, Content"
                  />

                  <div className="grid md:grid-cols-2 gap-3">
                    <Textarea
                      value={arena.why}
                      onChange={(e) =>
                        updateArena(arena.id, "why", e.target.value)
                      }
                      placeholder="Why does this area matter?"
                    />
                    <Textarea
                      value={arena.success}
                      onChange={(e) =>
                        updateArena(arena.id, "success", e.target.value)
                      }
                      placeholder="What does strong performance look like?"
                    />
                    <Textarea
                      value={arena.weakEffort}
                      onChange={(e) =>
                        updateArena(arena.id, "weakEffort", e.target.value)
                      }
                      placeholder="What does weak effort look like?"
                    />
                    <Textarea
                      value={arena.proof}
                      onChange={(e) =>
                        updateArena(arena.id, "proof", e.target.value)
                      }
                      placeholder="What proof artifacts count? Separate examples with commas."
                    />
                  </div>

                  <Textarea
                    value={arena.standards}
                    onChange={(e) =>
                      updateArena(arena.id, "standards", e.target.value)
                    }
                    placeholder="Important standards, rubrics, frameworks, sources, or methods. Separate with commas."
                  />
                </Card>
              ))}
            </div>

            <Button type="button" variant="secondary" onClick={addArena}>
              <Plus className="h-4 w-4 mr-2" />
              Add Arena
            </Button>
          </Card>
        )}

        {step === 3 && (
          <Card className="panel p-5 space-y-4">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                Coaching Style
              </span>
              <h2 className="text-xl font-semibold mt-1">
                Set the pressure level.
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                The coach keeps BLUF, high standards, and proof contracts. This
                controls how hard it pushes.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-3">
              {["gentle", "balanced", "direct", "strict"].map((style) => (
                <button
                  key={style}
                  onClick={() => setCoachingStyle(style)}
                  className={`rounded-xl border p-4 text-left transition ${
                    coachingStyle === style
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background/40"
                  }`}
                >
                  <span className="font-mono text-[10px] uppercase tracking-widest">
                    {style}
                  </span>
                  <p className="text-xs text-muted-foreground mt-2">
                    {style === "gentle" &&
                      "Supportive, but still proof-based."}
                    {style === "balanced" &&
                      "Clear guidance with moderate pressure."}
                    {style === "direct" &&
                      "Strategic, sharp, and action-focused."}
                    {style === "strict" &&
                      "High challenge. Avoidance gets called out."}
                  </p>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Strictness Level: {strictnessLevel}/10
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={strictnessLevel}
                onChange={(e) => setStrictnessLevel(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <ToggleCard
                title="Detailed Analysis"
                active={prefersDetailedAnalysis}
                onClick={() =>
                  setPrefersDetailedAnalysis((current) => !current)
                }
              />
              <ToggleCard
                title="Challenge Avoidance"
                active={challengeAvoidance}
                onClick={() => setChallengeAvoidance((current) => !current)}
              />
              <ToggleCard
                title="Auto Proof Contracts"
                active={autoCreateProofContracts}
                onClick={() =>
                  setAutoCreateProofContracts((current) => !current)
                }
              />
            </div>
          </Card>
        )}

        {step === 4 && (
          <Card className="panel p-5 space-y-4">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                Generate Modes
              </span>
              <h2 className="text-xl font-semibold mt-1">
                Your personalised Eblocki modes
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                These modes will route your coach prompts before generic defaults.
              </p>
            </div>
            {generatedModes.length === 0 ? (
              <Card className="p-4 bg-background/40">
                <p className="text-sm text-muted-foreground">
                  No modes yet. Add at least one performance arena first.
                </p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {generatedModes.map((mode) => (
                  <Card key={mode.mode_id} className="p-4 bg-background/40">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                        {mode.mode_id}
                      </span>
                    </div>
                    <h3 className="font-semibold mt-2">{mode.display_name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {mode.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {mode.proof_examples.slice(0, 4).map((example) => (
                        <span
                          key={example}
                          className="text-[10px] font-mono uppercase tracking-wider rounded-full border border-border px-2 py-1"
                        >
                          {example}
                        </span>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        )}

        {step === 5 && (
          <Card className="panel p-5 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-primary mt-1" />
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                  Finalise
                </span>
                <h2 className="text-xl font-semibold mt-1">
                  Your Court of Evidence is ready.
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Eblocki will now use your custom modes, proof standards, and
                  coaching style to convert intention into evidence.
                </p>
              </div>
            </div>

            <Card className="p-4 bg-background/40">
              <p className="text-sm">
                First recommended Proof Contract:
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Create one Daily Control Sheet and submit your first proof
                artifact in your highest-value mode.
              </p>
            </Card>

            <Button onClick={saveOnboarding} disabled={saving}>
              {saving ? "Saving Operating System…" : "Save My Eblocki OS"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Card>
        )}

        <div className="flex justify-between items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => setStep((current) => Math.max(1, current - 1))}
            disabled={step === 1}
          >
            Back
          </Button>

          {step < 5 ? (
            <Button
              onClick={() => setStep((current) => Math.min(5, current + 1))}
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

function ToggleCard({
  title,
  active,
  onClick,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        active ? "border-primary bg-primary/10" : "border-border bg-background/40"
      }`}
    >
      <span className="font-mono text-[10px] uppercase tracking-widest">
        {title}
      </span>
      <p className="text-xs text-muted-foreground mt-2">
        {active ? "Enabled" : "Disabled"}
      </p>
    </button>
  );
}
