import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LifeGameHud } from "./LifeGameHud";
import { createLifeGameDemoSnapshot } from "@/lib/eblocki/life-game";

function renderHud(
  props: Partial<React.ComponentProps<typeof LifeGameHud>> = {},
) {
  const snapshot = createLifeGameDemoSnapshot("2026-07-25T08:00:00.000Z");
  return {
    snapshot,
    ...render(
      <MemoryRouter>
        <LifeGameHud snapshot={snapshot} demo {...props} />
      </MemoryRouter>,
    ),
  };
}

describe("LifeGameHud", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-25T08:00:00.000Z"));
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a truthful run pulse, command deck, and evidence-derived signals", () => {
    renderHud();

    expect(screen.getByRole("navigation", { name: "Life-game command deck" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Compound Operator" })).toBeInTheDocument();
    expect(screen.getByText("A level signal is committed.")).toBeInTheDocument();
    expect(screen.getByText("7-Day Chain")).toBeInTheDocument();
    expect(screen.getByText("Court Verified")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Today run protocol" })).toBeInTheDocument();
    expect(screen.getByText("One evidence cycle is complete.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review result" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Quest resistance 4 out of 5" })).toBeInTheDocument();
  });

  it("uses valid single interactive controls instead of nested links and buttons", () => {
    const { container } = renderHud();

    expect(container.querySelectorAll("a button, button a")).toHaveLength(0);
  });

  it("offers a persistent focus mode without changing evidence data", () => {
    renderHud();

    const focus = screen.getByRole("button", { name: "Focus" });
    expect(focus).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(focus);

    expect(screen.getByRole("button", { name: "Overview" })).toHaveAttribute("aria-pressed", "true");
    expect(sessionStorage.getItem("eblocki-demo-focus-mode")).toBe("1");
    expect(screen.getByRole("heading", { name: "Compound Operator" })).toBeInTheDocument();
    expect(screen.getByText("Court Verified")).toBeInTheDocument();
  });

  it("shows the personalised Quest Director and filters the Run Log without changing truth", () => {
    renderHud();

    expect(screen.getByRole("heading", { name: "Quest Director" })).toBeInTheDocument();
    expect(screen.getByText("Read of your record")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /Standard/ })[0]);
    expect(screen.getAllByText(/Self-deception risk:/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "pending" }));
    const runLog = screen.getByRole("heading", { name: "Run Log" }).closest("section");
    expect(runLog).not.toBeNull();
    expect(within(runLog!).getByText("Filed a product build result")).toBeInTheDocument();
    expect(within(runLog!).queryByText("Submitted a timed issue analysis")).not.toBeInTheDocument();
  });

  it("keeps honest empty states when no action or quest exists", () => {
    const snapshot = createLifeGameDemoSnapshot("2026-07-25T08:00:00.000Z");
    snapshot.activeQuest = null;
    snapshot.queuedQuests = [];
    snapshot.runLog = [];

    render(
      <MemoryRouter>
        <LifeGameHud snapshot={snapshot} />
      </MemoryRouter>,
    );

    expect(screen.getByText("No active quest")).toBeInTheDocument();
    expect(
      screen.getByText("No actions filed yet. The log starts when a real artifact exists."),
    ).toBeInTheDocument();
    expect(screen.getByText("The run starts with one filed action.")).toBeInTheDocument();
  });

  it("reveals only committed verdict and XP data for the selected artifact", () => {
    renderHud({ settlementId: "demo-log-action-1" });

    const settlement = screen.getByRole("region", { name: "Evidence settlement" });
    expect(settlement).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Verdict committed. Character updated." }),
    ).toBeInTheDocument();
    expect(within(settlement).getByText("Submitted a timed issue analysis")).toBeInTheDocument();
    expect(within(settlement).getByText("+96")).toBeInTheDocument();
  });

  it("shows settlement pending without inventing character XP", () => {
    renderHud({ settlementId: "demo-log-action-3" });

    const settlement = screen.getByRole("region", { name: "Evidence settlement" });
    expect(
      screen.getByRole("heading", { name: "Artifact committed. Settlement pending." }),
    ).toBeInTheDocument();
    expect(within(settlement).getByText("Filed a product build result")).toBeInTheDocument();
    expect(within(settlement).getAllByText("sync pending").length).toBeGreaterThan(0);
  });
});
