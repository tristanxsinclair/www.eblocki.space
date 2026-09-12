import { describe, expect, it } from "vitest";
import { resolveWelcomeGate } from "@/hooks/useWelcomeGate";

describe("resolveWelcomeGate", () => {
  it("opens welcome only for a true first-use account", () => {
    expect(resolveWelcomeGate({ profile: null, hasProof: false })).toBe("needs");
  });

  it("preserves access for legacy completed onboarding", () => {
    expect(resolveWelcomeGate({
      profile: { seen_welcome: false, completed_onboarding: true },
      hasProof: false,
    })).toBe("ok");
  });

  it("treats existing proof as durable first-use completion", () => {
    expect(resolveWelcomeGate({ profile: null, hasProof: true })).toBe("ok");
  });

  it("fails open when a gate query fails", () => {
    expect(resolveWelcomeGate({ profile: null, hasProof: false, failed: true })).toBe("ok");
  });
});
