import { describe, expect, it } from "vitest";
import {
  buildLifeGameSettlementHref,
  createLifeGameDemoSnapshot,
  isSafeLifeGameRecordId,
  projectEvidenceSettlement,
} from "@/lib/eblocki/life-game";

describe("evidence settlement projection", () => {
  it("uses a trusted record ID in the HUD return URL", () => {
    const id = "33333333-3333-4333-8333-333333333333";
    expect(isSafeLifeGameRecordId(id)).toBe(true);
    expect(buildLifeGameSettlementHref(id)).toBe(`/dashboard?result=${id}`);
    expect(buildLifeGameSettlementHref("invented-result")).toBe("/dashboard");
  });

  it("reveals XP and verdict only when both committed records exist", () => {
    const snapshot = createLifeGameDemoSnapshot("2026-07-25T08:00:00.000Z");
    const settlement = projectEvidenceSettlement(snapshot, "demo-log-action-1");

    expect(settlement).toMatchObject({
      state: "settled",
      title: "Submitted a timed issue analysis",
      stat: "mind",
      evidenceStrength: "elite",
      courtVerdict: "elite",
      xp: 96,
    });
  });

  it("keeps a filed artifact pending when XP is absent", () => {
    const snapshot = createLifeGameDemoSnapshot("2026-07-25T08:00:00.000Z");
    const settlement = projectEvidenceSettlement(snapshot, "demo-log-action-3");

    expect(settlement.state).toBe("pending");
    expect(settlement.title).toBe("Filed a product build result");
    expect(settlement.xp).toBeNull();
  });

  it("does not manufacture result content for an unknown ID", () => {
    const snapshot = createLifeGameDemoSnapshot("2026-07-25T08:00:00.000Z");
    const settlement = projectEvidenceSettlement(
      snapshot,
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );

    expect(settlement.state).toBe("locating");
    expect(settlement.title).toBeNull();
    expect(settlement.courtVerdict).toBeNull();
    expect(settlement.xp).toBeNull();
  });
});
