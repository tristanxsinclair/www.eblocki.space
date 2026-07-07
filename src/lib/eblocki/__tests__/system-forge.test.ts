import { describe, expect, it } from "vitest";
import {
  evaluateSystemForgeRep,
  generateSystemForgeDraft,
  isArtifactProducingCommand,
} from "../system-forge";

const baseInput = {
  improvementGoal: "Get better at producing proof under pressure",
  desiredOutcome: "Create a visible artifact every day",
  currentBottleneck: "Overplanning instead of shipping",
  availableMinutesPerDay: 25,
};

describe("System Forge generator", () => {
  it("creates a law system with an artifact-producing first command", () => {
    const draft = generateSystemForgeDraft({
      ...baseInput,
      domain: "law",
      improvementGoal: "Improve IRAC problem answers",
    });

    expect(draft.domain).toBe("law");
    expect(draft.firstCommand).toMatch(/IRAC paragraph/i);
    expect(draft.firstCommand).toMatch(/10-minute/i);
    expect(draft.firstCommand).toMatch(/authority/i);
    expect(isArtifactProducingCommand(draft.firstCommand)).toBe(true);
  });

  it("creates sales proof artifacts and rubric", () => {
    const draft = generateSystemForgeDraft({
      ...baseInput,
      domain: "sales",
      improvementGoal: "Handle objections better",
    });

    expect(draft.proofArtifacts).toEqual(
      expect.arrayContaining(["objection log", "improved explanation"]),
    );
    expect(draft.scoringRubric.length).toBeGreaterThanOrEqual(3);
    expect(draft.scoringRubric.map((item) => item.criterion).join(" ")).toMatch(/Customer signal|Response quality/);
  });

  it("keeps low available minutes realistic", () => {
    const draft = generateSystemForgeDraft({
      ...baseInput,
      domain: "spanish",
      availableMinutesPerDay: 8,
    });

    expect(draft.minimumViableRep).toMatch(/8 minutes/i);
    expect(draft.firstCommand).toMatch(/rough/i);
    expect(draft.firstCommand).toMatch(/weakness/i);
    expect(isArtifactProducingCommand(draft.firstCommand)).toBe(true);
  });

  it("does not generate vague commands", () => {
    const draft = generateSystemForgeDraft({
      ...baseInput,
      domain: "fitness",
      improvementGoal: "Train consistently",
    });

    expect(draft.firstCommand.toLowerCase()).not.toBe("study law.");
    expect(draft.firstCommand).not.toMatch(/^(study|improve|learn)\s+\w+\.?$/i);
    expect(isArtifactProducingCommand(draft.firstCommand)).toBe(true);
  });

  it("always returns scoring rubric and progression levels", () => {
    const domains = ["law", "sales", "spanish", "football", "founder", "study", "fitness", "unknown"];

    for (const domain of domains) {
      const draft = generateSystemForgeDraft({ ...baseInput, domain });
      expect(draft.scoringRubric.length).toBeGreaterThan(0);
      expect(draft.progressionLevels.length).toBeGreaterThan(0);
      expect(draft.firstCommand).toBe(draft.activeCommand);
    }
  });

  it("falls back safely for unknown domains", () => {
    const draft = generateSystemForgeDraft({
      ...baseInput,
      domain: "poetry and cooking",
      improvementGoal: "Make better finished work",
    });

    expect(draft.domain).toBe("general");
    expect(draft.proofArtifacts).toContain("completed artifact");
    expect(isArtifactProducingCommand(draft.firstCommand)).toBe(true);
  });

  it("keeps the bottleneck out of skill chips", () => {
    const bottleneck = "You already have the workbook and cockpit. The bottleneck is avoiding timed application.";
    const draft = generateSystemForgeDraft({
      ...baseInput,
      domain: "law",
      currentBottleneck: bottleneck,
    });

    expect(draft.bottleneck).toBe(bottleneck);
    expect(draft.skills).toContain("bottleneck diagnosis");
    expect(draft.skills).not.toContain(`${bottleneck} diagnosis`);
    expect(draft.skills.every((skill) => skill.length < 40)).toBe(true);
  });

  it("evaluates submitted reps without identity escalation", () => {
    const draft = generateSystemForgeDraft({
      ...baseInput,
      domain: "general",
    });

    const verdict = evaluateSystemForgeRep({
      system: draft,
      proofContent: "I produced one artifact in 20 minutes, wrote the result, and logged one correction for next time.",
      selfScore: 9,
    });

    expect(verdict.score).toBeGreaterThan(1);
    expect(verdict.verdict).toMatch(/weak|moderate|strong|elite/);
    expect(verdict.weakness).toBeTruthy();
    expect(verdict.nextUpgrade).toBeTruthy();
  });

  it("does not show a default weakness for elite reps", () => {
    const draft = generateSystemForgeDraft({
      ...baseInput,
      domain: "law",
    });

    const verdict = evaluateSystemForgeRep({
      system: draft,
      proofContent: [
        "Issue: whether the statute applies on these facts.",
        "Rule: section 18 requires authority, context, and purpose.",
        "Authority: one case and one statutory provision are applied.",
        "Application: the facts satisfy the provision because the timing, jurisdiction, and conduct match the rule.",
        "Conclusion: the stronger answer is available, but the weakness was insufficient counterargument.",
        "Correction: next time I will add the opposing interpretation and score the answer against the rubric.",
      ].join(" "),
      selfScore: 10,
    });

    expect(verdict.verdict).toBe("elite");
    expect(verdict.weakness).toMatch(/No major weakness|Preserve the standard/i);
  });
});
