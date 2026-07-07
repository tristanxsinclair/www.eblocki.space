import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Gavel,
  Hammer,
  Loader2,
  Target,
} from "lucide-react";
import { AppShell } from "@/components/eblocki/AppShell";
import { EvidenceStrengthBadge } from "@/components/eblocki/Badges";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import {
  evaluateSystemForgeRep,
  generateSystemForgeDraft,
  isArtifactProducingCommand,
  type SystemForgeDraft,
  type SystemForgeLevel,
  type SystemForgeRepEvaluation,
  type SystemForgeRubricItem,
  type SystemForgeWeeklyBlock,
} from "@/lib/eblocki/system-forge";

type CustomSystemRow = Tables<"custom_systems">;
type SystemRepRow = Tables<"system_reps">;

type ForgeForm = {
  domain: string;
  improvementGoal: string;
  desiredOutcome: string;
  currentBottleneck: string;
  availableMinutesPerDay: string;
};

const INITIAL_FORM: ForgeForm = {
  domain: "",
  improvementGoal: "",
  desiredOutcome: "",
  currentBottleneck: "",
  availableMinutesPerDay: "20",
};

function jsonArray<T>(value: Json | null | undefined): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function firstArtifact(system: CustomSystemRow): string {
  return jsonArray<string>(system.proof_artifacts)[0] ?? "visible artifact";
}

function toDraftShape(system: CustomSystemRow): Pick<SystemForgeDraft, "domain" | "artifactType" | "activeCommand"> {
  return {
    domain: system.domain as SystemForgeDraft["domain"],
    artifactType: firstArtifact(system),
    activeCommand: system.active_command,
  };
}

function cleanNumber(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 20;
  return Math.max(5, Math.min(180, parsed));
}

