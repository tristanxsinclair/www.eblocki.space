import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normaliseAccessLevel, type AccessLevel } from "@/lib/eblocki/access-level";
import { useAuth } from "@/hooks/useAuth";

/**
 * useEntitlement
 *
 * Returns the authenticated user's commercial access level by reading the
 * `access_level` column on their `profiles` row.  Cached by React Query so
 * every consumer in the tree shares a single network round-trip.
 *
 * After Stripe Checkout completes and the webhook updates the profile, React
 * Query's default refetch-on-window-focus behaviour will pick up the new value
 * when the user returns to the app.
 */
export function useEntitlement(): { accessLevel: AccessLevel; loading: boolean } {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["entitlement", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("access_level")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    // Re-validate when the window regains focus so users see their new tier
    // immediately after completing Stripe Checkout.
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });

  return {
    accessLevel: normaliseAccessLevel(data?.access_level),
    loading: isLoading,
  };
}
