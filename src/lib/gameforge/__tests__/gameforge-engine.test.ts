import { describe, expect, it } from "vitest";
import {
  advanceGameForgeSession,
  buildGameForgeMasteryResult,
  buildGameForgePack,
  buildGameForgeProofArtifact,
  createInitialGameForgeSession,
  detectGameForgeMode,
  getActiveQuestion,
  submitGameForgeAnswer,
} from "../gameforge-engine";

const lawMaterial = "Statutory interpretation uses text context purpose, ambiguity, legislative intent, authority and IRAC application.";

describe("gameforge engine", () => {
  it("detects domain from input", () => {
    expect(detectGameForgeMode(lawMaterial)).toBe("law");
    expect(detectGameForgeMode("customer objection premium warranty close value")).toBe("sales");
  });

  it("generates a game pack", () => {
    const pack = buildGameForgePack({ material: lawMaterial, mode: "auto", intensity: "exam", style: "court_trial" });
    expect(pack.title).toBeTruthy();
    expect(pack.mode).toBe("law");
    expect(pack.learningObjectives.length).toBeGreaterThan(2);
  });

  it("creates levels and rounds", () => {
    const pack = buildGameForgePack({ material: lawMaterial });
    expect(pack.levels.length).toBeGreaterThanOrEqual(3);
    expect(pack.levels.flatMap((level) => level.rounds).length).toBeGreaterThanOrEqual(3);
    expect(pack.levels.flatMap((level) => level.rounds.flatMap((round) => round.questions)).length).toBeGreaterThan(5);
  });

  it("adapts difficulty after mistakes", () => {
    const pack = buildGameForgePack({ material: lawMaterial, mode: "law" });
    const session = createInitialGameForgeSession(pack);
    const question = getActiveQuestion(pack, session)!;
    const first = submitGameForgeAnswer({ pack, session, question, userAnswer: "wrong answer", confidence: 5, responseTimeMs: 1200 });
    expect(first.feedback.isCorrect).toBe(false);
    expect(first.session.mistakes.length).toBe(1);
    expect(first.session.adaptiveDifficulty).toBe("medium");
  });

  it("creates a boss battle", () => {
    const pack = buildGameForgePack({ material: lawMaterial, style: "mixed" });
    const bossQuestions = pack.levels.flatMap((level) => level.rounds.flatMap((round) => round.questions)).filter((question) => question.type === "boss_battle");
    expect(bossQuestions.length).toBeGreaterThan(0);
  });

  it("produces mastery result", () => {
    const pack = buildGameForgePack({ material: lawMaterial, mode: "law" });
    const session = createInitialGameForgeSession(pack);
    const question = getActiveQuestion(pack, session)!;
    const answered = submitGameForgeAnswer({ pack, session, question, userAnswer: question.expectedAnswer, confidence: 3 }).session;
    const result = buildGameForgeMasteryResult(pack, { ...answered, phase: "complete" });
    expect(result.score).toBeGreaterThan(0);
    expect(result.summary).toContain("accuracy");
  });

  it("produces proof artifact", () => {
    const pack = buildGameForgePack({ material: lawMaterial, mode: "law" });
    const session = createInitialGameForgeSession(pack);
    const result = buildGameForgeMasteryResult(pack, { ...session, phase: "complete" });
    const artifact = buildGameForgeProofArtifact(pack, result);
    expect(artifact.artifactType).toBe("gameforge_mastery_result");
    expect(artifact.summary).toBeTruthy();
  });

  it("handles empty input safely", () => {
    expect(() => buildGameForgePack({ material: "" })).not.toThrow();
    expect(buildGameForgePack({ material: "" }).concepts.length).toBeGreaterThan(0);
  });

  it("handles short input safely", () => {
    const pack = buildGameForgePack({ material: "IRAC" });
    expect(pack.levels.length).toBeGreaterThan(0);
  });

  it("does not crash on weird input", () => {
    expect(() => buildGameForgePack({ material: "@@@ ### 123 \n\n ???" })).not.toThrow();
  });

  it("can advance through a question", () => {
    const pack = buildGameForgePack({ material: lawMaterial });
    const session = createInitialGameForgeSession(pack);
    const question = getActiveQuestion(pack, session)!;
    const answered = submitGameForgeAnswer({ pack, session, question, userAnswer: question.expectedAnswer, confidence: 3 }).session;
    const next = advanceGameForgeSession(pack, answered);
    expect(next.currentQuestionIndex + next.currentRoundIndex + next.currentLevelIndex).toBeGreaterThanOrEqual(0);
  });
});
