import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

interface DayPoint {
  date: string;
  score: number;
  proofs: number;
}

/**
 * 7-day retrospective. Pure read — never writes. All copy uses honest
 * fallbacks when data is missing so a new user doesn't see fabricated
 * "insights".
 */
export function WeeklyRetro({ className }: Props) {
  const { user } = useAuth();
  const [days, setDays] = useState<DayPoint[]>([]);
  const [artifacts, setArtifacts] = useState<
    { domain: string | null; quality_score: number | null; created_at: string }[]
  >([]);
  const [objectives, setObjectives] = useState<
    {
      mode_id: string | null;
      status: string;
      completion_hard_part: string | null;
      objective_date: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
      const [{ data: ms }, { data: pa }, { data: dos }] = await Promise.all([
        supabase
          .from("momentum_state")
          .select("state_date, momentum_score, proofs_today")
          .eq("user_id", user.id)
          .gte("state_date", weekAgo)
          .order("state_date", { ascending: true }),
        supabase
          .from("proof_artifacts")
          .select("domain, quality_score, created_at")
          .eq("user_id", user.id)
          .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString()),
        supabase
          .from("daily_objectives")
          .select("mode_id, status, completion_hard_part, objective_date")
          .eq("user_id", user.id)
          .gte("objective_date", weekAgo),
      ]);
      if (cancelled) return;
      setDays(
        (ms ?? []).map((r) => ({
          date: r.state_date,
          score: r.momentum_score ?? 0,
          proofs: r.proofs_today ?? 0,
        })),
      );
      setArtifacts(pa ?? []);
      setObjectives(dos ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const insight = useMemo(() => {
    const totalProofs = artifacts.length;
    const scored = artifacts.filter((a) => typeof a.quality_score === "number");
    const avgQuality = scored.length
      ? Math.round((scored.reduce((s, a) => s + (a.quality_score ?? 0), 0) / scored.length) * 10) / 10
      : 0;

    // Mode tally from completed objectives.
    const modeScore = new Map<string, { done: number; total: number }>();
    for (const o of objectives) {
      if (!o.mode_id) continue;
      const cur = modeScore.get(o.mode_id) ?? { done: 0, total: 0 };
      cur.total += 1;
      if (o.status === "completed") cur.done += 1;
      modeScore.set(o.mode_id, cur);
    }
    const modeRanked = [...modeScore.entries()]
      .filter(([, v]) => v.total >= 1)
      .map(([k, v]) => ({ mode: k, ratio: v.done / v.total, done: v.done, total: v.total }))
      .sort((a, b) => b.ratio - a.ratio || b.done - a.done);

    const strongest = modeRanked[0]?.mode ?? null;
    const weakest = modeRanked.length >= 2 ? modeRanked[modeRanked.length - 1].mode : null;

    // Most common avoidance pattern — naive word frequency over the
    // "what made this hard" answers.
    const words = objectives
      .map((o) => o.completion_hard_part ?? "")
      .join(" ")
      .toLowerCase()
      .match(/\b[a-z]{4,}\b/g) ?? [];
    const stop = new Set(["that","this","with","just","really","then","than","felt","feel","because","still","didnt","didn"]);
    const freq = new Map<string, number>();
    for (const w of words) if (!stop.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
    const topAvoidance = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
    const avoidance = topAvoidance && topAvoidance[1] >= 2 ? topAvoidance[0] : null;

    const activeDays = new Set(artifacts.map((a) => a.created_at.slice(0, 10))).size;

    // Identity claim — only state it if the data actually supports it.
    let identityClaim: string | null = null;
    if (totalProofs >= 5 && avgQuality >= 6) {
      identityClaim = "Operator who ships at depth.";
    } else if (totalProofs >= 5) {
      identityClaim = "Consistent shipper — depth is the next claim to earn.";
    } else if (activeDays >= 3) {
      identityClaim = "Active across the week — convert frequency into output.";
    }

    let upgrade: string | null = null;
    if (totalProofs === 0) upgrade = "Submit one proof to start the pattern.";
    else if (avgQuality < 4) upgrade = "Raise depth: one high-resistance artifact beats five shallow ones.";
    else if (activeDays < 4) upgrade = "Raise frequency: stack one short proof on quiet days.";
    else if (weakest && weakest !== strongest) upgrade = `Reinvest in ${weakest.toUpperCase()} — it lagged this week.`;
    else upgrade = "Sustain. Protect the streak with one early proof tomorrow.";

    return { totalProofs, avgQuality, strongest, weakest, avoidance, identityClaim, upgrade, activeDays };
  }, [artifacts, objectives]);

  if (loading) {
    return (
      <Card className={cn("panel p-4 border-primary/20", className)}>
        <div className="h-28 animate-pulse bg-muted/30 rounded" />
      </Card>
    );
  }

  const maxScore = Math.max(40, ...days.map((d) => d.score));

  return (
    <Card className={cn("panel p-4 md:p-5 border-primary/30", className)}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">
          Weekly Retrospective
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          7 days
        </span>
      </div>

      {/* Sparkline */}
      <div className="mt-4 flex items-end gap-1 h-16">
        {days.length === 0 ? (
          <div className="text-xs text-muted-foreground italic self-center w-full">
            No momentum data yet — the line will appear after your first day.
          </div>
        ) : (
          days.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${d.date}: score ${d.score}, ${d.proofs} proofs`}>
              <div
                className="w-full rounded-sm bg-primary/70"
                style={{ height: `${Math.max(4, (d.score / maxScore) * 100)}%` }}
              />
              <span className="text-[8px] font-mono text-muted-foreground">
                {d.date.slice(8, 10)}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        <Stat label="Proofs" value={insight.totalProofs} />
        <Stat label="Avg quality" value={insight.avgQuality.toFixed(1)} />
        <Stat label="Strongest" value={insight.strongest ?? "—"} />
        <Stat label="Weakest" value={insight.weakest ?? "—"} />
      </div>

      <div className="mt-4 space-y-2 text-sm">
        {insight.identityClaim && (
          <p className="border-l-2 border-primary/50 pl-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-primary mr-2">
              Identity earned
            </span>
            {insight.identityClaim}
          </p>
        )}
        {insight.avoidance && (
          <p className="border-l-2 border-destructive/40 pl-3 text-muted-foreground">
            <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-destructive mr-2">
              Pattern
            </span>
            Recurring friction word: <span className="text-foreground">{insight.avoidance}</span>
          </p>
        )}
        {insight.upgrade && (
          <p className="border-l-2 border-primary/30 pl-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-primary mr-2">
              Upgrade
            </span>
            {insight.upgrade}
          </p>
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-foreground font-semibold text-base font-sans normal-case tracking-normal truncate">
        {value}
      </div>
      <div>{label}</div>
    </div>
  );
}