import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { shouldOpenWelcome } from "@/lib/eblocki/first-proof";

export type WelcomeGateState = "checking" | "needs" | "ok";

export function resolveWelcomeGate({
  profile,
  hasProof,
  failed = false,
}: {
  profile: { seen_welcome?: boolean | null; completed_onboarding?: boolean | null } | null;
  hasProof: boolean;
  failed?: boolean;
}): Exclude<WelcomeGateState, "checking"> {
  if (failed || hasProof) return "ok";
  return shouldOpenWelcome(profile) ? "needs" : "ok";
}

/**
 * Keeps the first-use welcome compatible with legacy and returning accounts.
 * Existing proof is durable evidence that the user is already beyond first use.
 * Reads fail open so a temporary profile error never locks a returning user out.
 */
export function useWelcomeGate(): WelcomeGateState {
  const { user } = useAuth();
  const [state, setState] = useState<WelcomeGateState>("checking");

  useEffect(() => {
    if (!user) {
      setState("checking");
      return;
    }

    let cancelled = false;
    setState("checking");

    void (async () => {
      try {
        const [profileResult, proofResult] = await Promise.all([
          supabase
            .from("user_onboarding_profiles")
            .select("seen_welcome, completed_onboarding")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("proof_artifacts")
            .select("id")
            .eq("user_id", user.id)
            .limit(1),
        ]);

        if (cancelled) return;
        setState(resolveWelcomeGate({
          profile: profileResult.data,
          hasProof: (proofResult.data?.length ?? 0) > 0,
          failed: Boolean(profileResult.error || proofResult.error),
        }));
      } catch {
        if (!cancelled) setState("ok");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return state;
}
