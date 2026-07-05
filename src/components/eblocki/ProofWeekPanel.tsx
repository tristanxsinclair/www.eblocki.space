import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, Flame, MessageSquare, Target } from "lucide-react";
import { computeProofWeek, PROOF_WEEK_DAYS } from "@/lib/eblocki/proof-week";
import { logEvent } from "@/lib/eblocki/analytics";

/**
 * 7-Day Proof Week panel.
 *
 * "Join" is captured as an interest_signal of type proof_week_join. We
 * derive the current day from that timestamp; if missing we fall back to
 * the first proof artifact date so existing users don't lose continuity.
 */
export function ProofWeekPanel({ artifactDates }: { artifactDates: string[] }) {
  const { user } = useAuth();
  const [joinedAt, setJoinedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("interest_signals")
        .select("created_at")
        .eq("user_id", user.id)
        .eq("signal_type", "proof_week_join")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data?.created_at) setJoinedAt(data.created_at);
      else if (artifactDates.length > 0) setJoinedAt(artifactDates[artifactDates.length - 1]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, artifactDates]);

  const status = computeProofWeek({ joinedAt, artifactDates });

  const join = async () => {
    if (!user) return;
    setJoining(true);
    const { data } = await supabase
      .from("interest_signals")
      .insert({ user_id: user.id, signal_type: "proof_week_join", source: "dashboard" })
      .select("created_at")
      .maybeSingle();
    if (data?.created_at) setJoinedAt(data.created_at);
    logEvent("recommendation_outcome_logged", { outcome: "proof_week_joined" });
    setJoining(false);
  };

  if (loading) return null;

  if (!joinedAt) {
    return (
      <Card className="panel p-4 md:p-5 border-primary/30 bg-primary/5 mobile-safe-card text-wrap-safe">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">7-Day Proof Week</span>
        </div>
        <h3 className="mt-2 text-lg font-semibold">Find out if your work is real in 7 days.</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          One command a day. One proof artifact. At the end, you see whether Eblocki exposed fake productivity — and you decide if it stays.
        </p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={join} disabled={joining}>{joining ? "Joining…" : "Join Proof Week"}</Button>
          <Link to="/proof"><Button size="sm" variant="outline">Submit proof first</Button></Link>
        </div>
      </Card>
    );
  }

  if (status.completed) {
    return (
      <Card className="panel p-4 md:p-5 border-primary/40 mobile-safe-card text-wrap-safe">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Proof Week complete</span>
        </div>
        <p className="mt-2 text-sm">
          You logged proof on <span className="text-foreground font-medium">{status.daysWithProof}/7 days</span> ({status.artifactsThisWeek} artifacts).
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Verdict time. Share feedback and tell us if this is worth paying for.</p>
        <div className="mt-3 flex gap-2">
          <Link to="/proof#feedback"><Button size="sm"><MessageSquare className="h-3 w-3 mr-1.5" />Give verdict</Button></Link>
        </div>
      </Card>
    );
  }

  const today = status.today!;
  return (
    <Card className="panel p-4 md:p-5 border-primary/30 mobile-safe-card text-wrap-safe min-w-0 max-w-full">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
            Proof Week — Day {status.currentDay} / 7
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {status.daysWithProof}/7 days with proof
        </span>
      </div>
      <h3 className="mt-2 text-base font-semibold leading-snug">{today.label}: {today.command}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        <span className="text-foreground">Proof required:</span> {today.proofRequired}
      </p>
      <div className="mt-3 flex gap-1">
        {PROOF_WEEK_DAYS.map((d) => (
          <span
            key={d.day}
            aria-label={`Day ${d.day}`}
            className={`h-1.5 flex-1 rounded-sm ${
              d.day < status.currentDay ? "bg-primary/70"
              : d.day === status.currentDay ? "bg-primary"
              : "bg-muted"
            }`}
          />
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Link to="/proof"><Button size="sm"><Target className="h-3 w-3 mr-1.5" />Submit today's proof</Button></Link>
        <Link to="/coach"><Button size="sm" variant="outline">Get command</Button></Link>
      </div>
    </Card>
  );
}