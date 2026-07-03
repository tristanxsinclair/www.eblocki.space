import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TemporalCommandCard } from "../TemporalCommandCard";
import { computeTemporal } from "@/lib/eblocki/temporal-engine";

function makeResult() {
  const now = new Date("2026-06-24T12:00:00Z");
  const days = (n: number) =>
    new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
  return computeTemporal({
    now,
    activeDomains: ["fitness"],
    state: "locked_in",
    artifacts: [
      { id: "1", domain: "fitness", quality_score: 80, evidence_strength: "strong", transfer_flag: true, pressure_flag: false, proof_tier: 3, created_at: days(1) },
      { id: "2", domain: "fitness", quality_score: 70, evidence_strength: "moderate", transfer_flag: false, pressure_flag: false, proof_tier: 2, created_at: days(2) },
      { id: "3", domain: "fitness", quality_score: 60, evidence_strength: "moderate", transfer_flag: false, pressure_flag: false, proof_tier: 2, created_at: days(5) },
    ],
    verdicts: [{ verdict: "accepted_strong", created_at: days(1) }],
    ledger: [{ kind: "proof", domain: "fitness", created_at: days(1) }],
  });
}

function renderCard(result: ReturnType<typeof makeResult> | null) {
  return render(
    <MemoryRouter>
      <TemporalCommandCard result={result} />
    </MemoryRouter>,
  );
}

describe("TemporalCommandCard", () => {
  it("renders forecast surface from a TemporalResult", () => {
    renderCard(makeResult());
    expect(screen.getByText(/Future Forecast/i)).toBeInTheDocument();
  });

  it("shows both evidence disclosures", () => {
    renderCard(makeResult());
    expect(screen.getByText(/Why this forecast exists/i)).toBeInTheDocument();
    expect(screen.getByText(/What would prove it wrong/i)).toBeInTheDocument();
  });

  it("links CTA to /proof?source=temporal", () => {
    renderCard(makeResult());
    const cta = screen
      .getAllByRole("link")
      .find((a) => a.getAttribute("href")?.includes("source=temporal"));
    expect(cta).toBeTruthy();
    expect(cta!.getAttribute("href")).toMatch(/^\/proof\?/);
    expect(cta!.getAttribute("href")).toContain("source=temporal");
  });

  it("renders nothing for a null result (safe empty state)", () => {
    const { container } = renderCard(null);
    expect(container.firstChild).toBeNull();
  });
});
