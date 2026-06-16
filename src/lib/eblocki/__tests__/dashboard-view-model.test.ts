import { describe, expect, it } from "vitest";
import { computeTemporal, type ProofArtifactLike } from "../temporal-engine";
import { buildDashboardViewModel } from "../dashboard-view-model";

const now = new Date("2026-06-05T04:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

type TestProofOverrides = Partial<ProofArtifactLike> & {
  title?: string;
  temporal_snapshot?: unknown;
  artifact_type?: string;
  next_upgrade?: string;
  transfer_flag?: boolean;
  pressure_flag?: boolean;
};

function proof(over: TestProofOverrides = {}) {
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
    expect(view.emptyStateMessage).toBe("No proof yet. Submit one measurable artifact to activate the command layer.");
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

  it("surfaces one source-bank command with the selected standard", () => {
    const view = buildDashboardViewModel({
      pending: [
        {
          domain: "law_academic",
          mode: "academic_operating_system",
          title: "Create two source-bank entries",
          required_artifact: "Two completed source-bank entries",
          evidence_standard: "source name / jurisdiction / authority level / key rule / assessment use",
          status: "pending",
        },
      ],
    });

    expect(view.commandLayer.activeRoute).toBe("law_source_bank");
    expect(view.commandLayer.selectedStandard).toBe("Law Source Bank Standard");
    expect(view.commandLayer.proofContract).toContain("One artifact");
    expect(view.commandLayer.proofContract).toContain("Law Source Bank Standard");
    expect(view.commandLayer.requiredEvidence).toContain("authority level");
    expect(view.commandSummary.proofRequired).toContain("One artifact");
  });

  it("shows the latest court signal without inventing identity escalation", () => {
    const row = proof({ quality_score: 8, evidence_strength: "strong", transfer_flag: false, pressure_flag: false });
    const view = buildDashboardViewModel({
      recentProofs: [row],
      allArtifacts: [row],
    });

    expect(view.commandLayer.latestCourtSignal).toContain("8/10");
    expect(view.commandLayer.latestCourtSignal).toContain("identity escalation blocked");
  });
});
