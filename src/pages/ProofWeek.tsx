import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";
import { Calendar, CheckCircle2, Flame, Gavel, Target } from "lucide-react";
import { computeProofWeek, PROOF_WEEK_DAYS } from "@/lib/eblocki/proof-week";
import { logEvent } from "@/lib/eblocki/analytics";
import type { Tables } from "@/integrations/supabase/types";

type CreatedAtRow = Pick<Tables<"proof_artifacts">, "created_at">;

/**
 * Proof Week — public-facing beta path.
 *
 * Reuses the same `proof_week_join` interest signal and artifact dates the
 * dashboard panel uses, so there is one source of truth for the 7-day
 * challenge. No duplicate state.
 */
export default function ProofWeek() {
  const { user } = useAuth();
  const [joinedAt, setJoinedAt] = useState<string | null>(null);
  const [artifactDates, setArtifactDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [{ data: signal }, { data: arts }] = await Promise.all([
        supabase
          .from("interest_signals")
          .select("created_at")
          .eq("user_id", user.id)
          .eq("signal_type", "proof_week_join")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("proof_artifacts")
          .select("created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      if (cancelled) return;
      const dates = ((arts ?? []) as CreatedAtRow[])
        .map((row) => row.created_at)
        .filter((value): value is string => Boolean(value));
      setArtifactDates(dates);
      if (signal?.created_at) setJoinedAt(signal.created_at);
      else if (dates.length > 0) setJoinedAt(dates[dates.length - 1]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const status = computeProofWeek({ joinedAt, artifactDates });
  const proofHref = status.daysWithProof === 0 ? "/proof?first=1" : "/proof";
  const closedLabel = status.daysWithProof >= 7
    ? "Proof Week complete - 7/7"
    : `Proof Week closed - ${status.daysWithProof}/7 days logged`;

  const join = async () => {
    if (!user) return;
    setJoining(true);
    void logEvent("activation_proof_week_join_clicked", {
      route: "/proof-week",
      source: "proof_week_page",
      challengeState: "clicked",
    });
    const { data } = await supabase
      .from("interest_signals")
      .insert({ user_id: user.id, signal_type: "proof_week_join", source: "proof_week_page" })
      .select("created_at")
      .maybeSingle();
    if (data?.created_at) setJoinedAt(data.created_at);
    setJoining(false);
  };

  return (
    <AppShell>
      <Seo
        title="Proof Week | EBLOCKI"
        description="A 7-day student proof challenge. Submit one real piece of work each day, get an honest verdict, and leave with a clearer next step."
        path="/proof-week"
      />
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-5">
        <header>
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Proof Week</span>
          <h1 className="mt-1 text-2xl md:text-3xl font-semibold">Submit one real piece of work each day for 7 days.</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Proof Week is a simple student beta: submit real work, get an honest verdict, and keep moving with one clear next step.
          </p>
        </header>

        {loading ? (
          <Card className="panel p-4 text-sm text-muted-foreground">Loading Proof Week…</Card>
        ) : !joinedAt ? (
          <Card className="panel p-5 border-primary/40 bg-primary/5 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Start the challenge</span>
            </div>
            <h2 className="text-lg font-semibold">Find out in 7 days if your work is real.</h2>
            <p className="text-sm text-muted-foreground">
              Day 1 starts the moment you join. Submit one honest artifact and Eblocki will tell you what counted and what to do next.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={join} disabled={joining}>{joining ? "Starting…" : "Start Proof Week"}</Button>
              <Link to="/proof?first=1"><Button size="sm" variant="outline">Submit first proof</Button></Link>
            </div>
            <p className="text-xs text-muted-foreground">
              Beta expectation: one proof a day, about 10 to 25 minutes, plus honest feedback at the end.
            </p>
          </Card>
        ) : status.completed ? (
          <Card className="panel p-5 border-primary/40 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">{closedLabel}</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                {status.daysWithProof >= 7
                  ? "Proof Week complete — 7/7"
                  : `Proof Week closed — ${status.daysWithProof}/7 days logged`}
              </span>
            </div>
            <p className="text-sm">
              You logged proof on <span className="text-foreground font-medium">{status.daysWithProof}/7 days</span> ({status.artifactsThisWeek} artifacts).
            </p>
            <p className="text-sm text-muted-foreground">
              {status.daysWithProof >= 7
                ? "Verdict time. Tell us if Eblocki exposed fake productivity - and if it is worth paying for."
                : "The 7-day window is closed. Keep logging proof, but do not call this a completed Proof Week."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to="/dashboard"><Button size="sm">Back to Today</Button></Link>
              <Link to="/proof"><Button size="sm" variant="outline">Keep logging proof</Button></Link>
            </div>
          </Card>
        ) : (
          <Card className="panel p-5 border-primary/40 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                  Day {status.currentDay} / 7 — {status.today!.label}
                </span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {status.daysWithProof}/7 days with proof
              </span>
            </div>
            <h2 className="text-lg font-semibold leading-snug">{status.today!.command}</h2>
            <div className="grid sm:grid-cols-2 gap-2 text-xs">
              <div className="rounded-sm border border-border bg-background/40 p-3">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Proof required</div>
                <p className="mt-1 text-foreground">{status.today!.proofRequired}</p>
              </div>
              <div className="rounded-sm border border-border bg-background/40 p-3">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Estimated time</div>
                <p className="mt-1 text-foreground">10–25 minutes. One artifact. One honest reflection.</p>
              </div>
            </div>
            <div className="flex gap-1">
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
            <div className="flex flex-wrap gap-2 pt-1">
              <Link to={proofHref}><Button size="sm"><Target className="h-3 w-3 mr-1.5" />Submit today's proof</Button></Link>
              <Link to="/coach"><Button size="sm" variant="outline">Need help first?</Button></Link>
              <Link to="/dashboard"><Button size="sm" variant="ghost">Back to Today</Button></Link>
            </div>
          </Card>
        )}

        <Card className="panel p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Gavel className="h-4 w-4 text-primary" />
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary m-0">What counts as proof</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-sm border border-border bg-background/40 p-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Counts</div>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>• A paragraph, IRAC answer, or source-bank entry</li>
                <li>• A drill, reflection, or shipped change</li>
                <li>• A real client/customer/coach interaction with output</li>
              </ul>
            </div>
            <div className="rounded-sm border border-border bg-background/40 p-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Does not count</div>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>• A plan, a to-do list, or a new system</li>
                <li>• Highlighting, re-reading, or note re-organising</li>
                <li>• A claim about identity with no artifact behind it</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="panel p-4 md:p-5 space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">The 7 days</div>
          <ul className="grid gap-2 text-sm">
            {PROOF_WEEK_DAYS.map((d) => (
              <li
                key={d.day}
                className={`rounded-sm border p-3 ${
                  status.today?.day === d.day ? "border-primary bg-primary/5" : "border-border bg-background/40"
                }`}
              >
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Day {d.day} — {d.label}
                </div>
                <div className="mt-1 text-foreground">{d.command}</div>
                <div className="mt-1 text-xs text-muted-foreground">{d.proofRequired}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
