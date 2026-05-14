import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/eblocki/AppShell";
import { Seo } from "@/components/Seo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowRight, Plus, Sparkles, Trash2 } from "lucide-react";
import { ModeBadge } from "@/components/eblocki/Badges";
import { calculateModeProgress } from "@/lib/eblocki/mode-progress";
import { TRISTAN_DEFAULT_MODES, GENERAL_DEFAULT_MODES, type EblockiDefaultMode } from "@/lib/eblocki/default-modes";
import type { UserMode } from "@/lib/eblocki/modes";

function isTristanUser(email?: string | null) {
  return !!email?.toLowerCase().includes("tristan");
}

function cleanModeId(name: string) {
  return (
    name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "CUSTOM_MODE"
  );
}

function buildModeFromArena(name: string, description: string, proof: string, standards: string) {
  const modeId = cleanModeId(name);
  const proofExamples = proof
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const keywords = [
    ...name.split(" ").map((item) => item.trim()).filter(Boolean),
    ...standards.split(",").map((item) => item.trim()).filter(Boolean),
    ...proofExamples,
  ].filter(Boolean);

  return {
    mode_id: modeId,
    display_name: name || "Custom Mode",
    description: description || `Personalised Eblocki mode for ${name || "this arena"}.`,
    keywords,
    proof_examples: proofExamples.length
      ? proofExamples
      : [`Completed proof artifact for ${name || "this arena"}`],
    weak_evidence_examples: [
      "Missing evidence, planning without output, or reflection without substance.",
    ],
    strong_evidence_examples: [
      "Concrete output with applied detail, feedback, and a next upgrade."],
    elite_evidence_examples: [
      "A proof artifact that includes output, critique, correction, and next-level upgrade."],
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
    research_needs: standards.split(",").map((item) => item.trim()).filter(Boolean),
    tone_adjustments: "Direct, strategic, proof-first.",
    is_default: false,
    is_active: true,
  };
}

function modeLabel(mode: UserMode | EblockiDefaultMode) {
  return mode.display_name || mode.mode_id;
}

