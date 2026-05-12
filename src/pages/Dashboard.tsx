import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EvidenceStrengthBadge, ModeBadge, StateBadge } from "@/components/eblocki/Badges";
import { ArrowRight, Crosshair, FileText, Gavel } from "lucide-react";
import { detectMode, type Mode } from "@/lib/eblocki/modes";
import { detectState, type BehaviouralState, STATE_PRESCRIPTION } from "@/lib/eblocki/states";

export default function Dashboard() {
  const { user } = useAuth();
  const [today, setToday] = useState<any>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [quick, setQuick] = useState("");
  const [mode, setMode] = useState<Mode | null>(null);
  const [state, setStateBadge] = useState<BehaviouralState | null>(null);

  const todayISO = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: dcs }, { data: pc }, { data: pa }] = await Promise.all([
        supabase.from("daily_control_sheets").select("*").eq("user_id", user.id).eq("sheet_date", todayISO).maybeSingle(),
        supabase.from("proof_commitments").select("*").eq("user_id", user.id).eq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("proof_artifacts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);
      setToday(dcs);
      setPending(pc ?? []);
      setRecent(pa ?? []);
    })();
  }, [user, todayISO]);

  const week = recent.filter((r) => new Date(r.created_at) > new Date(Date.now() - 7 * 864e5));
  const eliteCount = week.filter((r) => r.evidence_strength === "elite").length;
  const strongCount = week.filter((r) => r.evidence_strength === "strong").length;

  const handleCheckIn = () => {
    if (!quick.trim()) return;
    setMode(detectMode(quick).primary);
    setStateBadge(detectState(quick));
  };

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        <header>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Operator dashboard</span>
          <h1 className="text-2xl md:text-3xl font-semibold mt-1">Today's command center</h1>
        </header>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="panel p-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Prime objective</span>
              {today?.state && <StateBadge state={today.state as BehaviouralState} />}
            </div>
            <div className="mt-2 text-lg">{today?.prime_objective || <span className="text-muted-foreground">No prime objective set today.</span>}</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Next best action: {today?.next_best_action || <span className="italic">— pending —</span>}
            </div>
            <Link to="/sheet" className="inline-flex items-center gap-1 text-xs font-mono mt-3 text-primary hover:underline">
              Open Daily Control Sheet <ArrowRight className="h-3 w-3" />
            </Link>
          </Card>

          <Card className="panel p-4">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Evidence — last 7 days</span>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Metric label="Artifacts" value={week.length} />
              <Metric label="Elite" value={eliteCount} accent />
              <Metric label="Strong" value={strongCount} />
              <Metric label="Pending" value={pending.length} />
            </div>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="panel p-4">
            <div className="flex items-center gap-2">
              <Crosshair className="h-4 w-4 text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-widest">Quick check-in</span>
            </div>
            <Textarea
              placeholder="What's the bottleneck right now?"
              value={quick}
              onChange={(e) => setQuick(e.target.value)}
              className="mt-3 h-24"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {mode && <ModeBadge mode={mode} />}
                {state && <StateBadge state={state} />}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCheckIn}>Diagnose</Button>
                <Link to={`/coach?prompt=${encodeURIComponent(quick)}`}>
                  <Button size="sm">To Coach</Button>
                </Link>
              </div>
            </div>
            {state && (
              <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-3">
                <span className="text-foreground">Prescription:</span> {STATE_PRESCRIPTION[state]}
              </p>
            )}
          </Card>

          <Card className="panel p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-widest">Pending Proof Contracts</span>
              </div>
              <Link to="/proof" className="text-xs font-mono text-muted-foreground hover:text-foreground">View all</Link>
            </div>
            {pending.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No commitments pending. Open Coach to define one.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {pending.slice(0, 5).map((p) => (
                  <li key={p.id} className="rounded-sm border border-border p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm">{p.title}</span>
                      <span className="font-mono text-[10px] uppercase text-muted-foreground">{p.domain}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{p.required_artifact}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="panel p-4">
          <div className="flex items-center gap-2">
            <Gavel className="h-4 w-4 text-primary" />
            <span className="font-mono text-[10px] uppercase tracking-widest">Recent proof in the Court of Evidence</span>
          </div>
          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No artifacts yet. Submit one in the Court of Evidence.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {recent.map((r) => (
                <li key={r.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm truncate">{r.title}</div>
                    <div className="text-[10px] font-mono uppercase text-muted-foreground">{r.domain}</div>
                  </div>
                  {r.evidence_strength && <EvidenceStrengthBadge strength={r.evidence_strength} score={r.quality_score} />}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function Metric({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-sm border border-border p-2">
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={"mt-1 text-2xl font-semibold font-mono " + (accent ? "text-primary" : "")}>{value}</div>
    </div>
  );
}
