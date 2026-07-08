import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Seo } from "@/components/Seo";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  evaluateSystemForgeRep,
  generateSystemForgeDraft,
  type SystemForgeDraft,
  type SystemForgeRepEvaluation,
} from "@/lib/eblocki/system-forge";
import {
  createSystem,
  fetchActiveSystem,
  listRecentReps,
  submitRep,
  type CustomSystemRow,
  type SystemRepRow,
} from "@/lib/eblocki/system-forge-store";

function rowToDraft(row: CustomSystemRow): SystemForgeDraft {
  return {
    name: row.name,
    domain: row.domain as SystemForgeDraft["domain"],
    goal: row.goal,
    outcome: row.outcome,
    bottleneck: row.bottleneck,
    availableMinutesPerDay: row.available_minutes_per_day,
    skills: (row.skills as string[]) ?? [],
    dailyLoop: row.daily_loop,
    weeklyStructure: (row.weekly_structure as SystemForgeDraft["weeklyStructure"]) ?? [],
    minimumViableRep: row.minimum_viable_rep,
    proofArtifacts: (row.proof_artifacts as string[]) ?? [],
    scoringRubric: (row.scoring_rubric as SystemForgeDraft["scoringRubric"]) ?? [],
    progressionLevels: (row.progression_levels as SystemForgeDraft["progressionLevels"]) ?? [],
    reviewCycle: row.review_cycle,
    firstCommand: row.first_command,
    activeCommand: row.active_command,
    artifactType: (row.proof_artifacts as string[])?.[0] ?? "visible artifact",
  };
}

