import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Reads role from `user_roles` — server-validated, never trusts client storage. */
export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setIsAdmin(false); setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (cancelled) return;
      setIsAdmin((data ?? []).some((r) => r.role === "admin"));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  return { isAdmin, loading };
}