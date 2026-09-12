import type { AccessLevel } from "@/lib/eblocki/access-level";
import { useSubscription } from "@/hooks/useSubscription";

/**
 * useEntitlement
 *
 * Compatibility facade for consumers that only need the commercial tier.
 * The canonical source is `subscriptions`, which is written by the Stripe
 * webhook and interpreted by `useSubscription`.
 */
export function useEntitlement(): { accessLevel: AccessLevel; loading: boolean } {
  const { accessLevel, loading } = useSubscription();
  return { accessLevel, loading };
}
