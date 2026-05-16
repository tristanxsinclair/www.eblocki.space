import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EvidenceStrengthBadge, ModeBadge, StateBadge } from "@/components/eblocki/Badges";
import { ArrowRight, Crosshair, FileText, Gavel, MessageSquare, Layers, Sparkles, Activity, Cpu, ShieldAlert, TrendingUp } from "lucide-react";
import { detectMode, MODE_LABELS, type Mode } from "@/lib/eblocki/modes";
import { detectState, STATE_LABELS, STATE_PRESCRIPTION, type BehaviouralState } from "@/lib/eblocki/states";
import { Seo } from "@/components/Seo";
import { MomentumPanel } from "@/components/eblocki/MomentumPanel";
import { WeeklyRetro } from "@/components/eblocki/WeeklyRetro";

export default function Dashboard() {
  const { user } = useAuth();
  const [today, setToday] = useState<any>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [recentCoach, setRecentCoach] = useState<any[]>([]);
  const [allArtifacts, setAllArtifacts] = useState<any[]>([]);
  const [modesCount, setModesCount] = useState<number>(0);
  const [quick, setQuick] = useState("");
  const [mode, setMode] = useState<Mode | null>(null);
  const [state, setStateBadge] = useState<BehaviouralState | null>(null);

  const todayISO = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: dcs }, { data: pc }, { data: pa }, { data: ci }, { data: paAll }, { count: umCount }] = await Promise.all([
        supabase.from("daily_control_sheets").select("*").eq("user_id", user.id).eq("sheet_date", todayISO).maybeSingle(),
        supabase.from("proof_commitments").select("*").eq("user_id", user.id).eq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("proof_artifacts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("coach_interactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("proof_artifacts").select("domain,evidence_strength,quality_score,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
        supabase.from("user_modes").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_active", true),
      ]);
      setToday(dcs);
      setPending(pc ?? []);
      setRecent(pa ?? []);
      setRecentCoach(ci ?? []);
      setAllArtifacts(paAll ?? []);
      setModesCount(umCount ?? 0);
    })();
  }, [user, todayISO]);

  const week = recent.filter((r) => new Date(r.created_at) > new Date(Date.now() - 7 * 864e5));
  const eliteCount = week.filter((r) => r.evidence_strength === "elite").length;
  const strongCount = week.filter((r) => r.evidence_strength === "strong").length;
  const weekScored = week.filter((r) => typeof r.quality_score === "number");
  const weekAvgScore = weekScored.length
    ? Math.round((weekScored.reduce((s, r) => s + (r.quality_score ?? 0), 0) / weekScored.length) * 10) / 10
    : 0;

  const intel = useMemo(() => {
    const weekArtifacts = allArtifacts.filter((a) => new Date(a.created_at) > new Date(Date.now() - 7 * 864e5));
    const byDomainWeek: Record<string, { count: number; score: number }> = {};
    for (const a of weekArtifacts) {
      const d = a.domain || "general";
      if (!byDomainWeek[d]) byDomainWeek[d] = { count: 0, score: 0 };
      byDomainWeek[d].count += 1;
      byDomainWeek[d].score += (a.quality_score ?? 0);
    }
    const ranked = Object.entries(byDomainWeek).map(([d, v]) => ({ domain: d, count: v.count, avg: v.count ? v.score / v.count : 0 }));
    ranked.sort((a, b) => (b.count * 10 + b.avg) - (a.count * 10 + a.avg));
    const strongest = ranked[0]?.domain ?? null;

    const allDomainsTouched = new Set(allArtifacts.map((a) => a.domain));
    const pendingDomains = new Set(pending.map((p) => p.domain));
    const undertrained = [...pendingDomains].find((d) => !weekArtifacts.some((a) => a.domain === d))
      ?? [...allDomainsTouched].find((d) => !weekArtifacts.some((a) => a.domain === d))
      ?? null;

    // Compounding score (0-100): velocity + quality + commitments closed - missed
    const total = allArtifacts.length;
    const avgQ = total ? allArtifacts.reduce((s, a) => s + (a.quality_score ?? 0), 0) / total : 0;
    const compounding = Math.max(0, Math.min(100,
      Math.round(weekArtifacts.length * 8 + eliteCount * 6 + strongCount * 3 + avgQ * 3)
    ));

    return { strongest, weakest: undertrained, compounding, weekCount: weekArtifacts.length, avgQ: Math.round(avgQ * 10) / 10 };
  }, [allArtifacts, pending, eliteCount, strongCount]);

  const currentMode = recentCoach[0]?.mode ?? null;
  const currentState = (today?.state as BehaviouralState) ?? recentCoach[0]?.state_detected ?? null;
  const topPending = pending[0];
  const latestArtifact = recent[0];

  const handleCheckIn = () => {
    if (!quick.trim()) return;
    setMode(detectMode(quick).primary);
    setStateBadge(detectState(quick));
  };

  return (
    <AppShell>
      <Seo
        title="Dashboard | EBLOCKI"
        description="Operating-system overview: compounding score, behavioural state, mode momentum, and pending proof contracts."
        path="/dashboard"
      />
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        <header className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Operating System // Command Centre</span>
            <h1 className="text-2xl md:text-3xl font-semibold mt-1">Today's proof surface</h1>
            <p className="text-sm text-muted-foreground mt-1">Proof beats intention. Every panel here feeds the loop.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/start"><Button size="sm"><Sparkles className="h-3.5 w-3.5 mr-1.5" />Start Today</Button></Link>
            <Link to="/coach"><Button size="sm" variant="outline"><MessageSquare className="h-3.5 w-3.5 mr-1.5" />Coach</Button></Link>
            <Link to="/proof"><Button size="sm" variant="outline"><Gavel className="h-3.5 w-3.5 mr-1.5" />Submit Proof</Button></Link>
            <Link to="/modes"><Button size="sm" variant="outline"><Layers className="h-3.5 w-3.5 mr-1.5" />Modes</Button></Link>
            <Link to="/proof"><Button size="sm" variant="outline"><Gavel className="h-3.5 w-3.5 mr-1.5" />Court of Evidence</Button></Link>
          </div>
        </header>

        {modesCount === 0 && (
          <Card className="panel p-4 border-primary/40 bg-primary/5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Eblocki OS — Not Configured</div>
                <p className="text-sm mt-1">No personalised modes found. Build your Eblocki OS so the system knows what evidence matters.</p>
              </div>
              <Link to="/modes"><Button size="sm">Configure Modes</Button></Link>
            </div>
          </Card>
        )}

        <MomentumPanel />
        <WeeklyRetro />

        {/* OS OVERVIEW */}
        <Card className="panel p-4 md:p-5 border-primary/30">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary m-0">Operating System Overview</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase text-muted-foreground">Compounding Progress</span>
              <span className="font-mono text-lg text-primary">{intel.compounding}<span className="text-muted-foreground text-xs">/100</span></span>
            </div>
          </div>
          <div className="mt-2 h-1.5 w-full bg-muted/50 rounded-sm overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${intel.compounding}%` }} />
          </div>

          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <OSCell label="Active Mode" value={currentMode ? (MODE_LABELS[currentMode as Mode] ?? currentMode) : "—"}
              hint={currentMode ? "From last coach diagnostic" : "Run a check-in to detect"} />
            <OSCell label="Behavioural State" value={currentState ? STATE_LABELS[currentState as BehaviouralState] ?? currentState : "—"}
              hint={currentState ? STATE_PRESCRIPTION[currentState as BehaviouralState] : "No state diagnosed today"} />
            <OSCell label="Strongest Mode (7d)" value={intel.strongest ? intel.strongest.toUpperCase() : "—"}
              hint={intel.strongest ? "Highest proof velocity" : "No proof this week"} />
            <OSCell label="Undertrained Mode" value={intel.weakest ? intel.weakest.toUpperCase() : "—"}
              hint={intel.weakest ? "No artifact in 7 days" : "All active modes touched"} />
          </div>

          <div className="mt-4 grid md:grid-cols-3 gap-3">
            <OSAction
              title="Next Controllable Action"
              body={today?.next_best_action || "Open the Control Sheet and define one move you can ship in <30 minutes."}
              to="/sheet"
              cta="Set NCA"
            />
            <OSAction
              title="Pending Proof Contract"
              body={topPending ? `${topPending.title} — ${topPending.required_artifact ?? "no artifact spec"}` : "No active contract. Run the Coach to forge one."}
              to={topPending ? "/proof" : "/coach"}
              cta={topPending ? "Submit Artifact" : "Open Coach"}
            />
            <OSAction
              title="Latest Proof Artifact"
              body={latestArtifact ? `${latestArtifact.title} — ${latestArtifact.evidence_strength?.toUpperCase() ?? "unscored"} ${latestArtifact.quality_score ? `(${latestArtifact.quality_score}/10)` : ""}` : "Court of Evidence is empty. The system has no record of you."}
              to="/proof"
              cta="Open Court"
            />
          </div>
        </Card>

        {/* INTELLIGENCE SUMMARY */}
        <Card className="panel p-4 md:p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-mono text-[10px] uppercase tracking-widest m-0">Eblocki Intelligence Summary</h2>
          </div>
          <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
            <Intel icon={<TrendingUp className="h-3.5 w-3.5 text-success" />}
              title="What you're proving"
              body={intel.strongest
                ? `Most evidence this week is in ${intel.strongest.toUpperCase()} (${intel.weekCount} artifacts, avg ${intel.avgQ}/10). Momentum is real — protect it.`
                : "No proof yet this week. The court has no record. Submit one artifact today to begin the compounding loop."} />
            <Intel icon={<ShieldAlert className="h-3.5 w-3.5 text-destructive" />}
              title="Where you're avoiding"
              body={intel.weakest
                ? `${intel.weakest.toUpperCase()} has produced no proof in 7 days. This is the avoidance signal.`
                : currentState === "avoidant" || currentState === "academic_displacement"
                  ? `Behavioural state flagged ${currentState}. Reduce scope and ship one tiny artifact in the next 30 minutes.`
                  : "No major avoidance signals detected. Keep producing."} />
            <Intel icon={<Activity className="h-3.5 w-3.5 text-primary" />}
              title="Mode with most momentum"
              body={intel.strongest ? `${intel.strongest.toUpperCase()} — ${intel.weekCount} artifacts in 7d.` : "No mode has momentum. Pick one and force one artifact today."} />
            <Intel icon={<Crosshair className="h-3.5 w-3.5 text-primary" />}
              title="Next strategic move"
              body={
                topPending
                  ? `Close pending contract: "${topPending.title}". Submit the artifact in the Court of Evidence.`
                  : intel.compounding < 20
                    ? "Open the Coach with one real bottleneck. Convert it into a Proof Contract."
                    : intel.weakest
                      ? `Forge a Proof Contract in ${intel.weakest.toUpperCase()} to close the avoidance gap.`
                      : "Push for an HD/Elite Upgrade — raise quality of your next artifact, not quantity."
              } />
          </div>
        </Card>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="panel p-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Prime Objective</span>
              {today?.state && <StateBadge state={today.state as BehaviouralState} />}
            </div>
            <div className="mt-2 text-lg">{today?.prime_objective || <span className="text-muted-foreground">No prime objective declared today. Without one, every action is drift.</span>}</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Next Controllable Action: {today?.next_best_action || <span className="italic">— undefined —</span>}
            </div>
            <Link to="/sheet" className="inline-flex items-center gap-1 text-xs font-mono mt-3 text-primary hover:underline">
              Open Daily Control Sheet <ArrowRight className="h-3 w-3" />
            </Link>
          </Card>

          <Card className="panel p-4">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Court of Evidence — 7 days</span>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Metric label="Artifacts" value={week.length} />
              <Metric label="Elite" value={eliteCount} accent />
              <Metric label="Strong" value={strongCount} />
              <Metric label="Pending" value={pending.length} />
              <Metric label="Avg Score" value={weekAvgScore} />
              <Metric label="Modes" value={modesCount} />
            </div>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="panel p-4">
            <div className="flex items-center gap-2">
              <Crosshair className="h-4 w-4 text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-widest">Quick Check-In</span>
            </div>
            <Textarea
              placeholder="Name the bottleneck. The system needs a real input, not a polished one."
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
                  <Button size="sm">Send to Coach</Button>
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
                <h2 className="font-mono text-[10px] uppercase tracking-widest m-0">Pending Proof Contracts</h2>
              </div>
              <Link to="/proof" className="text-xs font-mono text-muted-foreground hover:text-foreground">View all</Link>
            </div>
            {pending.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No active Proof Contracts. The system has nothing to hold you to. Open the Coach and forge one.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {pending.slice(0, 5).map((p) => (
                  <li key={p.id} className="rounded-sm border border-border p-2.5 hover:border-primary/40 transition-colors">
                    <Link to="/proof" className="block">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm">{p.title}</span>
                        <span className="font-mono text-[10px] uppercase text-muted-foreground">{p.domain}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{p.required_artifact}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="panel p-4">
          <div className="flex items-center gap-2">
            <Gavel className="h-4 w-4 text-primary" />
            <h2 className="font-mono text-[10px] uppercase tracking-widest m-0">Recent Verdicts — Court of Evidence</h2>
          </div>
          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No proof logged yet. The system has no evidence. Submit one artifact to start compounding.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {recent.map((r) => (
                <li key={r.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{r.title}</div>
                    <div className="text-[10px] font-mono uppercase text-muted-foreground">{r.domain}</div>
                    {r.next_upgrade && (
                      <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                        <span className="text-foreground font-mono">Next upgrade:</span> {r.next_upgrade}
                      </div>
                    )}
                  </div>
                  {r.evidence_strength && <EvidenceStrengthBadge strength={r.evidence_strength} score={r.quality_score} />}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="panel p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h2 className="font-mono text-[10px] uppercase tracking-widest m-0">Recent Coach Diagnostics</h2>
            </div>
            <Link to="/coach" className="text-xs font-mono text-muted-foreground hover:text-foreground">Open Coach</Link>
          </div>
          {recentCoach.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No diagnostics yet. The system can't route you without an input. Drop a real bottleneck into the Coach.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {recentCoach.map((c) => (
                <li key={c.id} className="py-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {c.mode ?? "—"}
                    </span>
                    {c.state_detected && (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
                        {c.state_detected}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-foreground mt-0.5 truncate">
                    {c.user_input.slice(0, 140)}{c.user_input.length > 140 ? "…" : ""}
                  </div>
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

function OSCell({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-sm border border-border bg-card/40 p-3">
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold truncate">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{hint}</div>}
    </div>
  );
}

function OSAction({ title, body, to, cta }: { title: string; body: string; to: string; cta: string }) {
  return (
    <div className="rounded-sm border border-border bg-card/40 p-3 flex flex-col">
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{title}</div>
      <div className="mt-1 text-sm flex-1">{body}</div>
      <Link to={to} className="mt-2 inline-flex items-center gap-1 text-xs font-mono text-primary hover:underline">
        {cta} <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function Intel({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-sm border border-border p-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{title}</span>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed">{body}</p>
    </div>
  );
}
