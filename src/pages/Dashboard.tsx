import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EvidenceStrengthBadge, ModeBadge, StateBadge } from "@/components/eblocki/Badges";
import {
  ArrowRight,
  ChevronDown,
  CircleDot,
  Crosshair,
  FileText,
  Gavel,
  Layers,
  MessageSquare,
  Radar,
  ShieldAlert,
  Sparkles,
  Target,
} from "lucide-react";
import { detectMode, MODE_LABELS, type Mode } from "@/lib/eblocki/modes";
import { detectState, STATE_LABELS, STATE_PRESCRIPTION, type BehaviouralState } from "@/lib/eblocki/states";
import { Seo } from "@/components/Seo";
import { MomentumPanel } from "@/components/eblocki/MomentumPanel";
import { WeeklyRetro } from "@/components/eblocki/WeeklyRetro";
import { InterventionCard } from "@/components/eblocki/InterventionCard";
import { TemporalFeedbackPanel } from "@/components/eblocki/TemporalFeedbackPanel";
import { TemporalIntelligencePanel } from "@/components/eblocki/TemporalIntelligencePanel";
import { TemporalModelAuditPanel } from "@/components/eblocki/TemporalModelAuditPanel";
import { TemporalMap } from "@/components/eblocki/TemporalMap";
import { ProductMatchPanel } from "@/components/eblocki/ProductMatchPanel";
import { ProofWeekPanel } from "@/components/eblocki/ProofWeekPanel";
import { InterestSignalCard } from "@/components/eblocki/InterestSignalCard";
import { MobileCollapse } from "@/components/eblocki/MobileCollapse";
import { computeTemporal, type TemporalResult } from "@/lib/eblocki/temporal-engine";
import { buildDashboardViewModel } from "@/lib/eblocki/dashboard-view-model";
import { mobileRecentProofLimit } from "@/lib/eblocki/mobile-disclosure";
import { logEvent } from "@/lib/eblocki/analytics";

