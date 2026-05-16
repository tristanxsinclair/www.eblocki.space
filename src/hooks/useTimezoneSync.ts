import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * One-shot timezone reconciliation.
 *
 * Behaviour:
 *  - On first login after this lands, the browser's IANA timezone is detected
 *    and written to user_onboarding_profiles.timezone with source='browser'.
 *  - We only overwrite the existing row if (a) the user is on the default 'UTC'
 *    AND source!='manual', OR (b) the browser zone differs and source='default'.
 *  - Users who manually set a zone in Settings (source='manual') are never
 *    silently overwritten. No modal, no repeated prompts, no loops.
 */
export function useTimezoneSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      let browserTz: string | null = null;
      try {
        browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
      } catch { browserTz = null; }
      if (!browserTz) return;

      const { data } = await supabase
        .from("user_onboarding_profiles")
        .select("timezone, timezone_source")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      const currentTz = data?.timezone ?? "UTC";
      const source = (data?.timezone_source ?? "default") as "default" | "browser" | "manual";

      if (source === "manual") return;            // never overwrite user choice
      if (currentTz === browserTz && source === "browser") return;
      // Only correct when the stored zone is the default UTC, or we previously
      // wrote a browser zone that's now stale (user travelled, etc.).
      if (source === "default" || currentTz === "UTC" || source === "browser") {
        await supabase.from("user_onboarding_profiles").upsert(
          {
            user_id: user.id,
            timezone: browserTz,
            timezone_source: "browser",
            timezone_updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      }
    })();

    return () => { cancelled = true; };
  }, [user]);
}