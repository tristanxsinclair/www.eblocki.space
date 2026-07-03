import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { TemporalEvidenceIntelligencePanel } from "../TemporalEvidenceIntelligencePanel";
import { buildTemporalForecast } from "@/lib/eblocki/temporal-evidence-intelligence";

const generatedAt = "2026-06-22T06:00:00.000Z";

function noProofForecast() {
  return buildTemporalForecast({
    userId: "user-1",
    horizon: "30d",
    proofs: [],
    generatedAt,
  });
}

function renderPanel() {
  const forecast = noProofForecast();
  const result = render(
    <MemoryRouter>
      <TemporalEvidenceIntelligencePanel forecast={forecast} />
    </MemoryRouter>,
  );
  return { forecast, ...result };
}

describe("TemporalEvidenceIntelligencePanel", () => {
  it("renders an empty forecast without crashing", () => {
    renderPanel();

    expect(screen.getByRole("heading", { name: "Temporal Evidence" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "No proof history yet. Submit one measurable artifact to activate Temporal Evidence.",
      ),
    ).toBeInTheDocument();
  });

  it("renders all four paths", () => {
    renderPanel();

    expect(screen.getByRole("heading", { name: "Current path" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Corrected path" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Decay path" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Escalation path" })).toBeInTheDocument();
  });

  it("renders proof requirements, disconfirming proof, and the safe proof route", () => {
    const { forecast, container } = renderPanel();

    expect(container.textContent).toContain(forecast.proofRequired);
    expect(container.textContent).toContain(forecast.disconfirmingProof[0].claim);
    expect(
      screen.getByRole("link", { name: /Submit proof that changes this path/i }),
    ).toHaveAttribute("href", "/proof");
  });

  it("does not render banned prediction wording", () => {
    const { container } = renderPanel();
    const rendered = container.textContent?.toLowerCase() ?? "";
    const banned = [
      "destiny",
      "guaranteed",
      "eblocki knows your future",
      "you will fail",
      "mental health diagnosis",
      "almost perfectly accurate",
    ];

    for (const phrase of banned) {
      expect(rendered).not.toContain(phrase);
    }
    expect(rendered).toContain("forecast, not fate");
  });
});
