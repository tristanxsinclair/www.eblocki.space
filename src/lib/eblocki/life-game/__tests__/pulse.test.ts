import { describe, expect, it } from "vitest";
import {
  createLifeGameDemoSnapshot,
  deriveLifeGameProtocol,
  deriveLifeGamePulse,
} from "@/lib/eblocki/life-game";

const NOW = "2026-07-25T08:00:00.000Z";

describe("deriveLifeGamePulse", () => {
  it("turns committed level, streak, verdict, and domain records into display-only signals", () => {
    const snapshot = createLifeGameDemoSnapshot(NOW);
    const pulse = deriveLifeGamePulse(snapshot, NOW);

    expect(pulse.state).toBe("level_signal");
    expect(pulse.nextLevelXp).toBe(212);
    expect(pulse.filedToday).toBe(1);
    expect(pulse.strongestStat).toEqual({ key: "mind", label: "Mind", level: 14 });
    expect(pulse.signals.map((signal) => signal.id)).toEqual([
      "compound_operator",
      "seven_day_streak",
      "court_verified",
      "cross_domain",
    ]);
    expect(pulse.protocol.state).toBe("complete");
  });

  it("does not manufacture a reward while secondary records are pending", () => {
    const snapshot = createLifeGameDemoSnapshot(NOW);
    snapshot.runLog = [
      {
        ...snapshot.runLog[2],
        id: "pending-action",
        createdAt: NOW,
        xp: null,
        courtVerdict: null,
        syncState: "pending",
      },
    ];

    const pulse = deriveLifeGamePulse(snapshot, NOW);

    expect(pulse.state).toBe("sync_pending");
    expect(pulse.headline).toBe("The engine is resolving the result.");
    expect(pulse.detail).toContain("XP and verdict remain pending");
    expect(pulse.pendingSyncCount).toBe(1);
    expect(pulse.protocol.state).toBe("artifact_filed");
    expect(pulse.protocol.stages.map((stage) => stage.state)).toEqual([
      "complete",
      "complete",
      "current",
      "locked",
    ]);
    expect(pulse.protocol.settlementId).toBeNull();
  });

  it("falls back to the active quest when no committed run event exists", () => {
    const snapshot = createLifeGameDemoSnapshot(NOW);
    snapshot.runLog = [];
    snapshot.momentum = null;

    const pulse = deriveLifeGamePulse(snapshot, NOW);

    expect(pulse.state).toBe("quest_ready");
    expect(pulse.headline).toBe(snapshot.activeQuest?.title);
    expect(pulse.filedToday).toBe(0);
    expect(pulse.protocol.state).toBe("quest_armed");
    expect(pulse.protocol.nextAction).toBe("view_quest");
  });
});

describe("deriveLifeGameProtocol", () => {
  it("marks each gate complete only when today's committed records support it", () => {
    const snapshot = createLifeGameDemoSnapshot(NOW);
    const protocol = deriveLifeGameProtocol(snapshot, NOW);

    expect(protocol.state).toBe("complete");
    expect(protocol.headline).toBe("One evidence cycle is complete.");
    expect(protocol.settlementId).toBe("demo-log-action-1");
    expect(protocol.stages.map((stage) => stage.state)).toEqual([
      "complete",
      "complete",
      "complete",
      "complete",
    ]);
    expect(protocol.stages[2].detail).toContain("elite");
    expect(protocol.stages[3].detail).toContain("+96");
  });

  it("keeps character growth current when a verdict exists without XP", () => {
    const snapshot = createLifeGameDemoSnapshot(NOW);
    snapshot.runLog = [
      {
        ...snapshot.runLog[1],
        createdAt: NOW,
        xp: null,
        syncState: "pending",
      },
    ];

    const protocol = deriveLifeGameProtocol(snapshot, NOW);

    expect(protocol.state).toBe("verdict_committed");
    expect(protocol.nextAction).toBe("refresh_truth");
    expect(protocol.settlementId).toBeNull();
    expect(protocol.stages.map((stage) => stage.state)).toEqual([
      "complete",
      "complete",
      "complete",
      "current",
    ]);
    expect(protocol.stages[3].detail).toContain("Waiting");
  });

  it("does not use yesterday's result as today's evidence cycle", () => {
    const snapshot = createLifeGameDemoSnapshot(NOW);
    snapshot.momentum = { ...snapshot.momentum!, proofsToday: 0 };
    snapshot.runLog = snapshot.runLog.map((entry) => ({
      ...entry,
      createdAt: "2026-07-23T08:00:00.000Z",
    }));

    const protocol = deriveLifeGameProtocol(snapshot, NOW);

    expect(protocol.state).toBe("quest_armed");
    expect(protocol.settlementId).toBeNull();
    expect(protocol.stages.map((stage) => stage.state)).toEqual([
      "complete",
      "current",
      "locked",
      "locked",
    ]);
  });

  it("starts with one exact Game Master move when neither quest nor artifact exists", () => {
    const snapshot = createLifeGameDemoSnapshot(NOW);
    snapshot.activeQuest = null;
    snapshot.runLog = [];
    snapshot.momentum = null;

    const protocol = deriveLifeGameProtocol(snapshot, NOW);

    expect(protocol.state).toBe("needs_quest");
    expect(protocol.nextAction).toBe("ask_gm");
    expect(protocol.stages[0].state).toBe("current");
    expect(protocol.stages.slice(1).every((stage) => stage.state === "locked")).toBe(true);
  });
});
