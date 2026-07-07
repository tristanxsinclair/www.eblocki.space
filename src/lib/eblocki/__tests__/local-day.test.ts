import { describe, expect, it } from "vitest";
import { isSameLocalDay, localDayKey } from "../local-day";

describe("local day helpers", () => {
  it("formats an ISO timestamp in the requested timezone", () => {
    expect(localDayKey("2026-07-04T16:30:00.000Z", "Australia/Perth")).toBe("2026-07-05");
  });

  it("does not treat UTC-same-day timestamps as same local day in Perth", () => {
    const perthJustAfterMidnight = "2026-07-04T16:30:00.000Z"; // 2026-07-05 00:30 AWST
    const perthYesterdayMorning = "2026-07-04T01:00:00.000Z"; // 2026-07-04 09:00 AWST

    expect(isSameLocalDay(perthYesterdayMorning, perthJustAfterMidnight, "Australia/Perth")).toBe(false);
  });

  it("treats UTC-next-day timestamps as same local day in Perth when local dates match", () => {
    const perthJustAfterMidnight = "2026-07-04T16:30:00.000Z"; // 2026-07-05 00:30 AWST
    const perthSameLocalDay = "2026-07-04T17:00:00.000Z"; // 2026-07-05 01:00 AWST

    expect(isSameLocalDay(perthSameLocalDay, perthJustAfterMidnight, "Australia/Perth")).toBe(true);
  });

  it("returns an empty key for invalid dates", () => {
    expect(localDayKey("not-a-date", "Australia/Perth")).toBe("");
  });
});
