import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { EvidenceStrength } from "@/lib/eblocki/proof-scoring";
import { verdictIdentityImpact } from "@/lib/eblocki/verdict-identity-impact";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EvidenceStrengthBadge, ModeBadge, StateBadge } from "@/components/eblocki/Badges";
import {
  ArrowRight,
  CircleDot,
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
import { TemporalCommandCard } from "@/components/eblocki/TemporalCommandCard";
import { ProductMatchPanel } from "@/components/eblocki/ProductMatchPanel";
import { InterestSignalCard } from "@/components/eblocki/InterestSignalCard";
import { DashboardForecastTabs } from "@/components/eblocki/DashboardForecastTabs";
import { IdentityLedger } from "@/components/eblocki/IdentityLedger";
import { computeTemporal, type LedgerLike, type ProofArtifactLike, type TemporalResult, type VerdictLike } from "@/lib/eblocki/temporal-engine";
import {
  buildDashboardViewModel,
  type DashboardCoachRow,
  type DashboardCommitmentRow,
  type DashboardDailySheetRow,
  type DashboardProofRow,
} from "@/lib/eblocki/dashboard-view-model";
import { mobileRecentProofLimit } from "@/lib/eblocki/mobile-disclosure";
import { logEvent } from "@/lib/eblocki/analytics";
import { buildProofEntryHref } from "@/lib/eblocki/first-proof";
import { isSameLocalDay, localDayKey } from "@/lib/eblocki/local-day";
import { ProofWeekPanel } from "@/components/eblocki/ProofWeekPanel";
import { ProofClosureCard } from "@/components/eblocki/ProofClosureCard";
import { MobileCollapse } from "@/components/eblocki/MobileCollapse";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEntitlement } from "@/hooks/useEntitlement";
import { hasProofOnDate, plainEvidenceStrength } from "@/lib/eblocki/user-facing-copy";
import { EblockiLogo } from "@/components/eblocki/EblockiLogo";

const EVIDENCE_STRENGTHS: EvidenceStrength[] = ["weak", "moderate", "strong", "elite"];

type UserModeRow = Pick<Tables<"user_modes">, "mode_id">;
type DashboardArtifactRow = DashboardProofRow & ProofArtifactLike;

function isEvidenceStrength(value: string | null | undefined): value is EvidenceStrength {
  return EVIDENCE_STRENGTHS.includes(value as EvidenceStrength);
}