export default function Systems() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeRow, setActiveRow] = useState<CustomSystemRow | null>(null);
  const [reps, setReps] = useState<SystemRepRow[]>([]);
  const [showForge, setShowForge] = useState(false);

  // form state
  const [domain, setDomain] = useState("");
  const [improvementGoal, setImprovementGoal] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [currentBottleneck, setCurrentBottleneck] = useState("");
  const [minutes, setMinutes] = useState(20);
  const [creating, setCreating] = useState(false);

  // rep state
  const [repOpen, setRepOpen] = useState(false);
  const [proofContent, setProofContent] = useState("");
  const [selfScore, setSelfScore] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [lastEval, setLastEval] = useState<SystemForgeRepEvaluation | null>(null);

  const draft = useMemo(() => (activeRow ? rowToDraft(activeRow) : null), [activeRow]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) return;
      setLoading(true);
      setLoadError(null);
      try {
        const row = await fetchActiveSystem(user.id);
        if (cancelled) return;
        setActiveRow(row);
        if (row) {
          const recent = await listRecentReps(row.id);
          if (!cancelled) setReps(recent);
        }
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Could not load systems.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleForge(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!domain.trim() || !improvementGoal.trim()) {
      toast({ title: "Add a domain and goal", description: "Both are needed to forge a system." });
      return;
    }
    setCreating(true);
    try {
      const generated = generateSystemForgeDraft({
        domain,
        improvementGoal,
        desiredOutcome,
        currentBottleneck,
        availableMinutesPerDay: minutes,
      });
      const row = await createSystem(user.id, generated);
      setActiveRow(row);
      setReps([]);
      setLastEval(null);
      setRepOpen(false);
      setShowForge(false);
      toast({ title: "System forged", description: "Generated from your inputs." });
    } catch (err) {
      toast({
        title: "Could not save system",
        description: err instanceof Error ? err.message : "Nothing was claimed.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleSubmitRep(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !activeRow || !draft) return;
    if (proofContent.trim().length < 10) {
      toast({ title: "Proof too thin", description: "Add specific artifact detail before submitting." });
      return;
    }
    setSubmitting(true);
    try {
      const evaluation = evaluateSystemForgeRep({
        system: {
          domain: draft.domain,
          artifactType: draft.artifactType,
          activeCommand: draft.activeCommand,
        },
        proofContent,
        selfScore: selfScore === "" ? null : Number(selfScore),
      });
      const saved = await submitRep({
        userId: user.id,
        systemId: activeRow.id,
        command: draft.activeCommand,
        artifactType: draft.artifactType,
        proofContent,
        selfScore: selfScore === "" ? null : Number(selfScore),
        evaluation,
      });
      setLastEval(evaluation);
      setReps((prev) => [saved, ...prev].slice(0, 5));
      setProofContent("");
      setSelfScore("");
      toast({ title: "Proof submitted", description: "Next upgrade selected." });
    } catch (err) {
      toast({
        title: "Could not save proof",
        description: err instanceof Error ? err.message : "Nothing was claimed.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <Seo
        title="System Forge | EBLOCKI"
        description="Turn any goal into a proof-based training system with a first command."
        path="/systems"
      />
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-4 min-w-0">
        <Card className="panel p-5 md:p-6 border-border/80 bg-card/50 min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            System Forge
          </div>
          <h1 className="mt-2 text-xl md:text-2xl font-semibold">
            Build a proof-based training system for anything.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground break-words">
            Turn a goal into reps, proof, scoring, and next commands. Generated from your inputs.
          </p>
        </Card>

        {loading && (
          <Card className="p-5 text-sm text-muted-foreground">Loading systems…</Card>
        )}

        {loadError && !loading && (
          <Card className="p-5 text-sm text-destructive">Could not load systems: {loadError}</Card>
        )}

        {!loading && !activeRow && !showForge && (
          <Card className="p-5 space-y-3 min-w-0">
            <div className="text-sm text-muted-foreground">
              No system yet. Forge one goal into a proof loop.
            </div>
            <Button onClick={() => setShowForge(true)}>Forge my system</Button>
          </Card>
        )}

        {!loading && (showForge || (!activeRow && !loadError)) && !activeRow && (
          <Card className="p-5 md:p-6 min-w-0">
            <form onSubmit={handleForge} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  placeholder="law, sales, spanish, football, founder, study, fitness…"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal">Improvement goal</Label>
                <Input
                  id="goal"
                  placeholder="What do you want to get better at?"
                  value={improvementGoal}
                  onChange={(e) => setImprovementGoal(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="outcome">Desired outcome</Label>
                <Input
                  id="outcome"
                  placeholder="What proof would show it's working?"
                  value={desiredOutcome}
                  onChange={(e) => setDesiredOutcome(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bottleneck">Current bottleneck</Label>
                <Input
                  id="bottleneck"
                  placeholder="What are you avoiding?"
                  value={currentBottleneck}
                  onChange={(e) => setCurrentBottleneck(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="minutes">Minutes per day</Label>
                <Input
                  id="minutes"
                  type="number"
                  min={5}
                  max={180}
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value) || 20)}
                />
              </div>
              <Button type="submit" disabled={creating}>
                {creating ? "Forging…" : "Forge my system"}
              </Button>
            </form>
          </Card>
        )}

        {activeRow && draft && (
          <Card className="p-5 md:p-6 space-y-4 min-w-0">
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Active system
              </div>
              <h2 className="mt-1 text-lg font-semibold break-words">{draft.name}</h2>
              <p className="text-xs text-muted-foreground">
                {draft.domain} · {draft.availableMinutesPerDay} min/day
              </p>
            </div>

            <div className="rounded-md border border-border/60 bg-background/40 p-3 space-y-2 min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Active command
              </div>
              <p className="text-sm break-words">{draft.activeCommand}</p>
              <p className="text-xs text-muted-foreground break-words">
                Proof required: {draft.artifactType}. Minimum viable rep: {draft.minimumViableRep}
              </p>
              {!repOpen && (
                <Button onClick={() => setRepOpen(true)} className="mt-2">
                  Start first rep
                </Button>
              )}
            </div>

            {repOpen && (
              <form onSubmit={handleSubmitRep} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="proof">Proof of the rep</Label>
                  <Textarea
                    id="proof"
                    rows={6}
                    placeholder="Describe the artifact you produced. Include time, output, and one weakness or correction."
                    value={proofContent}
                    onChange={(e) => setProofContent(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="self">Self score (1–10, optional)</Label>
                  <Input
                    id="self"
                    type="number"
                    min={1}
                    max={10}
                    value={selfScore}
                    onChange={(e) =>
                      setSelfScore(e.target.value === "" ? "" : Number(e.target.value))
                    }
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Submitting…" : "Submit proof"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setRepOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {lastEval && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2 min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Verdict
                </div>
                <p className="text-sm font-semibold capitalize">
                  {lastEval.verdict} · score {lastEval.score}
                </p>
                <p className="text-sm break-words">{lastEval.why}</p>
                <p className="text-sm break-words">
                  <span className="text-muted-foreground">Weakness: </span>
                  {lastEval.weakness}
                </p>
                <p className="text-sm break-words">
                  <span className="text-muted-foreground">Next upgrade: </span>
                  {lastEval.nextUpgrade}
                </p>
              </div>
            )}

            <Accordion type="single" collapsible>
              <AccordionItem value="details">
                <AccordionTrigger className="text-sm">System details</AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div>
                    <div className="text-xs font-medium">Goal</div>
                    <p className="text-sm break-words">{draft.goal}</p>
                  </div>
                  <div>
                    <div className="text-xs font-medium">Outcome</div>
                    <p className="text-sm break-words">{draft.outcome}</p>
                  </div>
                  <div>
                    <div className="text-xs font-medium">Bottleneck</div>
                    <p className="text-sm break-words">{draft.bottleneck}</p>
                  </div>
                  <div>
                    <div className="text-xs font-medium">Daily loop</div>
                    <p className="text-sm break-words">{draft.dailyLoop}</p>
                  </div>
                  <div>
                    <div className="text-xs font-medium">Weekly structure</div>
                    <ul className="text-sm space-y-1">
                      {draft.weeklyStructure.map((w) => (
                        <li key={w.day} className="break-words">
                          <span className="text-muted-foreground">{w.day} · {w.focus}: </span>
                          {w.command}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs font-medium">Scoring rubric</div>
                    <ul className="text-sm space-y-1">
                      {draft.scoringRubric.map((r) => (
                        <li key={r.criterion} className="break-words">
                          <span className="text-muted-foreground">{r.criterion}: </span>
                          weak — {r.weak} / strong — {r.strong}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs font-medium">Progression</div>
                    <ul className="text-sm space-y-1">
                      {draft.progressionLevels.map((l) => (
                        <li key={l.level} className="break-words">
                          <span className="text-muted-foreground">{l.level}: </span>
                          {l.standard}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs font-medium">Review cycle</div>
                    <p className="text-sm break-words">{draft.reviewCycle}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {reps.length > 0 && (
              <div className="space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Recent reps
                </div>
                <ul className="space-y-2">
                  {reps.map((rep) => (
                    <li key={rep.id} className="rounded-md border border-border/60 p-3 text-sm min-w-0">
                      <div className="flex justify-between gap-2 flex-wrap">
                        <span className="capitalize font-medium">{rep.verdict ?? "—"}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(rep.created_at).toLocaleString()}
                        </span>
                      </div>
                      {rep.next_upgrade && (
                        <p className="text-xs text-muted-foreground mt-1 break-words">
                          Next: {rep.next_upgrade}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <Button variant="ghost" size="sm" onClick={() => { setActiveRow(null); setShowForge(true); setLastEval(null); }}>
                Forge a new system
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
