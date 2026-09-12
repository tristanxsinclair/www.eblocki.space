import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEntitlement } from "@/hooks/useEntitlement";

const subscriptionState = vi.hoisted(() => ({
  accessLevel: "free" as "free" | "pro" | "founder",
  loading: false,
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => subscriptionState,
}));

describe("useEntitlement", () => {
  beforeEach(() => {
    subscriptionState.accessLevel = "free";
    subscriptionState.loading = false;
  });

  it("forwards the canonical subscription entitlement", () => {
    subscriptionState.accessLevel = "founder";
    const { result } = renderHook(() => useEntitlement());

    expect(result.current).toEqual({ accessLevel: "founder", loading: false });
  });

  it("preserves the subscription loading state", () => {
    subscriptionState.loading = true;
    const { result } = renderHook(() => useEntitlement());

    expect(result.current.loading).toBe(true);
  });
});
