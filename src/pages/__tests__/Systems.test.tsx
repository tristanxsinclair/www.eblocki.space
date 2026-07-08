import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Systems from "../Systems";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "t@e.com" },
    session: null,
    loading: false,
    signOut: vi.fn(),
  }),
}));
vi.mock("@/hooks/usePushRegistration", () => ({ usePushRegistration: () => undefined }));
vi.mock("@/components/eblocki/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

vi.mock("@/lib/eblocki/system-forge-store", () => ({
  fetchActiveSystem: vi.fn().mockResolvedValue(null),
  listRecentReps: vi.fn().mockResolvedValue([]),
  createSystem: vi.fn(async (_userId: string, draft) => ({
    id: "sys1",
    user_id: "u1",
    name: draft.name,
    domain: draft.domain,
    goal: draft.goal,
    outcome: draft.outcome,
    bottleneck: draft.bottleneck,
    available_minutes_per_day: draft.availableMinutesPerDay,
    skills: draft.skills,
    daily_loop: draft.dailyLoop,
    weekly_structure: draft.weeklyStructure,
    minimum_viable_rep: draft.minimumViableRep,
    proof_artifacts: draft.proofArtifacts,
    scoring_rubric: draft.scoringRubric,
    progression_levels: draft.progressionLevels,
    review_cycle: draft.reviewCycle,
    first_command: draft.firstCommand,
    active_command: draft.activeCommand,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })),
  submitRep: vi.fn(),
}));

describe("Systems page", () => {
  it("renders hero, forges a system, and exposes Start first rep", async () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <Systems />
        </MemoryRouter>
      </HelmetProvider>,
    );

    expect(
      await screen.findByText(/Build a proof-based training system/i),
    ).toBeInTheDocument();

    const forgeButton = await screen.findByRole(
      "button",
      { name: /Forge my system/i },
      { timeout: 3000 },
    );
    fireEvent.click(forgeButton);
    fireEvent.change(screen.getByLabelText(/Domain/i), { target: { value: "law" } });
    fireEvent.change(screen.getByLabelText(/Improvement goal/i), { target: { value: "IRAC answers" } });
    fireEvent.click(screen.getAllByRole("button", { name: /Forge my system/i }).pop()!);

    await waitFor(
      () =>
        expect(screen.getByRole("button", { name: /Start first rep/i })).toBeInTheDocument(),
      { timeout: 3000 },
    );
  });
});