export default function Systems() {
  const { user } = useAuth();
  const [form, setForm] = useState<ForgeForm>(INITIAL_FORM);
  const [activeSystem, setActiveSystem] = useState<CustomSystemRow | null>(null);
  const [latestRep, setLatestRep] = useState<SystemRepRow | null>(null);
  const [lastVerdict, setLastVerdict] = useState<SystemForgeRepEvaluation | null>(null);
  const [proofContent, setProofContent] = useState("");
  const [selfScore, setSelfScore] = useState("");
  const [loading, setLoading] = useState(true);
  const [forging, setForging] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canForge = useMemo(
    () =>
      form.domain.trim() &&
      form.improvementGoal.trim() &&
      form.desiredOutcome.trim() &&
      form.currentBottleneck.trim() &&
      cleanNumber(form.availableMinutesPerDay) > 0,
    [form],
  );

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: system, error: systemError } = await supabase
        .from("custom_systems")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (systemError) throw systemError;
      setActiveSystem(system);

      if (system?.id) {
        const { data: rep, error: repError } = await supabase
          .from("system_reps")
          .select("*")
          .eq("user_id", user.id)
          .eq("system_id", system.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (repError) throw repError;
        setLatestRep(rep);
      } else {
        setLatestRep(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load System Forge.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const forgeSystem = async () => {
    if (!user || !canForge || forging) return;
    setForging(true);
    setLastVerdict(null);
    try {
      const draft = generateSystemForgeDraft({
        domain: form.domain,
        improvementGoal: form.improvementGoal,
        desiredOutcome: form.desiredOutcome,
        currentBottleneck: form.currentBottleneck,
        availableMinutesPerDay: cleanNumber(form.availableMinutesPerDay),
      });

      if (!isArtifactProducingCommand(draft.firstCommand)) {
        throw new Error("Generated command failed the artifact-producing rule.");
      }

      const { error: deactivateError } = await supabase
        .from("custom_systems")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("is_active", true);
      if (deactivateError) throw deactivateError;

      const { data, error } = await supabase
        .from("custom_systems")
        .insert({
          user_id: user.id,
          name: draft.name,
          domain: draft.domain,
          goal: draft.goal,
          outcome: draft.outcome,
          bottleneck: draft.bottleneck,
          available_minutes_per_day: draft.availableMinutesPerDay,
          skills: draft.skills as Json,
          daily_loop: draft.dailyLoop,
          weekly_structure: draft.weeklyStructure as unknown as Json,
          minimum_viable_rep: draft.minimumViableRep,
          proof_artifacts: draft.proofArtifacts as Json,
          scoring_rubric: draft.scoringRubric as unknown as Json,
          progression_levels: draft.progressionLevels as unknown as Json,
          review_cycle: draft.reviewCycle,
          first_command: draft.firstCommand,
          active_command: draft.activeCommand,
          is_active: true,
        })
        .select("*")
        .single();
      if (error) throw error;

      setActiveSystem(data);
      setLatestRep(null);
      setProofOpen(false);
      setProofContent("");
      toast.success("System forged from your goal.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not forge system.";
      toast.error(message);
    } finally {
      setForging(false);
    }
  };

  const submitProof = async () => {
    if (!user || !activeSystem || submitting) return;
    if (!proofContent.trim()) {
      toast.error("Submit proof before asking for a verdict.");
      return;
    }
    setSubmitting(true);
    try {
      const evaluation = evaluateSystemForgeRep({
        system: toDraftShape(activeSystem),
        proofContent,
        selfScore: selfScore ? cleanNumber(selfScore) : null,
      });
      const artifactType = firstArtifact(activeSystem);
      const { data: artifact, error: artifactError } = await supabase
        .from("proof_artifacts")
        .insert({
          user_id: user.id,
          domain: activeSystem.domain,
          title: activeSystem.active_command,
          artifact_type: artifactType,
          content: proofContent,
          quality_score: evaluation.score,
          evidence_strength: evaluation.verdict,
          feedback: evaluation.why,
          next_upgrade: evaluation.nextUpgrade,
        })
        .select("id")
        .single();
      if (artifactError) throw artifactError;

      const { data: rep, error: repError } = await supabase
        .from("system_reps")
        .insert({
          user_id: user.id,
          system_id: activeSystem.id,
          proof_id: artifact.id,
          command: activeSystem.active_command,
          artifact_type: artifactType,
          proof_content: proofContent,
          self_score: selfScore ? cleanNumber(selfScore) : null,
          score: evaluation.score,
          verdict: evaluation.verdict,
          weakness: evaluation.weakness,
          next_upgrade: evaluation.nextUpgrade,
        })
        .select("*")
        .single();
      if (repError) throw repError;

      const { data: updatedSystem, error: updateError } = await supabase
        .from("custom_systems")
        .update({ active_command: evaluation.nextUpgrade })
        .eq("id", activeSystem.id)
        .eq("user_id", user.id)
        .select("*")
        .single();
      if (updateError) throw updateError;

      setActiveSystem(updatedSystem);
      setLatestRep(rep);
      setLastVerdict(evaluation);
      setProofContent("");
      setSelfScore("");
      toast.success("Proof saved. Next upgrade selected.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save proof.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <Seo
        title="System Forge | EBLOCKI"
        description="Build a custom proof-based training system from a goal, first rep, proof, verdict, weakness, and next command."
        path="/systems"
      />
      <div className="mobile-safe-page p-4 md:p-8 max-w-6xl mx-auto space-y-5">
        <header className="min-w-0">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            System Forge
          </span>
          <h1 className="mt-1 text-2xl md:text-3xl font-semibold break-words">
            Build a proof-based training system for anything.
          </h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground break-words max-w-2xl">
            Turn a goal into reps, proof, scoring, and next commands.
          </p>
        </header>

        {loading ? (
          <Card className="panel p-4 border-border/80 bg-card/50 mobile-safe-card">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading System Forge...
            </div>
          </Card>
        ) : (
          <>
            <Card className="panel p-4 md:p-5 border-primary/30 bg-primary/5 mobile-safe-card">
              <div className="flex items-start justify-between gap-4 flex-col lg:flex-row min-w-0">
                <div className="min-w-0 max-w-xl">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
                    Custom proof system
                  </div>
                  <h2 className="mt-2 text-xl font-semibold break-words">
                    {activeSystem ? "Forge another goal into a proof loop." : "No system yet. Forge one goal into a proof loop."}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground break-words">
                    Generated from your inputs. Deterministic MVP. No AI claims, no planning without an artifact-producing command.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:max-w-xl">
                  <Field label="Domain">
                    <Input value={form.domain} onChange={(event) => setForm((prev) => ({ ...prev, domain: event.target.value }))} placeholder="law, sales, spanish..." />
                  </Field>
                  <Field label="Minutes per day">
                    <Input inputMode="numeric" value={form.availableMinutesPerDay} onChange={(event) => setForm((prev) => ({ ...prev, availableMinutesPerDay: event.target.value }))} placeholder="20" />
                  </Field>
                  <Field label="Improvement goal">
                    <Input value={form.improvementGoal} onChange={(event) => setForm((prev) => ({ ...prev, improvementGoal: event.target.value }))} placeholder="Improve IRAC answers" />
                  </Field>
                  <Field label="Desired outcome">
                    <Input value={form.desiredOutcome} onChange={(event) => setForm((prev) => ({ ...prev, desiredOutcome: event.target.value }))} placeholder="Submit stronger proof weekly" />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Current bottleneck">
                      <Textarea value={form.currentBottleneck} onChange={(event) => setForm((prev) => ({ ...prev, currentBottleneck: event.target.value }))} rows={3} placeholder="What makes you avoid the real rep?" />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="button" onClick={forgeSystem} disabled={!canForge || forging} className="w-full sm:w-auto min-h-[44px]">
                      {forging ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Hammer className="h-4 w-4 mr-2" />}
                      Forge My System
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {activeSystem ? (
              <ActiveSystem
                system={activeSystem}
                latestRep={latestRep}
                lastVerdict={lastVerdict}
                proofOpen={proofOpen}
                proofContent={proofContent}
                selfScore={selfScore}
                submitting={submitting}
                onStart={() => setProofOpen(true)}
                onProofChange={setProofContent}
                onSelfScoreChange={setSelfScore}
                onSubmitProof={submitProof}
              />
            ) : (
              <Card className="panel p-5 border-border/80 bg-card/50 mobile-safe-card">
                <div className="flex items-start gap-3 min-w-0">
                  <Target className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold break-words">No active system.</h2>
                    <p className="mt-1 text-sm text-muted-foreground break-words">
                      Enter a goal above. Eblocki will create the proof standard, first command, and scoring loop.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 min-w-0">
      <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ActiveSystem({
  system,
  latestRep,
  lastVerdict,
  proofOpen,
  proofContent,
  selfScore,
  submitting,
  onStart,
  onProofChange,
  onSelfScoreChange,
  onSubmitProof,
}: {
  system: CustomSystemRow;
  latestRep: SystemRepRow | null;
  lastVerdict: SystemForgeRepEvaluation | null;
  proofOpen: boolean;
  proofContent: string;
  selfScore: string;
  submitting: boolean;
  onStart: () => void;
  onProofChange: (value: string) => void;
  onSelfScoreChange: (value: string) => void;
  onSubmitProof: () => void;
}) {
  const skills = jsonArray<string>(system.skills);
  const proofArtifacts = jsonArray<string>(system.proof_artifacts);
  const weekly = jsonArray<SystemForgeWeeklyBlock>(system.weekly_structure);
  const rubric = jsonArray<SystemForgeRubricItem>(system.scoring_rubric);
  const levels = jsonArray<SystemForgeLevel>(system.progression_levels);
  const visibleVerdict = lastVerdict ?? (latestRep
    ? {
        score: latestRep.score ?? 1,
        verdict: (latestRep.verdict ?? "weak") as SystemForgeRepEvaluation["verdict"],
        why: "Latest saved System Forge rep.",
        weakness: latestRep.weakness ?? "No weakness recorded.",
        nextUpgrade: latestRep.next_upgrade ?? system.active_command,
      }
    : null);

  return (
    <section className="space-y-5">
      <Card className="panel p-4 md:p-5 border-border/80 bg-card/50 mobile-safe-card overflow-hidden">
        <div className="flex items-start justify-between gap-4 flex-col md:flex-row min-w-0">
          <div className="min-w-0 max-w-3xl">
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
              Active system
            </div>
            <h2 className="mt-2 text-xl md:text-2xl font-semibold break-words">
              {system.name}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground break-words">
              {system.goal}
            </p>
          </div>
          <Button type="button" onClick={onStart} className="w-full md:w-auto min-h-[44px]">
            Start First Rep
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <Signal label="Domain" value={system.domain} />
          <Signal label="Outcome" value={system.outcome} />
          <Signal label="Bottleneck" value={system.bottleneck} />
          <Signal label="Proof required" value={firstArtifact(system)} />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="panel p-4 border-border/80 bg-card/50 mobile-safe-card lg:col-span-2">
          <SectionTitle icon={<FileText />} title="Generated system overview" />
          <div className="mt-4 grid gap-4">
            <TextBlock label="Daily loop" value={system.daily_loop} />
            <TextBlock label="Minimum viable rep" value={system.minimum_viable_rep} />
            <TextBlock label="Review cycle" value={system.review_cycle} />
            <ListBlock label="Skills trained" items={skills} />
            <ListBlock label="Proof artifacts" items={proofArtifacts} />
          </div>
        </Card>

        <Card className="panel p-4 border-primary/30 bg-primary/5 mobile-safe-card">
          <SectionTitle icon={<Target />} title="Active command" />
          <p className="mt-3 text-base font-medium break-words">
            {system.active_command}
          </p>
          {latestRep && (
            <div className="mt-4 rounded-sm border border-border bg-background/40 p-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Latest rep result
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {latestRep.verdict && <EvidenceStrengthBadge strength={latestRep.verdict as never} />}
                <span className="text-xs text-muted-foreground">
                  {latestRep.score ? `${latestRep.score}/10` : "Unscored"}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground break-words">
                {latestRep.weakness ?? "Weakness not recorded."}
              </p>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="panel p-4 border-border/80 bg-card/50 mobile-safe-card">
          <SectionTitle icon={<Gavel />} title="Scoring rubric" />
          <div className="mt-3 grid gap-2">
            {rubric.map((item) => (
              <div key={item.criterion} className="rounded-sm border border-border bg-background/30 p-3 min-w-0">
                <div className="text-sm font-medium break-words">{item.criterion}</div>
                <p className="mt-1 text-xs text-muted-foreground break-words">
                  Weak: {item.weak}
                </p>
                <p className="mt-1 text-xs text-muted-foreground break-words">
                  Strong: {item.strong}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="panel p-4 border-border/80 bg-card/50 mobile-safe-card">
          <SectionTitle icon={<CheckCircle2 />} title="Progression levels" />
          <div className="mt-3 grid gap-2">
            {levels.map((item) => (
              <div key={item.level} className="rounded-sm border border-border bg-background/30 p-3 min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-widest text-primary break-words">{item.level}</div>
                <p className="mt-1 text-sm text-muted-foreground break-words">{item.standard}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="panel p-4 border-border/80 bg-card/50 mobile-safe-card">
        <SectionTitle icon={<Target />} title="Weekly structure" />
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {weekly.map((item) => (
            <div key={item.day} className="rounded-sm border border-border bg-background/30 p-3 min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{item.day} · {item.focus}</div>
              <p className="mt-1 text-sm break-words">{item.command}</p>
            </div>
          ))}
        </div>
      </Card>

      {proofOpen && (
        <Card className="panel p-4 md:p-5 border-primary/40 bg-primary/5 mobile-safe-card">
          <SectionTitle icon={<Gavel />} title="Submit proof" />
          <div className="mt-3 rounded-sm border border-border bg-background/40 p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Command</div>
            <p className="mt-1 text-sm break-words">{system.active_command}</p>
          </div>
          <div className="mt-4 grid gap-3">
            <Field label="Proof content">
              <Textarea
                rows={7}
                value={proofContent}
                onChange={(event) => onProofChange(event.target.value)}
                placeholder="Paste the artifact, transcript, log, paragraph, or concrete proof. No artifact, no claim."
              />
            </Field>
            <Field label="Self score">
              <Input
                inputMode="numeric"
                value={selfScore}
                onChange={(event) => onSelfScoreChange(event.target.value)}
                placeholder="Optional 1-10"
              />
            </Field>
            <Button type="button" onClick={onSubmitProof} disabled={submitting} className="w-full sm:w-auto min-h-[44px]">
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Gavel className="h-4 w-4 mr-2" />}
              Submit Proof
            </Button>
          </div>
        </Card>
      )}

      {visibleVerdict && (
        <Card className="panel p-4 md:p-5 border-primary/40 bg-primary/5 mobile-safe-card">
          <div className="flex items-start justify-between gap-3 flex-col sm:flex-row min-w-0">
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
                Proof saved. Next upgrade selected.
              </div>
              <h2 className="mt-2 text-lg font-semibold break-words">
                Verdict: {visibleVerdict.score}/10
              </h2>
            </div>
            <EvidenceStrengthBadge strength={visibleVerdict.verdict} />
          </div>
          <div className="mt-4 grid gap-3">
            <TextBlock label="Why" value={visibleVerdict.why} />
            <TextBlock label="Weakness" value={visibleVerdict.weakness} />
            <TextBlock label="Next upgrade" value={visibleVerdict.nextUpgrade} />
          </div>
          <div className="mt-4">
            <Link to="/dashboard">
              <Button variant="outline" size="sm">
                Return to dashboard
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </section>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-primary shrink-0 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground break-words">
        {title}
      </h3>
    </div>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-background/40 p-3 min-w-0">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground break-words">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium break-words">{value}</div>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground break-words">
        {label}
      </div>
      <p className="mt-1 text-sm break-words">{value}</p>
    </div>
  );
}

function ListBlock({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground break-words">
        {label}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-sm border border-border bg-background/40 px-2 py-1 text-xs text-muted-foreground break-words">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
