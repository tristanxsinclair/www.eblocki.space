import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Zap, Target, Trophy, Brain, RefreshCw, CheckCircle2, XCircle, Flame, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateLocalGamePack } from "@/lib/gameforge/packGenerator";
import { DEMO_SEEDS, buildDemoPack } from "@/lib/gameforge/demoPacks";
import {
  createInitialSession,
  createUserAnswer,
  classifyMistake,
} from "@/lib/gameforge/gameEngine";
import { createGameForgeProofArtifact } from "@/lib/gameforge/proofArtifact";
import { calculateAccuracy, calculateMasteryRank } from "@/lib/gameforge/scoring";
import type {
  GameForgeIntensity,
  GameForgeMode,
  GameForgeProofArtifact,
  GamePack,
  GameQuestion,
  GameSession,
  GameForgeStyle,
} from "@/lib/gameforge/types";

const MODES: { value: GameForgeMode; label: string }[] = [
  { value: "general_knowledge", label: "General Knowledge" },
  { value: "law_max", label: "Law Max (IRAC)" },
  { value: "psych_hd", label: "Psych HD" },
  { value: "sales_close", label: "Sales Close" },
  { value: "language_grind", label: "Language Grind" },
  { value: "sport_iq", label: "Sport IQ" },
  { value: "finance_builder", label: "Finance Builder" },
  { value: "custom", label: "Custom" },
];

const INTENSITIES: { value: GameForgeIntensity; label: string }[] = [
  { value: "casual", label: "Casual" },
  { value: "focused", label: "Focused" },
  { value: "exam_prep", label: "Exam Prep" },
  { value: "boss_fight", label: "Boss Fight" },
  { value: "elite_mastery", label: "Elite Mastery" },
];

const STYLES: { value: GameForgeStyle; label: string }[] = [
  { value: "mixed_mode", label: "Mixed Mode" },
  { value: "quick_sprint", label: "Quick Sprint" },
  { value: "full_lesson_path", label: "Full Lesson Path" },
  { value: "mistake_clinic", label: "Mistake Clinic" },
  { value: "boss_battle", label: "Boss Battle" },
  { value: "scenario_simulator", label: "Scenario Simulator" },
  { value: "memory_drill", label: "Memory Drill" },
  { value: "application_challenge", label: "Application Challenge" },
];

function flattenQuestions(pack: GamePack): GameQuestion[] {
  return pack.levels.flatMap((l) => l.questions);
}

function modeFeedback(mode: GameForgeMode, correct: boolean, confidence: number, isFast = false): string {
  if (correct && confidence <= 2) return "Correct with low confidence. Knowledge exists; calibration needs work.";
  if (!correct && confidence >= 4) return "False certainty detected. Confidence exceeded evidence.";
  if (!correct && isFast) return "Speed is leaking precision. Slow the next answer down.";
  if (correct) {
    switch (mode) {
      case "law_max":
        return "Correct — recall-level. Next answer must apply the rule to facts (IRAC).";
      case "psych_hd":
        return "Correct. Now push from concept → application → evidence → evaluation.";
      case "sales_close":
        return "Correct. Now attach value before defending price.";
      case "sport_iq":
        return "Correct decision — scan before receiving on the next rep.";
      default:
        return "Correct. This is usable recall. Next level forces application.";
    }
  }
  switch (mode) {
    case "law_max":
      return "Wrong. You identified a legal term but missed the operative issue.";
    case "psych_hd":
      return "Wrong. You defined the concept but did not apply or evaluate it.";
    case "sales_close":
      return "Wrong. You matched the product but missed the attachment point.";
    default:
      return "Incorrect. You confused the concept with a distractor. Fix the pattern before chasing XP.";
  }
}

