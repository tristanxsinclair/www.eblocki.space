import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProofClosureCard } from "@/components/eblocki/ProofClosureCard";
import {
  buildDashboardViewModel,
  type DashboardProofRow,
} from "@/lib/eblocki/dashboard-view-model";
import { verdictIdentityImpact } from "@/lib/eblocki/verdict-identity-impact";
import { shouldOpenWelcome } from "@/lib/eblocki/first-proof";

function renderProtocol(latestEvidenceStrength: string | null | undefined) {
  const view = buildDashboardViewModel({});
  const todayArtifact = latestEvidenceStrength
    ? ({ evidence_strength: latestEvidenceStrength, quality_score: 8 } as DashboardProofRow)
    : null;

  return render(
    <MemoryRouter>
      <ProofClosureCard
        view={view}
        proofToday={Boolean(todayArtifact)}
        hasAnyProof={Boolean(todayArtifact)}
        todayArtifact={todayArtifact}
        todayISO="2026-08-03"
      />
    </MemoryRouter>,
  );
}

describe("Dashboard daily evidence protocol", () => {
  it("shows the complete command to proof to verdict sequence", () => {
    renderProtocol(null);

    expect(screen.getByRole("list", { name: "Daily evidence protocol" })).toBeInTheDocument();
    expect(screen.getByText("Command")).toBeInTheDocument();
    expect(screen.getByText("Proof", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Verdict", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Submit proof/i })).toHaveAttribute("href", "/proof?first=1");
  });

  it("renders the correct identity consequence for strong proof", () => {
    renderProtocol("strong");

    const hint = screen.getByTestId("dashboard-verdict-identity-impact");
    expect(hint).toBeInTheDocument();
    expect(hint).toHaveTextContent(verdictIdentityImpact("strong").headline);
  });

  it("renders the elite identity consequence", () => {
    renderProtocol("elite");

    const hint = screen.getByTestId("dashboard-verdict-identity-impact");
    expect(hint).toBeInTheDocument();
    expect(hint).toHaveTextContent(verdictIdentityImpact("elite").headline);
  });

  it("does not invent an identity consequence before proof exists", () => {
    renderProtocol(null);

    expect(screen.queryByTestId("dashboard-verdict-identity-impact")).not.toBeInTheDocument();
  });
});

describe("Dashboard welcome compatibility", () => {
  it("keeps legacy users who completed onboarding on their dashboard", () => {
    expect(shouldOpenWelcome({ seen_welcome: false, completed_onboarding: true })).toBe(false);
  });

  it("opens welcome only for users with no completed introduction", () => {
    expect(shouldOpenWelcome({ seen_welcome: false, completed_onboarding: false })).toBe(true);
    expect(shouldOpenWelcome(null)).toBe(true);
  });
});
