import { describe, it, expect } from "vitest";
import {
  buildTemporalProofUrl,
  parseTemporalProofParams,
  DEFAULT_TEMPORAL_EXPECTED_LEVEL,
  DEFAULT_TEMPORAL_TIMEBOX,
  __TEMPORAL_PROOF_LINK_LIMITS,
} from "../temporal-proof-link";
import { isFirstProofMode } from "../first-proof";

describe("buildTemporalProofUrl", () => {
  it("always carries source=temporal and points at /proof", () => {
    const url = buildTemporalProofUrl();
    expect(url.startsWith("/proof?")).toBe(true);
    const sp = new URLSearchParams(url.split("?")[1]);
    expect(sp.get("source")).toBe("temporal");
  });

  it("encodes supported parameters using URLSearchParams", () => {
    const url = buildTemporalProofUrl({
      domain: "law",
      proof: "One IRAC paragraph on Mabo with two pinpoint sources",
      level: "accepted_strong",
      reason: "shallow proof loop in law domain & weak transfer",
      timebox: "24h",
    });
    const sp = new URLSearchParams(url.split("?")[1]);
    expect(sp.get("domain")).toBe("law");
    expect(sp.get("proof")).toMatch(/IRAC/);
    expect(sp.get("level")).toBe("accepted_strong");
    expect(sp.get("reason")).toMatch(/shallow proof loop/);
    expect(sp.get("timebox")).toBe("24h");
    // & and spaces must be properly encoded (not raw)
    expect(url).not.toMatch(/reason=shallow proof loop/);
  });

  it("omits empty / malformed fields rather than serialising junk", () => {
    const url = buildTemporalProofUrl({ domain: "   ", proof: "", reason: null });
    const sp = new URLSearchParams(url.split("?")[1]);
    expect(sp.has("domain")).toBe(false);
    expect(sp.has("proof")).toBe(false);
    expect(sp.has("reason")).toBe(false);
  });

  it("truncates oversized text parameters", () => {
    const huge = "x".repeat(5000);
    const url = buildTemporalProofUrl({ proof: huge, reason: huge, domain: huge });
    const sp = new URLSearchParams(url.split("?")[1]);
    expect((sp.get("proof") ?? "").length).toBeLessThanOrEqual(__TEMPORAL_PROOF_LINK_LIMITS.proof);
    expect((sp.get("reason") ?? "").length).toBeLessThanOrEqual(__TEMPORAL_PROOF_LINK_LIMITS.reason);
    expect((sp.get("domain") ?? "").length).toBeLessThanOrEqual(__TEMPORAL_PROOF_LINK_LIMITS.domain);
  });

  it("falls back to the default expected level when an unsupported value is supplied", () => {
    const url = buildTemporalProofUrl({ level: "definitely-not-a-level" });
    const sp = new URLSearchParams(url.split("?")[1]);
    expect(sp.get("level")).toBe(DEFAULT_TEMPORAL_EXPECTED_LEVEL);
  });

  it("falls back to default timebox when malformed", () => {
    const url = buildTemporalProofUrl({ timebox: "not-a-time" });
    const sp = new URLSearchParams(url.split("?")[1]);
    expect(sp.get("timebox")).toBe(DEFAULT_TEMPORAL_TIMEBOX);
  });
});

describe("parseTemporalProofParams", () => {
  it("returns isTemporal=false for unrelated query strings", () => {
    const parsed = parseTemporalProofParams(new URLSearchParams("?mode=LAW_MAX"));
    expect(parsed.isTemporal).toBe(false);
  });

  it("never crashes on null/empty input", () => {
    expect(() => parseTemporalProofParams(null)).not.toThrow();
    expect(() => parseTemporalProofParams(undefined)).not.toThrow();
    expect(parseTemporalProofParams(null).isTemporal).toBe(false);
    expect(parseTemporalProofParams(new URLSearchParams()).isTemporal).toBe(false);
  });

  it("round-trips a fully populated brief", () => {
    const url = buildTemporalProofUrl({
      domain: "law",
      proof: "Two source-bank entries",
      level: "accepted_strong",
      reason: "domain neglect",
      timebox: "24h",
    });
    const parsed = parseTemporalProofParams(new URLSearchParams(url.split("?")[1]));
    expect(parsed).toMatchObject({
      isTemporal: true,
      domain: "law",
      proof: "Two source-bank entries",
      level: "accepted_strong",
      reason: "domain neglect",
      timebox: "24h",
    });
  });

  it("returns default level when level param is missing or malformed", () => {
    const a = parseTemporalProofParams(new URLSearchParams("source=temporal"));
    expect(a.level).toBe(DEFAULT_TEMPORAL_EXPECTED_LEVEL);
    const b = parseTemporalProofParams(new URLSearchParams("source=temporal&level=garbage"));
    expect(b.level).toBe(DEFAULT_TEMPORAL_EXPECTED_LEVEL);
  });

  it("truncates oversized inputs without throwing", () => {
    const huge = encodeURIComponent("x".repeat(10_000));
    const sp = new URLSearchParams(`source=temporal&proof=${huge}&reason=${huge}&domain=${huge}`);
    const parsed = parseTemporalProofParams(sp);
    expect((parsed.proof ?? "").length).toBeLessThanOrEqual(__TEMPORAL_PROOF_LINK_LIMITS.proof);
    expect((parsed.reason ?? "").length).toBeLessThanOrEqual(__TEMPORAL_PROOF_LINK_LIMITS.reason);
    expect((parsed.domain ?? "").length).toBeLessThanOrEqual(__TEMPORAL_PROOF_LINK_LIMITS.domain);
  });

  it("tolerates missing evidence — null domain and proof are safe", () => {
    const parsed = parseTemporalProofParams(new URLSearchParams("source=temporal"));
    expect(parsed.isTemporal).toBe(true);
    expect(parsed.domain).toBeNull();
    expect(parsed.proof).toBeNull();
    expect(parsed.reason).toBeNull();
    expect(parsed.timebox).toBe(DEFAULT_TEMPORAL_TIMEBOX);
  });

  it("does not interfere with the existing ?first=1 flow", () => {
    const sp = new URLSearchParams("first=1");
    expect(parseTemporalProofParams(sp).isTemporal).toBe(false);
    expect(isFirstProofMode(sp)).toBe(true);
  });

  it("the CTA URL parses back to a temporal brief", () => {
    const url = buildTemporalProofUrl({ domain: "law", proof: "one IRAC paragraph" });
    expect(url).toContain("/proof?");
    const parsed = parseTemporalProofParams(new URLSearchParams(url.split("?")[1]));
    expect(parsed.isTemporal).toBe(true);
    expect(parsed.domain).toBe("law");
  });
});