export default function Dashboard() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { accessLevel } = useEntitlement();
  const [welcomeCheck, setWelcomeCheck] = useState<"checking" | "needs" | "ok">("checking");
  const [today, setToday] = useState<DashboardDailySheetRow | null>(null);
  const [pending, setPending] = useState<DashboardCommitmentRow[]>([]);
  const [recent, setRecent] = useState<DashboardProofRow[]>([]);
  const [recentCoach, setRecentCoach] = useState<DashboardCoachRow[]>([]);
  const [allArtifacts, setAllArtifacts] = useState<DashboardArtifactRow[]>([]);
  const [verdicts, setVerdicts] = useState<VerdictLike[]>([]);
  const [ledger, setLedger] = useState<LedgerLike[]>([]);
  const [activeDomains, setActiveDomains] = useState<string[]>([]);
  const [quick, setQuick] = useState("");
  const [mode, setMode] = useState<Mode | null>(null);
  const [state, setStateBadge] = useState<BehaviouralState | null>(null);
  const [diagnosticsTab, setDiagnosticsTab] = useState("forecast");
  const [queryFailed, setQueryFailed] = useState(false);
  const [dashboardLoaded, setDashboardLoaded] = useState(false);

  const todayISO = localDayKey();
  const artifactDates = useMemo(
    () => allArtifacts.map((artifact) => artifact.created_at).filter((value): value is string => !!value),
    [allArtifacts],
  );
  const proofToday = useMemo(
    () => hasProofOnDate(allArtifacts, todayISO),
    [allArtifacts, todayISO],
  );
  const todayArtifact = useMemo(
    () => allArtifacts.find((artifact) => isSameLocalDay(artifact.created_at, todayISO)) ?? null,
    [allArtifacts, todayISO],
  );

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
      setDashboardLoaded(false);
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
        setActiveDomains(((modesRes.data ?? []) as UserModeRow[]).map((row) => row.mode_id));
        setVerdicts(verdictRes.data ?? []);
        setLedger(ledgerRes.data ?? []);
        setQueryFailed(Boolean(dcsRes.error || pcRes.error || paRes.error || ciRes.error || allRes.error || modesRes.error || verdictRes.error || ledgerRes.error));
        setDashboardLoaded(true);
      } catch {
        if (!cancelled) {
          setQueryFailed(true);
          setDashboardLoaded(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user, todayISO]);

  useEffect(() => {
    if (!user || welcomeCheck !== "ok" || allArtifacts.length !== 0) return;
    void logEvent("activation_dashboard_zero_state_seen", {
      route: "/dashboard",
      source: "today",
    });
  }, [user, welcomeCheck, allArtifacts.length]);

  useEffect(() => {
    if (!user || allArtifacts.length === 0) return;
    const latestCreatedAt = allArtifacts[0]?.created_at;
    if (!latestCreatedAt || isSameLocalDay(latestCreatedAt, todayISO)) return;
    void logEvent("activation_day_2_return_seen", {
      route: "/dashboard",
      source: "today",
    });
  }, [user, allArtifacts, todayISO]);

  const currentMode = recentCoach[0]?.mode ?? null;
  const currentState = ((today?.state as BehaviouralState | null) ?? (recentCoach[0]?.state_detected as BehaviouralState | null) ?? null);
  const topPending = pending[0];
  const latestArtifact = recent[0];
  const temporalArtifacts = allArtifacts.filter(
    (artifact): artifact is DashboardArtifactRow => typeof artifact.created_at === "string",
  );

  const temporalResult = useMemo<TemporalResult | null>(() => {
    try {
      return computeTemporal({
        artifacts: temporalArtifacts,
        verdicts,
        ledger,
        activeDomains,
        state: currentState,
      });
    } catch {
      return null;
    }
  }, [temporalArtifacts, verdicts, ledger, activeDomains, currentState]);

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
  const hasProofToday = view.evidenceSummary.proofsTodayCount > 0;
  const submitProofHref = buildProofEntryHref({
    firstProof: allArtifacts.length === 0,
    uglyStart: !hasProofToday,
  });

  const handleCheckIn = () => {
    if (!quick.trim()) return;
    setMode(detectMode(quick).primary);
    setStateBadge(detectState(quick));
  };

  const openDiagnosticsTab = (tabName: string) => {
    setDiagnosticsTab(tabName);
    logEvent("dashboard_section_opened", { sectionName: `diagnostics_${tabName}` });
  };

  if (dashboardLoaded && welcomeCheck === "needs" && allArtifacts.length === 0) {
    return <Navigate to="/welcome" replace />;
  }

  return (
    <AppShell>
      <Seo
        title="Dashboard | EBLOCKI"
        description="Today surface: next proof, verdict, progress, and deeper analysis."
        path="/dashboard"
      />
      <div className="mobile-safe-page p-4 md:p-8 max-w-6xl mx-auto space-y-5">
        <header className="flex items-end justify-between gap-4 flex-wrap min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <EblockiLogo variant="mark" size="md" />
            <div className="min-w-0">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Today
              </span>
              <h1 className="text-2xl md:text-3xl font-semibold mt-1">
                Today
              </h1>
            </div>
          </div>
          {!isMobile && (
            <div className="flex gap-2 flex-wrap">
              <Link to={submitProofHref}><Button size="sm"><Gavel className="h-3.5 w-3.5 mr-1.5" />Submit proof</Button></Link>
              {hasProofToday && allArtifacts.length > 0 && (
                <>
                  <Link to="/coach"><Button size="sm" variant="outline"><MessageSquare className="h-3.5 w-3.5 mr-1.5" />Coach</Button></Link>
                  <Link to="/start-today?plan=1"><Button size="sm" variant="outline"><Sparkles className="h-3.5 w-3.5 mr-1.5" />Plan</Button></Link>
                  <Link to="/modes"><Button size="sm" variant="outline"><Layers className="h-3.5 w-3.5 mr-1.5" />Modes</Button></Link>
                </>
              )}
            </div>
          )}
        </header>

        {isMobile && (
          <ProofClosureCard
            view={view}
            proofToday={proofToday}
            hasAnyProof={allArtifacts.length > 0}
            todayArtifact={todayArtifact}
            todayISO={todayISO}
          />
        )}

        {activeDomains.length === 0 && (
          isMobile ? (
            <MobileCollapse
              eyebrow="Setup"
              label="Modes not set up"
              trackId="dashboard_modes_setup"
            >
              <Card className="panel p-4 border-primary/30 bg-primary/5 mobile-safe-card min-w-0 max-w-full">
                <p className="text-sm text-muted-foreground break-words">
                  Add at least one mode so proof routes to the right standard. You can still submit proof now.
                </p>
                <Link to="/modes" className="mt-3 inline-block w-full">
                  <Button size="default" variant="outline" className="w-full min-h-[44px] native-tap">
                    Set up modes
                  </Button>
                </Link>
              </Card>
            </MobileCollapse>
          ) : (
            <Card className="panel p-4 border-primary/30 bg-primary/5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Modes not set up</div>
                  <p className="text-sm mt-1 text-muted-foreground">Add at least one mode so proof routes to the right standard.</p>
                </div>
                <Link to="/modes"><Button size="sm">Set up modes</Button></Link>
              </div>
            </Card>
          )
        )}

        {!isMobile && allArtifacts.length > 0 && (
          <CommandHero view={view} state={currentState} latestEvidenceStrength={latestArtifact?.evidence_strength} />
        )}

        {!isMobile && allArtifacts.length === 0 && (
          <Card className="panel p-5 md:p-6 border-primary/40 bg-primary/5 mobile-safe-card">
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
              Start here
            </div>
            <h2 className="mt-2 text-xl md:text-2xl font-semibold leading-tight text-wrap-safe">
              Submit your first proof.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground text-wrap-safe">
              Eblocki will tell you what counted, what was weak, and what to do next.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:flex-wrap">
              <Link to={submitProofHref} className="w-full sm:w-auto">
                <Button
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    void logEvent("activation_landing_primary_cta_clicked", {
                      route: "/dashboard",
                      destination: submitProofHref,
                      ctaName: "dashboard_submit_first_proof",
                    });
                  }}
                >
                  Submit first proof
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </Link>
              <Link to="/proof-week" className="w-full sm:w-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    void logEvent("activation_landing_primary_cta_clicked", {
                      route: "/dashboard",
                      destination: "/proof-week",
                      ctaName: "dashboard_see_what_counts",
                    });
                  }}
                >
                  See what counts
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {isMobile ? (
          <MobileCollapse
            eyebrow="Proof Week"
            label="7-day proof challenge"
            trackId="proof_week_panel"
          >
            <ProofWeekPanel artifactDates={artifactDates} />
          </MobileCollapse>
        ) : (
          <ProofWeekPanel artifactDates={artifactDates} />
        )}

        {allArtifacts.length > 0 && (
          isMobile ? (
            <MobileCollapse
              eyebrow="Advanced"
              label="Forecast, stats, diagnostics"
              trackId="dashboard_advanced"
              onOpen={(id) => logEvent("dashboard_section_opened", { sectionName: id ?? "dashboard_advanced" })}
            >
              <div className="space-y-5">
                <EvidenceCommandPanel
                  view={view}
                  pending={pending}
                  recent={recent}
                  topPending={topPending}
                  latestArtifact={latestArtifact}
                />
              </div>
            </MobileCollapse>
          ) : (
          <>
            <EvidenceCommandPanel
              view={view}
              pending={pending}
              recent={recent}
              topPending={topPending}
              latestArtifact={latestArtifact}
            />

            <DashboardForecastTabs
              value={diagnosticsTab}
              onValueChange={openDiagnosticsTab}
              forecastSlot={
                <>
                  {temporalResult ? (
                    <TemporalCommandCard result={temporalResult} />
                  ) : (
                    <EmptyPanel icon={<Radar />} title="Forecast standby" body={view.emptyStateMessage} />
                  )}
                  <TemporalFeedbackPanel />
                  <InterventionCard state={(currentState as BehaviouralState) ?? state} />
                </>
              }
              evidenceSlot={
                <>
                  {user && <IdentityLedger userId={user.id} limit={5} />}
                  <div className="grid lg:grid-cols-2 gap-4">
                    <MomentumPanel />
                    <WeeklyRetro />
                  </div>
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
                        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Current setup</div>
                        <p className="mt-1 text-sm text-muted-foreground text-wrap-safe">
                          {currentMode ? `Last coach lens: ${MODE_LABELS[currentMode as Mode] ?? currentMode}` : "No coach diagnostic yet."}
                        </p>
                      </div>
                      {currentState && <StateBadge state={currentState as BehaviouralState} />}
                    </div>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <MetricCell label="Mode count" value={String(view.evidenceSummary.modesCount)} />
                      <MetricCell label="Latest proof" value={view.evidenceSummary.latestProofTitle ?? "none"} />
                      <MetricCell label="Weak spot" value={view.evidenceSummary.weakestDomain ?? "clear"} />
                    </div>
                  </Card>
                </>
              }
              auditSlot={
                <>
                  <TemporalIntelligencePanel />
                  <TemporalModelAuditPanel />
                  <div className="space-y-3">
                    <ProductMatchPanel
                      artifacts={allArtifacts}
                      temporal={temporalResult}
                      accessLevel={accessLevel}
                      operatingProfile={{
                        primaryDomain: activeDomains[0] ?? null,
                        recommendationsAllowed: true,
                        trustPreference: "neutral",
                      }}
                    />
                    <InterestSignalCard />
                  </div>
                </>
              }
            />
          </>
          )
        )}
      </div>
    </AppShell>
  );
}

