import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { startOfWeek } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { localDayKey } from "@/lib/eblocki/local-day";

export function useLocalToday() {
  const [today, setToday] = useState(localDayKey);
  useEffect(() => {
    const refresh = () => setToday(localDayKey());
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return today;
}

export function useStudentOverview() {
  const { user } = useAuth();
  const today = useLocalToday();
  const weekStart = startOfWeek(new Date(`${today}T00:00:00`), {
    weekStartsOn: 1,
  });
  const query = useQuery({
    queryKey: ["student-overview", user?.id, today],
    enabled: Boolean(user),
    // Supabase already retries reads; avoid multiplying its retry window.
    retry: false,
    queryFn: async () => {
      if (!user) throw new Error("Sign in to load your day.");
      const [account, profile, areas, sheet, tasks, recent, week] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("full_name,email,access_level")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("user_onboarding_profiles")
            .select("identity_summary,roles,goals,coaching_style,timezone")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("user_modes")
            .select("mode_id,display_name,description")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .order("display_name"),
          supabase
            .from("daily_control_sheets")
            .select("prime_objective,next_best_action")
            .eq("user_id", user.id)
            .eq("sheet_date", today)
            .maybeSingle(),
          supabase
            .from("proof_commitments")
            .select("id,title,required_artifact,domain,due_date")
            .eq("user_id", user.id)
            .eq("status", "pending")
            .order("due_date", { ascending: true, nullsFirst: false })
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("proof_artifacts")
            .select(
              "id,title,domain,evidence_strength,quality_score,created_at,next_upgrade",
              { count: "exact" },
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(8),
          supabase
            .from("proof_artifacts")
            .select("created_at,evidence_strength,quality_score", {
              count: "exact",
            })
            .eq("user_id", user.id)
            .gte("created_at", weekStart.toISOString())
            .order("created_at", { ascending: false }),
        ]);
      const error = [account, profile, areas, sheet, tasks, recent, week].find(
        (result) => result.error,
      )?.error;
      if (error) throw error;
      return {
        account: account.data,
        profile: profile.data,
        areas: areas.data ?? [],
        sheet: sheet.data,
        tasks: tasks.data ?? [],
        recent: recent.data ?? [],
        totalLogs: recent.count ?? 0,
        week: week.data ?? [],
        weekLogs: week.count ?? 0,
      };
    },
  });
  const metadataName = user?.user_metadata?.full_name;
  const name =
    query.data?.account?.full_name?.trim() ||
    (typeof metadataName === "string" ? metadataName.trim() : "") ||
    user?.email?.split("@")[0]?.replace(/[._-]+/g, " ") ||
    "Student";
  return { ...query, today, weekStart, name };
}

export type StudentOverview = NonNullable<
  ReturnType<typeof useStudentOverview>["data"]
>;
