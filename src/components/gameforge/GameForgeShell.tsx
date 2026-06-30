import { useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  ClipboardCopy,
  Crosshair,
  Flame,
  Gauge,
  MessageSquare,
  Radar,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  Sword,
  Target,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/lib/eblocki/analytics";
import {
  advanceGameForgeSession,
  buildGameForgeMasteryResult,
  buildGameForgePack,
  buildGameForgeProofArtifact,
  createInitialGameForgeSession,
  detectGameForgeMode,
  getActiveQuestion,
  resolveGameForgeMistake,
  submitGameForgeAnswer,
  type GameForgeFeedback,
  type GameForgeGameStyle,
  type GameForgeIntensity,
  type GameForgeMasteryResult,
  type GameForgeMode,
  type GameForgePack,
  type GameForgeProofArtifact,
  type GameForgeQuestion,
  type GameForgeSession,
} from "@/lib/gameforge/gameforge-engine";

const MODE_OPTIONS: Array<{ value: GameForgeMode | "auto"; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "law", label: "Law" },
  { value: "psychology", label: "Psychology" },
  { value: "sales", label: "Sales" },
  { value: "language", label: "Language" },
  { value: "sport", label: "Sport" },
  { value: "finance", label: "Finance" },
  { value: "general", label: "General" },
  { value: "custom", label: "Custom" },
];

const INTENSITY_OPTIONS: Array<{ value: GameForgeIntensity; label: string }> = [
  { value: "warmup", label: "Warmup" },
  { value: "focused", label: "Focused" },
  { value: "exam", label: "Exam" },
  { value: "pressure", label: "Pressure" },
  { value: "elite", label: "Elite" },
];

const STYLE_OPTIONS: Array<{ value: GameForgeGameStyle; label: string }> = [
  { value: "mixed", label: "Mixed" },
  { value: "recall", label: "Recall Duel" },
  { value: "scenario", label: "Scenario Trial" },
  { value: "speed_round", label: "Speed Round" },
  { value: "mistake_clinic", label: "Mistake Clinic" },
  { value: "court_trial", label: "Court Trial" },
  { value: "transfer_challenge", label: "Transfer Challenge" },
  { value: "boss_battle", label: "Boss Battle" },
];

const DEMO_PACKS: Array<{ label: string; material: string; mode: GameForgeMode; style: GameForgeGameStyle; intensity: GameForgeIntensity }> = [
  {
    label: "Statutory Trial",
    material: "Statutory interpretation requires text, context and purpose. Ambiguity is resolved by reading the provision with the Act as a whole. A strong IRAC answer identifies the issue, states the rule, applies facts, handles counterargument and reaches a conclusion.",
    mode: "law",
    style: "court_trial",
    intensity: "exam",
  },
  {
    label: "Psych Application",
    material: "Cognitive dissonance occurs when behaviour conflicts with beliefs. People reduce discomfort by changing attitudes, justifying the behaviour, or avoiding conflicting evidence. Strong psychology answers define the concept, apply it to behaviour, use evidence and evaluate limitations.",
    mode: "psychology",
    style: "scenario",
    intensity: "focused",
  },
  {
    label: "Objection Arena",
    material: "A customer says the premium option is too expensive. Diagnose the actual need, frame value, attach warranty or service only when it solves the risk, handle the objection and close with a clear recommendation.",
    mode: "sales",
    style: "scenario",
    intensity: "pressure",
  },
  {
    label: "False 9 Read",
    material: "A false nine drops into midfield to create overloads, pulls centre backs out, opens third-man runs and requires scanning before receiving. The tactical proof is the decision cue, movement, pass option and match-transfer drill.",
    mode: "sport",
    style: "transfer_challenge",
    intensity: "elite",
  },
];

type GameForgeRouteState = {
  seed?: string;
  mode?: GameForgeMode;
  style?: GameForgeGameStyle;
  intensity?: GameForgeIntensity;
};

function countQuestions(pack: GameForgePack | null): number {
  if (!pack) return 0;
  return pack.levels.reduce((sum, level) => sum + level.rounds.reduce((roundSum, round) => roundSum + round.questions.length, 0), 0);
}

function buildProofText(artifact: GameForgeProofArtifact): string {
  return [
    artifact.title,
    `Domain: ${artifact.domain}`,
    `Mastery score: ${artifact.masteryScore}`,
    `Evidence: ${artifact.evidence}`,
    `Weak point: ${artifact.weakPoint}`,
    `Next upgrade: ${artifact.nextUpgrade}`,
  ].join("\n");
}