export default function Dashboard() {
  const { user } = useAuth();
  const [welcomeCheck, setWelcomeCheck] = useState<"checking" | "needs" | "ok">("checking");
  const [today, setToday] = useState<any>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [recentCoach, setRecentCoach] = useState<any[]>([]);
  const [allArtifacts, setAllArtifacts] = useState<any[]>([]);
  const [verdicts, setVerdicts] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [activeDomains, setActiveDomains] = useState<string[]>([]);
  const [quick, setQuick] = useState("");
  const [mode, setMode] = useState<Mode | null>(null);
  const [state, setStateBadge] = useState<BehaviouralState | null>(null);
  const [futureTab, setFutureTab] = useState("forecast");
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [queryFailed, setQueryFailed] = useState(false);

  const todayISO = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_onboarding_profiles")
        .select("seen_welcome")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setWelcomeCheck(data?.seen_welcome ? "ok" : "needs");
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setQueryFailed(false);
      try {
        const [dcsRes, pcRes, paRes, ciRes, allRes, modesRes, verdictRes, ledgerRes] = await Promise.all([
          supabase.from("daily_control_sheets").select("*").eq("user_id", user.id).eq("sheet_date", todayISO).maybeSingle(),
          supabase.from("proof_commitments").select("*").eq("user_id", user.id).eq("status", "pending").order("created_at", { ascending: false }),
          supabase.from("proof_artifacts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
          supabase.from("coach_interactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
          supabase.from("proof_artifacts")
            .select("id,domain,title,artifact_type,evidence_strength,quality_score,transfer_flag,pressure_flag,proof_tier,created_at,next_upgrade,temporal_snapshot")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(200),
          supabase.from("user_modes").select("mode_id").eq("user_id", user.id).eq("is_active", true),
          supabase.from("court_verdicts").select("verdict,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
          supabase.from("identity_ledger").select("kind,domain,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
        ]);
        if (cancelled) return;
        setToday(dcsRes.data);
        setPending(pcRes.data ?? []);
        setRecent(paRes.data ?? []);
        setRecentCoach(ciRes.data ?? []);
        setAllArtifacts(allRes.data ?? []);
        setActiveDomains((modesRes.data ?? []).map((row) => row.mode_id));
        setVerdicts(verdictRes.data ?? []);
        setLedger(ledgerRes.data ?? []);
        setQueryFailed(Boolean(dcsRes.error || pcRes.error || paRes.error || ciRes.error || allRes.error || modesRes.error || verdictRes.error || ledgerRes.error));
      } catch {
        if (!cancelled) setQueryFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user, todayISO]);

  const currentMode = recentCoach[0]?.mode ?? null;
  const currentState = (today?.state as BehaviouralState) ?? recentCoach[0]?.state_detected ?? null;
  const topPending = pending[0];
  const latestArtifact = recent[0];

  const temporalResult = useMemo<TemporalResult | null>(() => {
    try {
      return computeTemporal({
        artifacts: allArtifacts,
        verdicts,
        ledger,
        activeDomains,
        state: currentState,
      });
    } catch {
      return null;
    }
  }, [allArtifacts, verdicts, ledger, activeDomains, currentState]);

  const view = useMemo(() => buildDashboardViewModel({
    today,
    pending,
    recentProofs: recent,
    allArtifacts,
    recentCoach,
    modesCount: activeDomains.length,
    temporalResult,
    queryFailed,
  }), [today, pending, recent, allArtifacts, recentCoach, activeDomains.length, temporalResult, queryFailed]);

  const handleCheckIn = () => {
    if (!quick.trim()) return;
    setMode(detectMode(quick).primary);
    setStateBadge(detectState(quick));
  };

  const openFutureSection = (sectionName: string) => {
    setFutureTab(sectionName);
    logEvent("dashboard_section_opened", { sectionName });
  };

  const toggleWeekly = () => {
    setWeeklyOpen((open) => !open);
    logEvent("dashboard_section_opened", { sectionName: "weekly" });
  };

  const toggleDiagnostics = () => {
    setDiagnosticsOpen((open) => !open);
    logEvent("dashboard_section_opened", { sectionName: "advanced_diagnostics" });
  };

  if (welcomeCheck === "needs") {
    return <Navigate to="/welcome" replace />;
  }

  return (
    <AppShell>
      <Seo
        title="Dashboard | EBLOCKI"
        description="Command-centre overview: next proof, forecast, evidence, identity, and weekly calibration."
        path="/dashboard"
      />
      <div className="mobile-safe-page p-4 md:p-8 max-w-6xl mx-auto space-y-5">
        <header className="flex items-end justify-between gap-4 flex-wrap min-w-0">
          <div className="min-w-0">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Operating System // Command Centre</span>
            <h1 className="text-2xl md:text-3xl font-semibold mt-1">Command surface</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/proof"><Button size="sm"><Gavel className="h-3.5 w-3.5 mr-1.5" />Proof</Button></Link>
            <Link to="/coach"><Button size="sm" variant="outline"><MessageSquare className="h-3.5 w-3.5 mr-1.5" />Coach</Button></Link>
            <Link to="/start-today"><Button size="sm" variant="outline"><Sparkles className="h-3.5 w-3.5 mr-1.5" />Start</Button></Link>
            <Link to="/modes"><Button size="sm" variant="outline"><Layers className="h-3.5 w-3.5 mr-1.5" />Modes</Button></Link>
          </div>
        </header>

        {activeDomains.length === 0 && (
          <Card className="panel p-4 border-primary/30 bg-primary/5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Eblocki OS - Not Configured</div>
                <p className="text-sm mt-1 text-muted-foreground">No personalised modes found. Add modes so proof can route to the right standards.</p>
              </div>
              <Link to="/modes"><Button size="sm">Configure Modes</Button></Link>
            </div>
          </Card>
        )}

        {allArtifacts.length > 0 && <CommandHero view={view} state={currentState} />}

        {allArtifacts.length === 0 && (
          <Card className="panel p-5 md:p-6 border-primary/40 bg-primary/5 mobile-safe-card">
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
              Zone 1 // Activation
            </div>
            <h2 className="mt-2 text-xl md:text-2xl font-semibold leading-tight text-wrap-safe">
              Submit one measurable artifact to activate the command layer.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground text-wrap-safe">
              One artifact. One standard. 25-minute timebox. Done and yes are rejected on purpose.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:flex-wrap">
              <Link to="/proof?first=1" className="w-full sm:w-auto">
                <Button size="sm" className="w-full sm:w-auto">
                  Create my first proof
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </Link>
              <Link to="/start-today" className="w-full sm:w-auto">
                <Button size="sm" variant="outline" className="w-full sm:w-auto">Start Today</Button>
              </Link>
            </div>
          </Card>
        )}

        <ProofWeekPanel artifactDates={allArtifacts.map((a: any) => a.created_at).filter(Boolean)} />

        {allArtifacts.length > 0 && (
        <>
        <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] gap-4 items-start min-w-0">
          <section className="space-y-3 min-w-0">
            <SectionHeader eyebrow="Zone 2" title="Forecast" detail={view.futureSummary.status} />
            <MobileCollapse
              eyebrow="Zone 2"
              label="Open forecast map, calibration & intel"
              trackId="forecast_tabs"
              onOpen={(id) => logEvent("dashboard_section_opened", { sectionName: id ?? "forecast_tabs" })}
            >
            <Tabs value={futureTab} onValueChange={openFutureSection} className="space-y-3">
              <TabsList className="grid w-full grid-cols-3 h-auto bg-card/60 border border-border p-1">
                <TabsTrigger value="forecast" className="text-xs">Map</TabsTrigger>
                <TabsTrigger value="calibration" className="text-xs">Calibration</TabsTrigger>
                <TabsTrigger value="intelligence" className="text-xs">Intel</TabsTrigger>
              </TabsList>
              <TabsContent value="forecast" className="space-y-3">
                {temporalResult ? <TemporalMap result={temporalResult} /> : <EmptyPanel icon={<Radar />} title="Forecast standby" body={view.emptyStateMessage} />}
                <Card className="panel p-4 border-border/80 bg-card/50">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <MetricCell label="Power" value={`${view.futureSummary.futurePowerScore}/100`} />
                    <MetricCell label="Path" value={view.futureSummary.primaryPath.replace(/_/g, " ")} />
                    <MetricCell label="Risk" value={view.futureSummary.riskKind} />
                    <MetricCell label="Confidence" value={view.futureSummary.confidenceLevel} />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    <span className="text-foreground">Temporal command:</span> {view.futureSummary.temporalCommand}
                  </p>
                </Card>
              </TabsContent>
              <TabsContent value="calibration" className="space-y-3">
                <TemporalFeedbackPanel />
                <button
                  type="button"
                  onClick={toggleDiagnostics}
                  className="w-full rounded-sm border border-border bg-card/50 px-4 py-3 text-left transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Advanced</div>
                      <div className="mt-1 text-sm text-foreground">Model health and loop diagnostics</div>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${diagnosticsOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {diagnosticsOpen && <TemporalModelAuditPanel />}
              </TabsContent>
              <TabsContent value="intelligence" className="space-y-3">
                <TemporalIntelligencePanel />
                <InterventionCard state={(currentState as BehaviouralState) ?? state} />
              </TabsContent>
            </Tabs>
            </MobileCollapse>
          </section>

          <EvidenceCommandPanel
            view={view}
            pending={pending}
            recent={recent}
            topPending={topPending}
            latestArtifact={latestArtifact}
          />
        </div>

        <section className="space-y-3 min-w-0">
          <SectionHeader eyebrow="Zone 4" title="Product match" detail="trust-gated" />
          <MobileCollapse
            eyebrow="Zone 4"
            label="View product match"
            trackId="product_match"
            onOpen={(id) => logEvent("dashboard_section_opened", { sectionName: id ?? "product_match" })}
          >
            <div className="space-y-3">
              <ProductMatchPanel
                artifacts={allArtifacts}
                temporal={temporalResult}
                accessLevel="free"
                operatingProfile={{
                  primaryDomain: activeDomains[0] ?? null,
                  recommendationsAllowed: true,
                  trustPreference: "neutral",
                }}
              />
              <InterestSignalCard />
            </div>
          </MobileCollapse>
        </section>

        <section className="space-y-3 min-w-0">
          <SectionHeader eyebrow="Zone 5" title="Check-in & identity" />
          <MobileCollapse
            eyebrow="Zone 5"
            label="Quick check-in & identity signal"
            trackId="check_in_identity"
            onOpen={(id) => logEvent("dashboard_section_opened", { sectionName: id ?? "check_in_identity" })}
          >
            <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4 items-start min-w-0">
              <QuickCheckInCard
                quick={quick}
                setQuick={setQuick}
                mode={mode}
                state={state}
                onDiagnose={handleCheckIn}
              />
              <Card className="panel p-4 border-border/80 bg-card/50 mobile-safe-card">
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Identity</div>
                    <p className="mt-1 text-sm text-muted-foreground text-wrap-safe">
                      {currentMode ? `Last coach mode: ${MODE_LABELS[currentMode as Mode] ?? currentMode}` : "No coach diagnostic yet."}
                    </p>
                  </div>
                  {currentState && <StateBadge state={currentState as BehaviouralState} />}
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <MetricCell label="Modes" value={String(view.evidenceSummary.modesCount)} />
                  <MetricCell label="Latest" value={view.evidenceSummary.latestProofTitle ?? "none"} />
                  <MetricCell label="Weak spot" value={view.evidenceSummary.weakestDomain ?? "clear"} />
                </div>
              </Card>
            </div>
          </MobileCollapse>
        </section>

        <section className="space-y-3">
          <button
            type="button"
            onClick={toggleWeekly}
            className="w-full rounded-sm border border-border bg-card/50 px-4 py-3 text-left transition-colors hover:border-primary/40"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Zone 3 // Weekly</div>
                <div className="mt-1 text-sm text-foreground">Momentum, retro, and domain detail</div>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${weeklyOpen ? "rotate-180" : ""}`} />
            </div>
          </button>
          {weeklyOpen && (
            <div className="grid lg:grid-cols-2 gap-4">
              <MomentumPanel />
              <WeeklyRetro />
            </div>
          )}
        </section>
        </>
        )}
      </div>
    </AppShell>
  );
}

function CommandHero({ view, state }: { view: ReturnType<typeof buildDashboardViewModel>; state: BehaviouralState | null }) {
  return (
    <Card className="panel p-5 md:p-6 border-primary/40 bg-primary/5 mobile-safe-card">
      <div className="flex items-start justify-between gap-4 flex-wrap min-w-0">
        <div className="min-w-0 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Zone 1 // {view.commandSummary.label}</span>
            <span className="rounded-sm border border-border bg-background/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              {view.dashboardStatus.replace(/_/g, " ")}
            </span>
            {state && <StateBadge state={state} />}
          </div>
          <h2 className="mt-3 text-xl md:text-2xl font-semibold leading-tight text-wrap-safe">{view.commandSummary.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl text-wrap-safe">
            <span className="text-foreground">Next best action:</span> {view.commandSummary.nextBestAction}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to={view.commandSummary.primaryHref}><Button size="sm">{view.commandSummary.primaryCta}<ArrowRight className="h-3.5 w-3.5 ml-1.5" /></Button></Link>
          <Link to={view.commandSummary.secondaryHref}><Button size="sm" variant="outline">{view.commandSummary.secondaryCta}</Button></Link>
        </div>
      </div>
      <div className="mt-4 hidden md:grid md:grid-cols-3 gap-2">
        <CommandSignal icon={<Target />} label="Proof required" value={view.commandSummary.proofRequired} />
        <CommandSignal icon={<ShieldAlert />} label="Highest risk" value={view.commandSummary.highestRisk} />
        <CommandSignal icon={<Radar />} label="Future path" value={`${view.futureSummary.primaryPath.replace(/_/g, " ")} - ${view.futureSummary.confidenceLevel}`} />
      </div>
    </Card>
  );
}

function EvidenceCommandPanel({
  view,
  pending,
  recent,
  topPending,
  latestArtifact,
}: {
  view: ReturnType<typeof buildDashboardViewModel>;
  pending: any[];
  recent: any[];
  topPending: any;
  latestArtifact: any;
}) {
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);
  const mobileLimit = mobileRecentProofLimit(recent.length, showAllRecent);
  const desktopLimit = Math.min(recent.length, 4);
  return (
    <section className="space-y-3">
      <SectionHeader eyebrow="Zone 3" title="Evidence" detail={`${view.evidenceSummary.weekArtifacts} this week`} />
      <Card className="panel p-4 md:p-5 border-border/80 bg-card/50 mobile-safe-card">
        <div className="grid grid-cols-3 gap-2">
          <MetricCell label="Artifacts" value={String(view.evidenceSummary.weekArtifacts)} />
          <MetricCell label="Strong+" value={String(view.evidenceSummary.strongCount + view.evidenceSummary.eliteCount)} />
          <MetricCell label="Avg" value={String(view.evidenceSummary.averageScore)} />
        </div>

        <div className="mt-4 grid gap-3">
          <EvidenceBlock icon={<FileText />} label="Pending proof" action="Submit" href="/proof">
            {topPending ? `${topPending.title} - ${topPending.required_artifact ?? "artifact required"}` : "No active contract. Open Coach to forge one."}
          </EvidenceBlock>
          <div className={`${showSecondary ? "grid" : "hidden"} md:grid gap-3`}>
            <EvidenceBlock icon={<Gavel />} label="Latest verdict" action="Court" href="/proof">
              {latestArtifact ? `${latestArtifact.title} - ${latestArtifact.evidence_strength ?? "unscored"}` : "Court of Evidence is empty."}
            </EvidenceBlock>
            <EvidenceBlock icon={<CircleDot />} label="Domain signal" action="Modes" href="/modes">
              {view.evidenceSummary.strongestDomain
                ? `Strongest: ${view.evidenceSummary.strongestDomain}. Weakest: ${view.evidenceSummary.weakestDomain ?? "none flagged"}.`
                : "No weekly domain signal yet."}
            </EvidenceBlock>
          </div>
          <button
            type="button"
            onClick={() => setShowSecondary((open) => !open)}
            className="md:hidden font-mono text-[10px] uppercase tracking-widest text-primary hover:underline self-start"
          >
            {showSecondary ? "Hide verdict & domain" : "Show verdict & domain"}
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Recent proof</div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No proof logged yet. The system has no evidence.</p>
          ) : (
            <>
              {recent.slice(0, desktopLimit).map((proof, idx) => (
                <div
                  key={proof.id}
                  className={`flex items-center justify-between gap-3 rounded-sm border border-border px-3 py-2 ${idx >= mobileLimit ? "hidden md:flex" : "flex"}`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm">{proof.title}</div>
                    <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{proof.domain}</div>
                  </div>
                  {proof.evidence_strength && <EvidenceStrengthBadge strength={proof.evidence_strength} score={proof.quality_score} />}
                </div>
              ))}
              {recent.length > mobileLimit && (
                <button
                  type="button"
                  onClick={() => setShowAllRecent((open) => !open)}
                  className="md:hidden mt-1 font-mono text-[10px] uppercase tracking-widest text-primary hover:underline self-start"
                >
                  {showAllRecent ? "Show fewer" : `Show recent proof (${recent.length - mobileLimit} more)`}
                </button>
              )}
            </>
          )}
        </div>

        {pending.length > 1 && (
          <Link to="/proof" className="mt-3 inline-flex items-center gap-1 text-xs font-mono text-primary hover:underline">
            {pending.length} pending contracts <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </Card>
    </section>
  );
}

function QuickCheckInCard({
  quick,
  setQuick,
  mode,
  state,
  onDiagnose,
}: {
  quick: string;
  setQuick: (value: string) => void;
  mode: Mode | null;
  state: BehaviouralState | null;
  onDiagnose: () => void;
}) {
  return (
    <Card className="panel p-4 border-border/80 bg-card/50">
      <div className="flex items-center gap-2">
        <Crosshair className="h-4 w-4 text-primary" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Quick check-in</span>
      </div>
      <Textarea
        placeholder="Name the bottleneck. Real input beats polished intent."
        value={quick}
        onChange={(e) => setQuick(e.target.value)}
        className="mt-3 h-24"
      />
      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {mode && <ModeBadge mode={mode} />}
          {state && <StateBadge state={state} />}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onDiagnose}>Diagnose</Button>
          <Link to={`/coach?prompt=${encodeURIComponent(quick)}`}><Button size="sm">Coach</Button></Link>
        </div>
      </div>
      {state && (
        <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-3">
          <span className="text-foreground">{STATE_LABELS[state] ?? state}:</span> {STATE_PRESCRIPTION[state]}
        </p>
      )}
    </Card>
  );
}

function SectionHeader({ eyebrow, title, detail }: { eyebrow: string; title: string; detail?: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{eyebrow}</div>
        <h2 className="text-sm font-semibold mt-0.5">{title}</h2>
      </div>
      {detail && <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{detail}</span>}
    </div>
  );
}

function CommandSignal({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-sm border border-primary/20 bg-background/30 p-3 min-w-0">
      <div className="flex items-center gap-1.5 text-primary [&_svg]:h-3.5 [&_svg]:w-3.5">
        {icon}
        <span className="font-mono text-[9px] uppercase tracking-widest">{label}</span>
      </div>
      <div className="mt-1 text-sm leading-snug line-clamp-2">{value}</div>
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-background/30 p-2 min-w-0 max-w-full">
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-sm text-foreground">{value}</div>
    </div>
  );
}

function EvidenceBlock({ icon, label, action, href, children }: { icon: ReactNode; label: string; action: string; href: string; children: ReactNode }) {
  return (
    <div className="rounded-sm border border-border bg-background/30 p-3 min-w-0 max-w-full">
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-1.5 text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">
          {icon}
          <span className="font-mono text-[9px] uppercase tracking-widest">{label}</span>
        </div>
        <Link to={href} className="font-mono text-[10px] uppercase tracking-widest text-primary hover:underline shrink-0">{action}</Link>
      </div>
      <div className="mt-1 text-sm leading-snug text-foreground text-wrap-safe">{children}</div>
    </div>
  );
}

function EmptyPanel({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <Card className="panel p-4 border-border/80 bg-card/50">
      <div className="flex items-start gap-2 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
        {icon}
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest">{title}</div>
          <p className="mt-1 text-sm">{body}</p>
        </div>
      </div>
    </Card>
  );
}