export function CommandHero({
  view,
  state,
  latestEvidenceStrength,
}: {
  view: ReturnType<typeof buildDashboardViewModel>;
  state: BehaviouralState | null;
  latestEvidenceStrength?: string | null;
}) {
  const secondaryLabel = view.commandSummary.secondaryHref === "/coach" ? "Open coach" : "Plan today";
  const identityImpact = isEvidenceStrength(latestEvidenceStrength)
    ? verdictIdentityImpact(latestEvidenceStrength)
    : null;
  return (
    <Card className="panel p-5 md:p-6 border-primary/40 bg-primary/5 mobile-safe-card">
      <div className="flex items-start justify-between gap-4 flex-wrap min-w-0">
        <div className="min-w-0 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Today // Next step</span>
            <span className="rounded-sm border border-border bg-background/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              {view.dashboardStatus.replace(/_/g, " ")}
            </span>
            {state && <StateBadge state={state} />}
          </div>
          <h2 className="mt-3 text-xl md:text-2xl font-semibold leading-tight text-wrap-safe">{view.commandSummary.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl text-wrap-safe">
            <span className="text-foreground">After this proof:</span> {view.commandSummary.nextBestAction}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:flex-wrap">
          <Link to={view.commandSummary.primaryHref} className="w-full sm:w-auto">
            <Button size="sm" className="w-full sm:w-auto">
              Submit proof<ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </Link>
          <Link to={view.commandSummary.secondaryHref} className="w-full sm:w-auto">
            <Button size="sm" variant="outline" className="w-full sm:w-auto">
              {secondaryLabel}
            </Button>
          </Link>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <CommandSignal icon={<Target />} label="Proof required" value={view.commandSummary.proofRequired} />
        <CommandSignal icon={<ShieldAlert />} label="Risk if ignored" value={view.commandSummary.highestRisk} />
        <CommandSignal
          icon={<Gavel />}
          label="Latest verdict"
          value={view.commandLayer.latestCourtSignal}
          hint={identityImpact?.headline}
        />
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
  pending: DashboardCommitmentRow[];
  recent: DashboardProofRow[];
  topPending: DashboardCommitmentRow | undefined;
  latestArtifact: DashboardProofRow | undefined;
}) {
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);
  const mobileLimit = mobileRecentProofLimit(recent.length, showAllRecent);
  const desktopLimit = Math.min(recent.length, 4);
  return (
    <section className="space-y-3">
      <SectionHeader eyebrow="Proof" title="Recent proof" detail={`${view.evidenceSummary.weekArtifacts} this week`} />
      <Card className="panel p-4 md:p-5 border-border/80 bg-card/50 mobile-safe-card">
        <div className="grid grid-cols-3 gap-2">
          <MetricCell label="Artifacts" value={String(view.evidenceSummary.weekArtifacts)} />
          <MetricCell label="Strong+" value={String(view.evidenceSummary.strongCount + view.evidenceSummary.eliteCount)} />
          <MetricCell label="Avg" value={String(view.evidenceSummary.averageScore)} />
        </div>

        <div className="mt-4 grid gap-3">
          <EvidenceBlock icon={<FileText />} label="Next proof" action="Submit" href="/proof">
            {topPending ? `${topPending.title} - ${topPending.required_artifact ?? "artifact required"}` : "No active contract. Open coach to forge one."}
          </EvidenceBlock>
          <div className={`${showSecondary ? "grid" : "hidden"} md:grid gap-3`}>
            <EvidenceBlock icon={<Gavel />} label="Last verdict" action="Open" href="/proof">
              {latestArtifact
                ? `${latestArtifact.title} - ${plainEvidenceStrength(latestArtifact.evidence_strength)}`
                : "No proof yet. Submit one artifact to start the verdict loop."}
            </EvidenceBlock>
            <EvidenceBlock icon={<CircleDot />} label="Weak spot" action="Modes" href="/modes">
              {view.evidenceSummary.strongestDomain
                ? `Strongest: ${view.evidenceSummary.strongestDomain}. Weakest: ${view.evidenceSummary.weakestDomain ?? "none flagged"}.`
                : "No weekly mode signal yet."}
            </EvidenceBlock>
          </div>
          <button
            type="button"
            onClick={() => setShowSecondary((open) => !open)}
            className="md:hidden font-mono text-[10px] uppercase tracking-widest text-primary hover:underline self-start"
          >
            {showSecondary ? "Hide last verdict" : "Show last verdict"}
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Recent proof</div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No proof logged yet. Submit one artifact to start the record.</p>
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
                  {isEvidenceStrength(proof.evidence_strength) && <EvidenceStrengthBadge strength={proof.evidence_strength} score={proof.quality_score ?? undefined} />}
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
            {pending.length} pending proof contracts <ArrowRight className="h-3 w-3" />
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

function CommandSignal({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-sm border border-primary/20 bg-background/30 p-3 min-w-0">
      <div className="flex items-center gap-1.5 text-primary [&_svg]:h-3.5 [&_svg]:w-3.5">
        {icon}
        <span className="font-mono text-[9px] uppercase tracking-widest">{label}</span>
      </div>
      <div className="mt-1 text-sm leading-snug line-clamp-2">{value}</div>
      {hint && (
        <div
          className="mt-1 text-xs leading-snug text-muted-foreground line-clamp-1 break-words"
          data-testid="dashboard-verdict-identity-impact"
        >
          {hint}
        </div>
      )}
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