export function GameForgeShell() {
  const location = useLocation();
  const routeState = (location.state ?? {}) as GameForgeRouteState;
  const [sourceMaterial, setSourceMaterial] = useState(routeState.seed ?? "");
  const [mode, setMode] = useState<GameForgeMode | "auto">(routeState.mode ?? "auto");
  const [intensity, setIntensity] = useState<GameForgeIntensity>(routeState.intensity ?? "focused");
  const [style, setStyle] = useState<GameForgeGameStyle>(routeState.style ?? "mixed");
  const [pack, setPack] = useState<GameForgePack | null>(null);
  const [session, setSession] = useState<GameForgeSession | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [confidence, setConfidence] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [lastFeedback, setLastFeedback] = useState<GameForgeFeedback | null>(null);
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now());
  const [masteryResult, setMasteryResult] = useState<GameForgeMasteryResult | null>(null);
  const [proofArtifact, setProofArtifact] = useState<GameForgeProofArtifact | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [proofSubmittedId, setProofSubmittedId] = useState<string | null>(null);

  const detectedMode = useMemo(() => detectGameForgeMode(sourceMaterial), [sourceMaterial]);
  const activeQuestion = useMemo<GameForgeQuestion | null>(() => (pack && session ? getActiveQuestion(pack, session) : null), [pack, session]);
  const totalQuestions = useMemo(() => countQuestions(pack), [pack]);
  const progress = session && totalQuestions ? Math.round((session.answers.length / totalQuestions) * 100) : 0;
  const activeLevel = pack && session ? pack.levels[session.currentLevelIndex] : null;
  const activeRound = activeLevel && session ? activeLevel.rounds[session.currentRoundIndex] : null;

  function resetPlayState() {
    setSession(null);
    setSelectedAnswer("");
    setConfidence(3);
    setLastFeedback(null);
    setMasteryResult(null);
    setProofArtifact(null);
    setProofSubmittedId(null);
  }

  function handleGeneratePack() {
    const nextPack = buildGameForgePack({
      material: sourceMaterial,
      mode,
      intensity,
      style,
    });
    setPack(nextPack);
    resetPlayState();
    logEvent("gameforge_pack_generated", {
      domain: nextPack.mode,
      mode: nextPack.mode,
      intensity: nextPack.intensity,
      style: nextPack.style,
    });
  }

  function handleLoadDemo(index: number) {
    const demo = DEMO_PACKS[index];
    setSourceMaterial(demo.material);
    setMode(demo.mode);
    setStyle(demo.style);
    setIntensity(demo.intensity);
    const nextPack = buildGameForgePack({ material: demo.material, mode: demo.mode, style: demo.style, intensity: demo.intensity });
    setPack(nextPack);
    resetPlayState();
  }

  function handleStartSession() {
    if (!pack) return;
    setSession(createInitialGameForgeSession(pack));
    setSelectedAnswer("");
    setConfidence(3);
    setLastFeedback(null);
    setMasteryResult(null);
    setProofArtifact(null);
    setQuestionStartedAt(Date.now());
  }

  function finishSession(nextSession: GameForgeSession) {
    if (!pack) return;
    const finished = { ...nextSession, phase: "complete" as const };
    const result = buildGameForgeMasteryResult(pack, finished);
    const artifact = buildGameForgeProofArtifact(pack, result);
    setSession(finished);
    setMasteryResult(result);
    setProofArtifact(artifact);
    logEvent("gameforge_mastery_result", {
      domain: pack.mode,
      mode: pack.mode,
      score: result.score,
      scoreBucket: result.scoreBucket,
      accuracy: result.accuracy,
      bossCompleted: result.completedBossBattle,
    });
  }

  function handleSubmitAnswer() {
    if (!pack || !session || !activeQuestion || !selectedAnswer.trim()) return;
    const responseTimeMs = Date.now() - questionStartedAt;
    const { session: nextSession, feedback } = submitGameForgeAnswer({
      pack,
      session,
      question: activeQuestion,
      userAnswer: selectedAnswer,
      confidence,
      responseTimeMs,
    });
    setSession(nextSession);
    setLastFeedback(feedback);
    logEvent("gameforge_round_completed", {
      domain: pack.mode,
      mode: pack.mode,
      roundStyle: activeRound?.style ?? activeQuestion.type,
      correct: feedback.isCorrect,
      difficulty: activeQuestion.difficulty,
    });
    if (activeQuestion.type === "boss_battle") {
      logEvent("gameforge_boss_battle_completed", {
        domain: pack.mode,
        mode: pack.mode,
        correct: feedback.isCorrect,
        difficulty: activeQuestion.difficulty,
      });
    }
  }

  function handleNextQuestion() {
    if (!pack || !session) return;
    const next = advanceGameForgeSession(pack, session);
    setLastFeedback(null);
    setSelectedAnswer("");
    setConfidence(3);
    setQuestionStartedAt(Date.now());
    if (next.phase === "complete") finishSession(next);
    else setSession(next);
  }

  function handleResolveMistake(questionId: string) {
    if (!session) return;
    const next = resolveGameForgeMistake(session, questionId);
    setSession(next);
    if (pack && next.phase === "complete") {
      const result = buildGameForgeMasteryResult(pack, next);
      setMasteryResult(result);
      setProofArtifact(buildGameForgeProofArtifact(pack, result));
    }
  }

  async function handleCopyProof() {
    if (!proofArtifact) return;
    if (!navigator.clipboard) {
      toast.error("Clipboard unavailable. Select the proof text manually.");
      return;
    }
    await navigator.clipboard.writeText(buildProofText(proofArtifact));
    toast.success("Proof artifact copied.");
  }

  async function handleSubmitProofToLedger() {
    if (!pack || !masteryResult || !proofArtifact || submittingProof) return;
    setSubmittingProof(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sign in to submit GameForge proof to your ledger.");
        return;
      }
      const domainMap: Record<string, string> = {
        law: "law",
        psychology: "psychology",
        sales: "sales",
        sport: "sport",
        finance: "finance",
        language: "life",
        general: "life",
        custom: "life",
      };
      const evidenceStrength =
        masteryResult.scoreBucket === "mastery" ? "elite"
        : masteryResult.scoreBucket === "strong" ? "strong"
        : masteryResult.scoreBucket === "solid" ? "moderate"
        : "weak";
      const qualityScore = Math.max(1, Math.min(5, Math.round(masteryResult.score / 20)));
      const content = [
        `GameForge mastery proof — ${pack.title}`,
        `Mastery score: ${masteryResult.score}/100 (${masteryResult.masteryLabel}).`,
        `Accuracy: ${masteryResult.accuracy}%. XP: ${masteryResult.xp}. Boss battle: ${masteryResult.completedBossBattle ? "cleared" : "not cleared"}.`,
        `Strongest skill: ${masteryResult.strongestSkill}.`,
        `Weak points: ${masteryResult.weakPoints.join("; ")}.`,
        `Next upgrade: ${proofArtifact.nextUpgrade}`,
      ].join("\n");
      const { data: row, error } = await supabase
        .from("proof_artifacts")
        .insert({
          user_id: user.id,
          domain: domainMap[pack.mode] ?? "life",
          title: proofArtifact.title.slice(0, 200),
          artifact_type: "gameforge",
          content,
          quality_score: qualityScore,
          evidence_strength: evidenceStrength,
          next_upgrade: proofArtifact.nextUpgrade,
          pressure_flag: masteryResult.completedBossBattle,
          transfer_flag: masteryResult.score >= 78,
        })
        .select("id")
        .single();
      if (error) throw error;
      setProofSubmittedId(row?.id ?? null);
      toast.success("Proof submitted to evidence ledger.");
    } catch (err) {
      console.error("[gameforge] submit proof failed", err);
      toast.error("Could not submit proof. Try again or copy it manually.");
    } finally {
      setSubmittingProof(false);
    }
  }

  const coachSeed = pack && masteryResult
    ? `Review this GameForge result. Domain: ${pack.mode}. Mastery score: ${masteryResult.score}. Weak points: ${masteryResult.weakPoints.join(", ")}. Next upgrade: ${masteryResult.nextPracticeRecommendation}.`
    : "";

  return (
    <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto space-y-5">
      <header className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">GameForge // Practice Engine</div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">Turn material into playable mastery.</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Paste notes, choose the pressure, play the rounds, expose weak points, clear the boss battle, and leave with a proof artifact.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/5 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Playable fallback active
        </div>
      </header>

      <Card className="panel overflow-hidden border-primary/25 bg-card/60">
        <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">GameForge Input Console</div>
            <div className="mt-1 text-sm text-foreground">Paste any material. Empty input still creates a safe starter pack.</div>
          </div>
          <Radar className="h-4 w-4 text-primary" />
        </div>
        <div className="p-4 md:p-5 space-y-4">
          <Textarea
            value={sourceMaterial}
            onChange={(event) => setSourceMaterial(event.target.value)}
            rows={6}
            className="resize-none"
            placeholder="Paste law notes, psych concepts, sales objections, sport tactics, Spanish vocab, finance material, or any confused explanation."
          />
          <div className="grid gap-3 md:grid-cols-3">
            <Selector label="Mode" value={mode} onChange={(value) => setMode(value as GameForgeMode | "auto")} items={MODE_OPTIONS} />
            <Selector label="Intensity" value={intensity} onChange={(value) => setIntensity(value as GameForgeIntensity)} items={INTENSITY_OPTIONS} />
            <Selector label="Game Style" value={style} onChange={(value) => setStyle(value as GameForgeGameStyle)} items={STYLE_OPTIONS} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="flex flex-wrap gap-2">
              {DEMO_PACKS.map((demo, index) => (
                <Button key={demo.label} size="sm" variant="outline" onClick={() => handleLoadDemo(index)}>
                  {demo.label}
                </Button>
              ))}
            </div>
            <Button onClick={handleGeneratePack} className="gap-2">
              <Zap className="h-4 w-4" /> Generate Game
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <Signal label="Detected" value={detectedMode} icon={<Radar />} />
            <Signal label="Style" value={style.replace(/_/g, " ")} icon={<Sword />} />
            <Signal label="Intensity" value={intensity} icon={<Gauge />} />
            <Signal label="Proof" value="required" icon={<Shield />} />
          </div>
        </div>
      </Card>

      {pack && !session && (
        <Card className="panel p-4 md:p-5 border-border/80 bg-card/50">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Generated Game Pack</div>
              <h2 className="mt-1 text-xl font-semibold">{pack.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{pack.proofStandard}</p>
            </div>
            <Button onClick={handleStartSession} className="gap-2">
              <Target className="h-4 w-4" /> Start Pack
            </Button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <Metric label="Domain" value={pack.mode} />
            <Metric label="Difficulty" value={`${pack.difficultyRating}/10`} />
            <Metric label="Concepts" value={String(pack.concepts.length)} />
            <Metric label="Questions" value={String(totalQuestions)} />
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-sm border border-border bg-background/30 p-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Learning Objectives</div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {pack.learningObjectives.map((objective) => <li key={objective}>{objective}</li>)}
              </ul>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {pack.levels.map((level) => (
                <div key={level.id} className="rounded-sm border border-border bg-background/30 p-3">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{level.difficulty}</div>
                  <div className="mt-1 text-sm font-medium">{level.title}</div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{level.objective}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {pack && session && session.phase !== "complete" && activeQuestion && (
        <Card className={cn("panel p-4 md:p-5 border-border/80 bg-card/50", session.phase === "boss_battle" && "border-primary/50 bg-primary/5")}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {session.phase === "boss_battle" ? "Boss Battle" : activeRound?.title ?? "Active Round"}
              </div>
              <h2 className="mt-1 text-lg font-semibold">{activeLevel?.title}</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 min-w-[240px]">
              <Metric label="XP" value={String(session.xp)} />
              <Metric label="Streak" value={String(session.streak)} />
              <Metric label="Focus" value={String(session.focus)} />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>{session.answers.length}/{totalQuestions} answered</span>
              <span>Adaptive: {session.adaptiveDifficulty}</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          <div className="mt-5 rounded-sm border border-border bg-background/35 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
                {activeQuestion.difficulty} // {activeQuestion.skill}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{activeQuestion.xp} XP</div>
            </div>
            <h3 className="mt-3 text-base md:text-lg font-medium leading-snug">{activeQuestion.prompt}</h3>

            {activeQuestion.answerMode === "choice" && activeQuestion.options ? (
              <div className="mt-4 grid gap-2">
                {activeQuestion.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={!!lastFeedback}
                    onClick={() => setSelectedAnswer(option)}
                    className={cn(
                      "rounded-sm border px-3 py-3 text-left text-sm transition-colors",
                      selectedAnswer === option ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card/70 text-muted-foreground hover:text-foreground hover:bg-muted/40",
                      lastFeedback && option === activeQuestion.expectedAnswer && "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <Textarea
                value={selectedAnswer}
                disabled={!!lastFeedback}
                onChange={(event) => setSelectedAnswer(event.target.value)}
                className="mt-4 min-h-[110px] resize-none"
                placeholder="Answer with the concept, application, decision, or framework move."
              />
            )}

            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Confidence</span>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={!!lastFeedback}
                    onClick={() => setConfidence(value as 1 | 2 | 3 | 4 | 5)}
                    className={cn(
                      "h-8 w-8 rounded-sm border font-mono text-xs",
                      confidence === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/40",
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
              {!lastFeedback && <Button onClick={handleSubmitAnswer} disabled={!selectedAnswer.trim()}>Submit Answer</Button>}
            </div>

            {lastFeedback && (
              <div className={cn("mt-4 rounded-sm border p-3 text-sm", lastFeedback.isCorrect ? "border-emerald-500/40 bg-emerald-500/10" : "border-destructive/40 bg-destructive/10")}>
                <div className="flex items-center gap-2 font-medium">
                  {lastFeedback.isCorrect ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  {lastFeedback.isCorrect ? "Correct" : "Mistake exposed"}
                </div>
                <p className="mt-2 text-muted-foreground">{lastFeedback.explanation}</p>
                {!lastFeedback.isCorrect && <p className="mt-2 text-xs text-muted-foreground">Recovery drill: {lastFeedback.recoveryDrill}</p>}
                <Button onClick={handleNextQuestion} className="mt-3" size="sm">
                  Next <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {session && session.mistakes.some((m) => !m.resolved) && (
        <Card className="panel p-4 md:p-5 border-border/80 bg-card/50">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Mistake Clinic</div>
              <h2 className="mt-1 text-base font-semibold">{session.mistakes.filter((mistake) => !mistake.resolved).length} open weak point(s)</h2>
            </div>
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-4 grid gap-2">
            {session.mistakes.filter((m) => !m.resolved).map((mistake) => (
              <div key={mistake.questionId} className="rounded-sm border border-border bg-background/30 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{mistake.mistakeKind ?? "mistake"}</div>
                    <div className="mt-1 text-sm font-medium">{mistake.skill}</div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{mistake.recoveryDrill}</p>
                  </div>
                  {mistake.resolved ? (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">Resolved</span>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleResolveMistake(mistake.questionId)}>Mark resolved</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {pack && session?.phase === "complete" && masteryResult && (
        <Card className="panel p-4 md:p-5 border-primary/35 bg-primary/5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Mastery Result</div>
              <h2 className="mt-1 text-xl font-semibold">{masteryResult.masteryLabel}</h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{masteryResult.summary}</p>
            </div>
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <Metric label="Score" value={`${masteryResult.score}/100`} />
            <Metric label="Accuracy" value={`${masteryResult.accuracy}%`} />
            <Metric label="XP" value={String(masteryResult.xp)} />
            <Metric label="Boss" value={masteryResult.completedBossBattle ? "cleared" : "missed"} />
          </div>
          <div className="mt-4 rounded-sm border border-border bg-background/30 p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Next practice</div>
            <p className="mt-1 text-sm">{masteryResult.nextPracticeRecommendation}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleStartSession} className="gap-2"><RefreshCw className="h-4 w-4" /> Replay</Button>
            <Link to="/coach" state={{ coachSeed, mode: "proof_review" }}>
              <Button variant="outline" className="gap-2"><MessageSquare className="h-4 w-4" /> Ask Coach to Review</Button>
            </Link>
          </div>
        </Card>
      )}

      {proofArtifact && (
        <Card className="panel p-4 md:p-5 border-primary/45 bg-card/60">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Proof Artifact Output</div>
              <h2 className="mt-1 text-base font-semibold">{proofArtifact.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{proofArtifact.summary}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={handleCopyProof} className="gap-2"><ClipboardCopy className="h-3.5 w-3.5" /> Copy</Button>
              <Button
                size="sm"
                onClick={handleSubmitProofToLedger}
                disabled={submittingProof || !!proofSubmittedId}
                className="gap-2"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {proofSubmittedId ? "Submitted" : submittingProof ? "Submitting..." : "Submit to Evidence Ledger"}
              </Button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Domain" value={proofArtifact.domain} />
            <Metric label="Evidence" value={proofArtifact.evidence} />
            <Metric label="Weak point" value={proofArtifact.weakPoint} />
            <Metric label="Next upgrade" value={proofArtifact.nextUpgrade} />
          </div>
        </Card>
      )}
    </div>
  );
}

function Selector({ label, value, onChange, items }: { label: string; value: string; onChange: (value: string) => void; items: Array<{ value: string; label: string }> }) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
        <SelectContent>
          {items.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function Signal({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-sm border border-border bg-background/30 p-3 min-w-0">
      <div className="flex items-center gap-1.5 text-primary [&_svg]:h-3.5 [&_svg]:w-3.5">
        {icon}
        <span className="font-mono text-[9px] uppercase tracking-widest">{label}</span>
      </div>
      <div className="mt-1 truncate text-sm">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-background/30 p-3 min-w-0">
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm text-foreground">{value}</div>
    </div>
  );
}
