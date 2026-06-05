import { describe, expect, it } from "vitest";
import { computeTemporal, type ProofArtifactLike } from "../temporal-engine";
import { buildDashboardViewModel } from "../dashboard-view-model";

const now = new Date("2026-06-05T04:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

function proof(over: Partial<ProofArtifactLike> & { title?: string; temporal_snapshot?: unknown } = {}) {
  return {
    id: Math.random().toString(36).slice(2),
    domain: "law",
    title: "IRAC answer",
    quality_score: 7,
    evidence_strength: "strong",
    created_at: daysAgo(1),
    ...over,
  };
}

describe("dashboard view model", () => {
  it("keeps new users safe", () => {
    const view = buildDashboardViewModel({});
    expect(view.dashboardStatus).toBe("new_user");
    expect(view.emptyStateMessage).toMatch(/first proof/i);
  });

  it("handles legacy proof rows", () => {
    const view = buildDashboardViewModel({ allArtifacts: [proof({ quality_score: null, evidence_strength: null })] });
    expect(view.evidenceSummary.weekArtifacts).toBe(1);
    expect(view.commandSummary.title).toBeTruthy();
  });

  it("handles missing temporal systems", () => {
    const view = buildDashboardViewModel({ allArtifacts: [proof()], temporalResult: null });
    expect(view.futureSummary.confidenceLevel).toBe("low");
    expect(view.sectionsEnabled.future).toBe(false);
  });

  it("enables evidence section when proof exists", () => {
    const withProof = buildDashboardViewModel({ allArtifacts: [proof()], recentProofs: [proof()] });
    const withoutProof = buildDashboardViewModel({});
    expect(withProof.sectionsEnabled.evidence).toBe(true);
    expect(withoutProof.sectionsEnabled.evidence).toBe(false);
  });

  it("always returns a command summary", () => {
    const temporal = computeTemporal({ now, artifacts: [proof()] });
    const view = buildDashboardViewModel({ temporalResult: temporal, allArtifacts: [proof()] });
    expect(view.commandSummary.title).toBeTruthy();
    expect(view.commandSummary.nextBestAction).toBeTruthy();
    expect(view.commandSummary.proofRequired).toBeTruthy();
  });
});
