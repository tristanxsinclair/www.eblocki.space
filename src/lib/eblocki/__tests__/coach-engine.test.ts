import { describe, expect, it } from "vitest";
import {
  buildCoachResponse,
  detectCoachDomain,
  detectCoachIntent,
} from "../coach-engine";

describe("coach engine", () => {
  it("detects intent", () => {
    expect(detectCoachIntent("I keep avoiding this task and need to start")).toBe("execution");
    expect(detectCoachIntent("Can you review my proof artifact?")).toBe("proof_review");
  });

  it("detects domain", () => {
    expect(detectCoachDomain("I need an IRAC answer for statutory interpretation")).toBe("law");
    expect(detectCoachDomain("The customer objected to the premium warranty close")).toBe("sales");
  });

  it("selects response mode", () => {
    const result = buildCoachResponse({ input: "I keep reorganising notes instead of writing the answer" });
    expect(result.responseMode).toBe("execution_lock");
  });

  it("generates internal prompt summary", () => {
    const result = buildCoachResponse({ input: "I need help with a psychology evidence evaluation paragraph" });
    expect(result.internalPromptSummary).toContain("psychology");
    expect(result.aiPayload.forbidden.join(" ")).toContain("generic motivation");
  });

  it("returns diagnosis", () => {
    const result = buildCoachResponse({ input: "I am confused by cognitive dissonance application" });
    expect(result.diagnosis).toBeTruthy();
    expect(result.detectedState).toBe("confused");
  });

  it("returns proof action", () => {
    const result = buildCoachResponse({ input: "I need to write a law answer" });
    expect(result.proofAction).toMatch(/IRAC/i);
    expect(result.proofActionType).toBe("written_answer");
  });

  it("flags overplanning and avoidance", () => {
    const result = buildCoachResponse({ input: "I need a better plan and template before I start" });
    expect(result.warning).toMatch(/planning/i);
    expect(result.detectedState).toBe("overplanning");
  });

  it("suggests GameForge when learning practice is useful", () => {
    const result = buildCoachResponse({ input: "I have exam notes and keep missing the same statutory interpretation concept" });
    expect(result.suggestedGameForgePack).toBeTruthy();
    expect(result.suggestedGameForgePack?.mode).toBe("law");
  });

  it("handles empty input safely", () => {
    expect(() => buildCoachResponse({ input: "" })).not.toThrow();
    expect(buildCoachResponse({ input: "" }).proofAction).toBeTruthy();
  });

  it("does not fake an AI call in deterministic fallback", () => {
    const result = buildCoachResponse({ input: "Give me the next proof action for Spanish vocab" });
    expect(result.aiPayload).toBeTruthy();
    expect(result.answer).not.toMatch(/I called|AI says|model returned/i);
  });
});