export default function Modes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userModes, setUserModes] = useState<UserMode[]>([]);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [commitments, setCommitments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingModeId, setSavingModeId] = useState<string | null>(null);
  const [newModeName, setNewModeName] = useState("");
  const [newModeDescription, setNewModeDescription] = useState("");
  const [newModeProof, setNewModeProof] = useState("");
  const [newModeStandards, setNewModeStandards] = useState("");
  const [showAddMode, setShowAddMode] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const activeModes = useMemo(
    () => userModes.filter((mode) => mode.is_active !== false),
    [userModes]
  );

  const fallbackModes = useMemo(() => {
    if (isTristanUser(user?.email)) return TRISTAN_DEFAULT_MODES;
    return GENERAL_DEFAULT_MODES;
  }, [user?.email]);

  const displayModes = activeModes.length > 0 ? activeModes : fallbackModes;

  const totalsByMode = useMemo(
    () =>
      displayModes.reduce<Record<string, { pending: number; completed: number; strong: number; elite: number; score: number }>>((acc, mode) => {
        const key = mode.mode_id;
        const modeDomain = key.toLowerCase();
        const matchingArtifacts = artifacts.filter(
          (artifact) => artifact.mode === key || artifact.domain === modeDomain
        );
        const matchingCommitments = commitments.filter(
          (commitment) => commitment.mode === key || commitment.domain === modeDomain
        );
        const strong = matchingArtifacts.filter((a) => a.evidence_strength === "strong").length;
        const elite = matchingArtifacts.filter((a) => a.evidence_strength === "elite").length;
        const completed = matchingArtifacts.length;
        const pending = matchingCommitments.filter((c) => c.status === "pending").length;
        const avgScore = matchingArtifacts.length
          ? matchingArtifacts.reduce((sum, a) => sum + (a.quality_score || 0), 0) / matchingArtifacts.length
          : 0;
        acc[key] = { pending, completed, strong, elite, score: Number(avgScore.toFixed(1)) };
        return acc;
      }, {}),
    [artifacts, commitments, displayModes]
  );

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);

    const load = async () => {
      try {
        const [{ data: userModesData, error: modesError }, { data: artifactsData, error: artifactsError }, { data: commitmentsData, error: commitmentsError }] = await Promise.all([
          supabase.from("user_modes").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
          supabase.from("proof_artifacts").select("*").eq("user_id", user.id),
          supabase.from("proof_commitments").select("*").eq("user_id", user.id),
        ]);

        if (modesError) throw modesError;
        if (artifactsError) throw artifactsError;
        if (commitmentsError) throw commitmentsError;

        setUserModes((userModesData ?? []) as UserMode[]);
        setArtifacts(artifactsData ?? []);
        setCommitments(commitmentsData ?? []);
      } catch (err: any) {
        setLoadError(err?.message || "Failed to load modes.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const saveNewMode = async () => {
    if (!user) return;
    if (!newModeName.trim()) return toast.error("Give the mode a name.");
    setSavingModeId("new");
    const modeRow = buildModeFromArena(newModeName.trim(), newModeDescription.trim(), newModeProof.trim(), newModeStandards.trim());
    try {
      const { error } = await supabase.from("user_modes").insert({ user_id: user.id, ...modeRow });
      if (error) throw error;
      toast.success("Mode added.");
      setNewModeName("");
      setNewModeDescription("");
      setNewModeProof("");
      setNewModeStandards("");
      setShowAddMode(false);
      setUserModes((prev) => [...prev, modeRow as UserMode]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to add mode.");
    } finally {
      setSavingModeId(null);
    }
  };

  const toggleModeActive = async (mode: UserMode) => {
    if (!user) return;
    setSavingModeId(mode.mode_id);
    try {
      const { error } = await supabase
        .from("user_modes")
        .update({ is_active: !mode.is_active })
        .match({ user_id: user.id, mode_id: mode.mode_id });
      if (error) throw error;
      setUserModes((prev) => prev.map((item) => item.mode_id === mode.mode_id ? { ...item, is_active: !item.is_active } : item));
      toast.success(`${mode.display_name} ${mode.is_active ? "disabled" : "enabled"}.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update mode.");
    } finally {
      setSavingModeId(null);
    }
  };

  const openModePrompt = (mode: UserMode | EblockiDefaultMode) => {
    navigate(`/coach?prompt=${encodeURIComponent(`I need coaching in ${mode.display_name}.`)}`);
  };

  const emptyState = !loading && displayModes.length === 0;

  return (
    <AppShell>
      <Seo
        title="Modes | EBLOCKI"
        description="Configure the operating modes that route your coach, evidence rubrics, and proof contracts."
        path="/modes"
      />
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        <header className="space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Mode Operating System
          </span>
          <h1 className="text-2xl md:text-4xl font-semibold">Your modes are the arenas where proof matters.</h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-3xl">
            Eblocki routes coaching, evidence, and commitment through the modes you choose. Every custom mode shapes the Court of Evidence.
          </p>
        </header>

        {loadError && (
          <Card className="panel border-destructive/30 p-4 bg-destructive/5">
            <p className="text-sm text-destructive">{loadError}</p>
          </Card>
        )}

        {emptyState ? (
          <Card className="panel p-5 text-center">
            <h2 className="text-xl font-semibold">No personalised modes yet.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Build your operating system so Eblocki knows what evidence matters in your world.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/onboarding">
                <Button>Setup My OS</Button>
              </Link>
              <Button variant="secondary" onClick={() => setShowAddMode(true)}>
                Add Example Mode
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid xl:grid-cols-2 gap-4">
            {displayModes.map((mode) => {
              const stats = totalsByMode[mode.mode_id] ?? { pending: 0, completed: 0, strong: 0, elite: 0, score: 0 };
              return (
                <Card key={mode.mode_id} className="panel p-5 border-primary/10">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <ModeBadge mode={mode.mode_id} />
                      <h2 className="text-lg font-semibold mt-3">{modeLabel(mode)}</h2>
                      <p className="text-sm text-muted-foreground mt-2">{mode.description}</p>
                    </div>
                    <div className="flex flex-col gap-2 text-right">
                      <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Mode ID</span>
                      <span className="font-mono text-sm text-foreground">{mode.mode_id}</span>
                      {'is_active' in mode && (
                        <span className="rounded-full border px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                          {(mode as UserMode).is_active ? "Active" : "Inactive"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-sm border border-border p-3">
                      <div className="font-mono uppercase tracking-[0.2em] text-muted-foreground">Pending contracts</div>
                      <div className="mt-2 text-lg font-semibold">{stats.pending}</div>
                    </div>
                    <div className="rounded-sm border border-border p-3">
                      <div className="font-mono uppercase tracking-[0.2em] text-muted-foreground">Proof artifacts</div>
                      <div className="mt-2 text-lg font-semibold">{stats.completed}</div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
                    <div className="rounded-sm border border-border p-3">
                      <div className="font-mono uppercase tracking-[0.2em] text-muted-foreground">Strong</div>
                      <div className="mt-1 font-semibold">{stats.strong}</div>
                    </div>
                    <div className="rounded-sm border border-border p-3">
                      <div className="font-mono uppercase tracking-[0.2em] text-muted-foreground">Elite</div>
                      <div className="mt-1 font-semibold">{stats.elite}</div>
                    </div>
                    <div className="rounded-sm border border-border p-3">
                      <div className="font-mono uppercase tracking-[0.2em] text-muted-foreground">Avg quality</div>
                      <div className="mt-1 font-semibold">{stats.score.toFixed(1)}</div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => navigate(`/modes/${encodeURIComponent(mode.mode_id)}`)}>
                      Open Mode
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => openModePrompt(mode)}>
                      Coach in this mode
                    </Button>
                    <Link to={`/proof?mode=${encodeURIComponent(mode.mode_id)}`}>
                      <Button size="sm" variant="outline">
                        Submit Proof
                      </Button>
                    </Link>
                    {'is_active' in mode && userModes.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleModeActive(mode as UserMode)}
                        disabled={savingModeId === mode.mode_id}
                      >
                        {(mode as UserMode).is_active ? "Disable" : "Enable"}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                Personalised Eblocki OS
              </span>
              <h2 className="text-xl font-semibold mt-1">Add a custom operating arena</h2>
            </div>
            <Button variant={showAddMode ? "secondary" : "outline"} onClick={() => setShowAddMode((current) => !current)}>
              {showAddMode ? "Hide form" : "Add mode"}
            </Button>
          </div>

          {showAddMode && (
            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Mode name</label>
                <Input
                  value={newModeName}
                  onChange={(e) => setNewModeName(e.target.value)}
                  placeholder="Clinical Reasoning, YouTube Growth, Decision System"
                  className="mt-2"
                />
              </div>
              <div>
                <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Description</label>
                <Textarea
                  value={newModeDescription}
                  onChange={(e) => setNewModeDescription(e.target.value)}
                  rows={3}
                  placeholder="What evidence counts in this mode?"
                />
              </div>
              <div>
                <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Proof examples</label>
                <Textarea
                  value={newModeProof}
                  onChange={(e) => setNewModeProof(e.target.value)}
                  rows={2}
                  placeholder="List proof artifacts, separated by commas."
                />
              </div>
              <div>
                <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Keywords & standards</label>
                <Textarea
                  value={newModeStandards}
                  onChange={(e) => setNewModeStandards(e.target.value)}
                  rows={2}
                  placeholder="List keywords, frameworks, or standards."
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setShowAddMode(false)}>Cancel</Button>
                <Button onClick={saveNewMode} disabled={savingModeId === "new"}>{savingModeId === "new" ? "Saving…" : "Create Mode"}</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
