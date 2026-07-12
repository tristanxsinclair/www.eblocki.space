import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CommandHero } from "@/pages/Dashboard";
import { buildDashboardViewModel } from "@/lib/eblocki/dashboard-view-model";
import { verdictIdentityImpact } from "@/lib/eblocki/verdict-identity-impact";

function renderCommandHero(latestEvidenceStrength: string | null | undefined) {
  const view = buildDashboardViewModel({});
  return render(
    <MemoryRouter>
      <CommandHero view={view} state={null} latestEvidenceStrength={latestEvidenceStrength} />
    </MemoryRouter>,
  );
}

describe("Dashboard verdict identity-impact hint", () => {
  it("renders data-testid with the correct headline when latest proof is strong", () => {
    renderCommandHero("strong");

    const hint = screen.getByTestId("dashboard-verdict-identity-impact");
    expect(hint).toBeInTheDocument();
    expect(hint).toHaveTextContent(verdictIdentityImpact("strong").headline);
  });

  it("renders the elite headline when latest proof is elite", () => {
    renderCommandHero("elite");

    const hint = screen.getByTestId("dashboard-verdict-identity-impact");
    expect(hint).toBeInTheDocument();
    expect(hint).toHaveTextContent(verdictIdentityImpact("elite").headline);
  });

  it("does not render the hint when evidence strength is invalid", () => {
    renderCommandHero(null);

    expect(
      screen.queryByTestId("dashboard-verdict-identity-impact"),
    ).not.toBeInTheDocument();
  });
});
