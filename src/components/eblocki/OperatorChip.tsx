import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Hexagon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { levelThreshold, operatorTitle } from "@/lib/eblocki/level-engine";

interface Row { level: number; xp_in_level: number; title: string }

/** Compact operator status chip — links to /operator. */
export function OperatorChip({ className }: { className?: string }) {
  const { user } = useAuth();
  const [row, setRow] = useState<Row | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("operator_level")
        .select("level, xp_in_level, title")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setRow((data as any) ?? { level: 1, xp_in_level: 0, title: operatorTitle(1) });
    };
    load();
    const ch = supabase
      .channel(`oplevel:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "operator_level", filter: `user_id=eq.${user.id}` },
        (msg: any) => setRow(msg.new as Row),
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user]);

  if (!row) return null;
  const threshold = levelThreshold(row.level);
  const pct = Math.min(100, Math.round((row.xp_in_level / threshold) * 100));

  return (
    <Link
      to="/operator"
      className={cn(
        "group inline-flex items-center gap-2 px-2 py-1 rounded-sm border border-primary/30 bg-primary/[0.06] hover:bg-primary/10 transition-colors",
        className,
      )}
      title={`${row.title} · ${row.xp_in_level}/${threshold} XP`}
    >
      <Hexagon className="h-3 w-3 text-primary" />
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary tabular-nums">
        OP·L{row.level}
      </span>
      <span className="hidden sm:inline relative h-1 w-10 rounded-full bg-primary/15 overflow-hidden">
        <span
          className="absolute inset-y-0 left-0 bg-primary"
          style={{ width: `${pct}%` }}
        />
      </span>
    </Link>
  );
}