export function GameForgeShell() {
  const [sourceMaterial, setSourceMaterial] = useState("");
  const [mode, setMode] = useState<GameForgeMode>("general_knowledge");
  const [intensity, setIntensity] = useState<GameForgeIntensity>("focused");
  const [style, setStyle] = useState<GameForgeStyle>("mixed_mode");

  const [pack, setPack] = useState<GamePack | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [confidence, setConfidence] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [lastFeedback, setLastFeedback] = useState<{ kind: "correct" | "incorrect"; msg: string } | null>(null);
  const [proofArtifact, setProofArtifact] = useState<GameForgeProofArtifact | null>(null);
  const [questionStart, setQuestionStart] = useState<number>(Date.now());

  const flat = useMemo(() => (pack ? flattenQuestions(pack) : []), [pack]);
  const currentQuestion = useMemo<GameQuestion | null>(() => {
    if (!pack || !session) return null;
    const level = pack.levels[session.currentLevelIndex];
    if (!level) return null;
    return level.questions[session.currentQuestionIndex] ?? null;
  }, [pack, session]);

  const totalAnswered = session?.answers.length ?? 0;
  const totalQuestions = flat.length;

  function handleGeneratePack() {
    const text = sourceMaterial.trim() || DEMO_SEEDS[0].source;
    const next = generateLocalGamePack({
      sourceMaterial: text,
      mode,
      intensity,
      style,
    });
    setPack(next);
    setSession(null);
    setProofArtifact(null);
    setLastFeedback(null);
  }

  function handleLoadDemo(i: number) {
    const demo = buildDemoPack(i);
    setSourceMaterial(DEMO_SEEDS[i].source);
    setMode(demo.mode);
    setIntensity(demo.intensity);
    setStyle(demo.style);
    setPack(demo);
    setSession(null);
    setProofArtifact(null);
    setLastFeedback(null);
  }

  function handleStartSession() {
    if (!pack) return;
    setSession(createInitialSession(pack.id));
    setSelectedAnswer("");
    setConfidence(3);
    setLastFeedback(null);
    setProofArtifact(null);
    setQuestionStart(Date.now());
  }

  function handleSubmitAnswer() {
    if (!pack || !session || !currentQuestion || !selectedAnswer) return;
    const responseTimeMs = Date.now() - questionStart;
    const answer = createUserAnswer({ question: currentQuestion, userAnswer: selectedAnswer, confidence });
    answer.responseTimeMs = responseTimeMs;

    const correct = answer.isCorrect;
    const newAnswers = [...session.answers, answer];
    const newMistakes = correct ? session.mistakes : [...session.mistakes, classifyMistake(currentQuestion, answer)];
    const correctStreak = correct ? session.correctStreak + 1 : 0;
    const wrongStreak = correct ? 0 : session.wrongStreak + 1;
    const xp = session.xp + answer.xpAwarded;
    const focusPoints = Math.max(0, session.focusPoints - (correct ? 0 : 1));

    setSession({
      ...session,
      answers: newAnswers,
      mistakes: newMistakes,
      correctStreak,
      wrongStreak,
      xp,
      focusPoints,
    });

    const isFast = responseTimeMs < 2500;
    let msg = modeFeedback(pack.mode, correct, confidence, isFast);
    if (correct && correctStreak >= 3) msg += " — Difficulty rising.";
    if (!correct && wrongStreak >= 2) msg += " — Mistake Clinic triggered.";
    setLastFeedback({ kind: correct ? "correct" : "incorrect", msg });
  }

  function handleNextQuestion() {
    if (!pack || !session) return;
    const level = pack.levels[session.currentLevelIndex];
    const lastQ = session.currentQuestionIndex >= level.questions.length - 1;
    const lastLevel = session.currentLevelIndex >= pack.levels.length - 1;
    const focusDead = session.focusPoints <= 0;

    if (focusDead || (lastQ && lastLevel)) {
      handleFinishSession();
      return;
    }
    const nextLevelIndex = lastQ ? session.currentLevelIndex + 1 : session.currentLevelIndex;
    const nextQuestionIndex = lastQ ? 0 : session.currentQuestionIndex + 1;
    setSession({ ...session, currentLevelIndex: nextLevelIndex, currentQuestionIndex: nextQuestionIndex });
    setSelectedAnswer("");
    setConfidence(3);
    setLastFeedback(null);
    setQuestionStart(Date.now());
  }

  function handleFinishSession() {
    if (!pack || !session) return;
    const finished = { ...session, completed: true };
    setSession(finished);
    setProofArtifact(createGameForgeProofArtifact({ pack, session: finished }));
  }

  function handleResolveMistake(index: number) {
    if (!session) return;
    const next = session.mistakes.slice();
    next[index] = { ...next[index], resolved: true };
    setSession({ ...session, mistakes: next, xp: session.xp + 5 });
  }

  function handleRestart() {
    setSession(null);
    setLastFeedback(null);
    setProofArtifact(null);
    setSelectedAnswer("");
    setConfidence(3);
  }

  const accuracy = session ? calculateAccuracy(session.answers) : 0;
  const liveRank = session
    ? calculateMasteryRank({
        accuracy,
        xp: session.xp,
        mistakesResolved: session.mistakes.filter((m) => m.resolved).length,
        bossCompleted: !!session.completed,
      })
    : null;

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">GameForge</div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">
            Turn any topic into playable proof.
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Paste material. Pick a mode. Forge a pack. Play it. Earn proof.
          </p>
        </div>
        <Sparkles className="h-5 w-5 text-primary shrink-0 mt-2" />
      </header>

      {/* Input + selectors */}
      <Card className="p-4 md:p-6 space-y-4">
        <div>
          <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Source material</label>
          <Textarea
            value={sourceMaterial}
            onChange={(e) => setSourceMaterial(e.target.value)}
            rows={5}
            className="mt-2"
            placeholder="Paste lecture notes, textbook excerpts, product specs, vocab lists, tactical notes…"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Mode</label>
            <Select value={mode} onValueChange={(v) => setMode(v as GameForgeMode)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Intensity</label>
            <Select value={intensity} onValueChange={(v) => setIntensity(v as GameForgeIntensity)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INTENSITIES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Style</label>
            <Select value={style} onValueChange={(v) => setStyle(v as GameForgeStyle)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STYLES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button onClick={handleGeneratePack} className="gap-2">
            <Zap className="h-4 w-4" /> Forge pack
          </Button>
          {pack && !session && (
            <Button variant="outline" onClick={handleStartSession} className="gap-2">
              <Target className="h-4 w-4" /> Start session
            </Button>
          )}
        </div>
        <div className="border-t border-border pt-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Demo packs</div>
          <div className="flex flex-wrap gap-2">
            {DEMO_SEEDS.map((d, i) => (
              <Button key={d.label} variant="outline" size="sm" onClick={() => handleLoadDemo(i)}>
                {d.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Pack preview */}
      {pack && !session && (
        <Card className="p-4 md:p-6 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-mono uppercase text-muted-foreground">Pack</div>
              <h2 className="text-lg font-semibold mt-1">{pack.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{pack.topicDiagnosis}</p>
            </div>
            <Brain className="h-5 w-5 text-primary shrink-0" />
          </div>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            {pack.learningObjectives.map((o) => <li key={o}>{o}</li>)}
          </ul>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2">
            {pack.levels.map((l, i) => (
              <div key={l.id} className="rounded-md border border-border p-3 bg-muted/30">
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Lv {i + 1}</div>
                <div className="text-sm font-medium mt-1">{l.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{l.questions.length} questions · pass ≥ {l.requiredAccuracyToPass}%</div>
              </div>
            ))}
          </div>
          <Button onClick={handleStartSession} className="gap-2 mt-2">
            <Target className="h-4 w-4" /> Start session
          </Button>
        </Card>
      )}

      {/* Play */}
      {pack && session && !session.completed && currentQuestion && (
        <Card className="p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] font-mono uppercase text-muted-foreground">
              Lv {session.currentLevelIndex + 1} · Q {session.currentQuestionIndex + 1} / {pack.levels[session.currentLevelIndex].questions.length}
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="inline-flex items-center gap-1"><Zap className="h-3 w-3 text-primary" /> {session.xp} XP</span>
              <span className="inline-flex items-center gap-1"><Shield className="h-3 w-3" /> {session.focusPoints} focus</span>
              <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3 text-orange-500" /> {session.correctStreak}</span>
            </div>
          </div>
          <Progress value={totalQuestions ? Math.round((totalAnswered / totalQuestions) * 100) : 0} className="h-1.5" />

          <div>
            <div className="text-[10px] font-mono uppercase text-muted-foreground">{currentQuestion.difficulty} · {currentQuestion.skillTested}</div>
            <h3 className="text-base md:text-lg font-medium mt-1">{currentQuestion.prompt}</h3>
          </div>

          {currentQuestion.options ? (
            <div className="grid grid-cols-1 gap-2">
              {currentQuestion.options.map((opt) => (
                <button
                  key={opt}
                  disabled={!!lastFeedback}
                  onClick={() => setSelectedAnswer(opt)}
                  className={cn(
                    "text-left rounded-md border px-3 py-2 text-sm transition-colors",
                    selectedAnswer === opt
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-muted/50",
                    lastFeedback && opt === currentQuestion.correctAnswer && "border-emerald-500/60 bg-emerald-500/10",
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <Input
              value={selectedAnswer}
              onChange={(e) => setSelectedAnswer(e.target.value)}
              placeholder="Type your answer…"
              disabled={!!lastFeedback}
            />
          )}

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase text-muted-foreground">Confidence</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setConfidence(n as 1 | 2 | 3 | 4 | 5)}
                disabled={!!lastFeedback}
                className={cn(
                  "h-7 w-7 rounded-sm border text-xs font-mono",
                  confidence === n ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/50",
                )}
              >
                {n}
              </button>
            ))}
          </div>

          {lastFeedback ? (
            <div className="space-y-3">
              <div
                className={cn(
                  "rounded-md border p-3 text-sm",
                  lastFeedback.kind === "correct"
                    ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                    : "border-destructive/40 bg-destructive/5 text-destructive",
                )}
              >
                <div className="flex items-center gap-2 font-medium">
                  {lastFeedback.kind === "correct" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {lastFeedback.kind === "correct" ? "Correct" : "Incorrect"}
                </div>
                <p className="mt-1">{lastFeedback.msg}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Answer: <span className="font-mono">{currentQuestion.correctAnswer}</span> — {currentQuestion.explanation}
                </p>
              </div>
              <Button onClick={handleNextQuestion}>Next</Button>
            </div>
          ) : (
            <Button onClick={handleSubmitAnswer} disabled={!selectedAnswer}>Submit answer</Button>
          )}
        </Card>
      )}

      {/* Mistake Clinic */}
      {session && session.mistakes.length > 0 && (
        <Card className="p-4 md:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase text-muted-foreground">Mistake Clinic</div>
              <h3 className="text-base font-semibold mt-1">{session.mistakes.filter((m) => !m.resolved).length} open · {session.mistakes.filter((m) => m.resolved).length} resolved</h3>
            </div>
          </div>
          <div className="space-y-2">
            {session.mistakes.map((m, i) => (
              <div key={`${m.questionId}-${i}`} className="rounded-md border border-border p-3 bg-muted/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-[10px] font-mono uppercase text-muted-foreground">{m.mistakeType.replace(/_/g, " ")}</div>
                    <div className="text-sm mt-1">{m.prompt}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      You: <span className="font-mono">{m.userAnswer || "—"}</span> · Correct: <span className="font-mono">{m.correctAnswer}</span>
                    </div>
                    <div className="text-xs mt-2">{m.recoveryDrill}</div>
                  </div>
                  {!m.resolved ? (
                    <Button size="sm" variant="outline" onClick={() => handleResolveMistake(i)}>Mark resolved</Button>
                  ) : (
                    <span className="text-[10px] font-mono uppercase text-emerald-600">Resolved</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* End screen */}
      {session?.completed && (
        <Card className="p-4 md:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase text-muted-foreground">Session complete</div>
              <h3 className="text-lg font-semibold mt-1">{pack?.title}</h3>
            </div>
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Stat label="XP" value={String(session.xp)} />
            <Stat label="Accuracy" value={`${accuracy}%`} />
            <Stat label="Focus left" value={String(session.focusPoints)} />
            <Stat label="Rank" value={liveRank ?? "—"} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={handleRestart} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Restart
            </Button>
          </div>
        </Card>
      )}

      {/* Proof artifact */}
      {proofArtifact && (
        <Card className="p-4 md:p-6 space-y-3 border-primary/40">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary">Proof Artifact</div>
              <h3 className="text-base font-semibold mt-1">{proofArtifact.topic}</h3>
            </div>
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <Row k="Domain" v={proofArtifact.domain} />
            <Row k="Mode" v={proofArtifact.gameMode} />
            <Row k="Evidence" v={proofArtifact.evidenceCompleted} />
            <Row k="XP earned" v={String(proofArtifact.xpEarned)} />
            <Row k="Accuracy" v={`${proofArtifact.accuracy}%`} />
            <Row k="Mastery rank" v={proofArtifact.masteryRank} />
            <Row k="Weakness" v={proofArtifact.weaknessFound} />
            <Row k="Skill improved" v={proofArtifact.skillImproved} />
            <Row k="Next upgrade" v={proofArtifact.nextUpgrade} />
          </dl>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3 bg-muted/20">
      <div className="text-[10px] font-mono uppercase text-muted-foreground">{label}</div>
      <div className="text-base font-semibold mt-1">{value}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[10px] font-mono uppercase text-muted-foreground">{k}</dt>
      <dd className="text-sm">{v}</dd>
    </div>
  );
}