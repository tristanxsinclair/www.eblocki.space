import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LevelUpOverlay, type LevelUpPayload } from "./LevelUpOverlay";
import { rankFor, operatorTitle } from "@/lib/eblocki/level-engine";

/**
 * Subscribes to identity_ledger inserts for the current user and surfaces a
 * restrained level-up overlay whenever the Postgres trigger writes an
 * "escalation" row whose summary contains "level up".
 */
export function LevelUpListener() {
  const { user } = useAuth();
  const [payload, setPayload] = useState<LevelUpPayload | null>(null);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`identity_ledger:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "identity_ledger",
          filter: `user_id=eq.${user.id}`,
        },
        (msg: any) => {
          const row = msg.new as { kind: string; summary: string; domain: string };
          if (row.kind !== "escalation") return;
          // Match "L7 → L8" pattern
          const m = /L(\d+)\s*→\s*L(\d+)/.exec(row.summary || "");
          if (!m) return;
          const newLevel = parseInt(m[2], 10);
          const isOperator = row.domain === "operator";
          setPayload({
            scope: isOperator ? "operator" : "domain",
            domain: isOperator ? undefined : row.domain,
            newLevel,
            rank: isOperator ? operatorTitle(newLevel) : rankFor(newLevel),
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return <LevelUpOverlay payload={payload} onClose={() => setPayload(null)} />;
}