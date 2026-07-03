import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Seo } from "@/components/Seo";
import { computeCalibration, FLAG_LABELS, type CalibrationFlag } from "@/lib/eblocki/calibration";

interface Funnel {
  totalUsers: number;
  completedOnboarding: number;
  seenWelcome: number;
  firstProof: number;
  day1Retained: number;
  day3Retained: number;
  day7Retained: number;
}

interface Retention {
  nudgesSent: number;
  nudgesDelivered: number;
  nudgesFailed: number;
  nudgesSuppressed: number;
  proofWithin2h: number;
  proofWithin24h: number;
  followThroughRate: number | null;        // proofWithin24h / nudgesSent
  avgMinutesToProof: number | null;
  fatigueRatio: number | null;             // dailyAvgPerUser / cap
  rescueSuccess: number | null;            // streak_at_risk → proof within 24h
  recoverySuccess: number | null;          // recovery → proof within 24h
}

/**
 * Beta-only admin dashboard. Aggregate views — no raw reflection text.
 * Powered entirely by client-side selects gated behind `has_role(admin)`.
 */
export default function BetaAdmin() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [loading, setLoading] = useState(true);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [avgQuality, setAvgQuality] = useState<number | null>(null);
  const [reflectionRate, setReflectionRate] = useState<number | null>(null);
  const [modePopularity, setModePopularity] = useState<Array<{ mode: string; count: number }>>([]);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [calibrationCounts, setCalibrationCounts] = useState<Record<CalibrationFlag, number>>({} as any);
  const [topFeedback, setTopFeedback] = useState<Array<{ kind: string; body: string; route: string | null; created_at: string }>>([]);
  const [retention, setRetention] = useState<Retention | null>(null);

  useEffect(() => {
    if (!user || !isAdmin) return;
    void (async () => {
      setLoading(true);
      try {
        const sinceDay7 = new Date(Date.now() - 7 * 864e5).toISOString();
        const sinceDay3 = new Date(Date.now() - 3 * 864e5).toISOString();
        const sinceDay1 = new Date(Date.now() - 1 * 864e5).toISOString();

        const [profiles, proofs, objectives, modes, events, feedback, notifs, delivery] = await Promise.all([
          supabase.from("user_onboarding_profiles").select("user_id, completed_onboarding, seen_welcome, created_at"),
          supabase.from("proof_artifacts").select("user_id, quality_score, created_at"),
          supabase.from("daily_objectives").select("user_id, status, resistance_level, completion_proof_text, completion_quality_self_rating, objective_date"),
          supabase.from("user_modes").select("mode_id, is_active"),
          supabase.from("analytics_events").select("event, user_id, created_at"),
          supabase.from("beta_feedback").select("kind, body, route, created_at").order("created_at", { ascending: false }).limit(20),
          supabase.from("notification_log").select("user_id, kind, sent_at, delivery_status, failure_reason"),
          supabase.from("push_delivery_log").select("user_id, status, attempted_at"),
        ]);

        const profileRows = profiles.data ?? [];
        const proofRows = proofs.data ?? [];
        const objectiveRows = objectives.data ?? [];
        const modeRows = modes.data ?? [];
        const eventRows = events.data ?? [];

        // Funnel
        const usersWithProof = new Set(proofRows.map((p) => p.user_id));
        const usersActiveDay1 = new Set(eventRows.filter((e) => e.created_at >= sinceDay1).map((e) => e.user_id));
        const usersActiveDay3 = new Set(eventRows.filter((e) => e.created_at >= sinceDay3).map((e) => e.user_id));
        const usersActiveDay7 = new Set(eventRows.filter((e) => e.created_at >= sinceDay7).map((e) => e.user_id));
        setFunnel({
          totalUsers: profileRows.length,
          completedOnboarding: profileRows.filter((p) => p.completed_onboarding).length,
          seenWelcome: profileRows.filter((p) => p.seen_welcome).length,
          firstProof: usersWithProof.size,
          day1Retained: usersActiveDay1.size,
          day3Retained: usersActiveDay3.size,
          day7Retained: usersActiveDay7.size,
        });

        // Quality
        const qScores = proofRows.map((p) => p.quality_score).filter((n) => typeof n === "number") as number[];
        setAvgQuality(qScores.length ? qScores.reduce((a, b) => a + b, 0) / qScores.length : null);

        // Reflection rate (completed objectives with proof text)
        const completedObj = objectiveRows.filter((o) => o.status === "completed");
        const withReflection = completedObj.filter((o) => (o.completion_proof_text ?? "").length >= 12);
        setReflectionRate(completedObj.length ? withReflection.length / completedObj.length : null);

        // Mode popularity
        const modeMap = new Map<string, number>();
        modeRows.filter((m: any) => m.is_active).forEach((m: any) => {
          modeMap.set(m.mode_id, (modeMap.get(m.mode_id) ?? 0) + 1);
        });
        setModePopularity([...modeMap.entries()].map(([mode, count]) => ({ mode, count })).sort((a, b) => b.count - a.count));

        // Event counts
        const ec: Record<string, number> = {};
        eventRows.forEach((e) => {
          ec[e.event] = (ec[e.event] ?? 0) + 1;
        });
        setEventCounts(ec);

        // Calibration flags per user → counts
        const userIds = new Set<string>(profileRows.map((p) => p.user_id));
        const flagCounts = {} as Record<CalibrationFlag, number>;
        for (const uid of userIds) {
          const userProofs = proofRows.filter((p) => p.user_id === uid).map((p) => ({ quality_score: p.quality_score, created_at: p.created_at }));
          const userObjs = objectiveRows.filter((o) => o.user_id === uid).map((o) => ({ status: o.status, resistance_level: o.resistance_level, completion_proof_text: o.completion_proof_text }));
          const userEvents = eventRows.filter((e) => e.user_id === uid);
          const coachCalls = userEvents.filter((e) => e.event === "coach_called").length;
          const capOpened = userEvents.filter((e) => e.event === "proof_capture_opened").length;
          const capDone = userEvents.filter((e) => e.event === "proof_capture_completed").length;
          const qSubset = userProofs.map((p) => p.quality_score).filter((n) => typeof n === "number") as number[];
          const days = new Set(userObjs.map((o: any) => o.objective_date)).size || 1;
          const flags = computeCalibration({
            proofs: userProofs,
            objectives: userObjs as any,
            coachInteractions: coachCalls,
            capturesOpened: capOpened,
            capturesCompleted: capDone,
            streakDays: 0,
            avgQuality: qSubset.length ? qSubset.reduce((a, b) => a + b, 0) / qSubset.length : null,
            objectivesPerDay: userObjs.length / days,
          });
          for (const f of flags) {
            flagCounts[f.flag] = (flagCounts[f.flag] ?? 0) + 1;
          }
        }
        setCalibrationCounts(flagCounts);

        setTopFeedback((feedback.data ?? []) as any);

        // ───── Retention observation (read-only; never auto-tunes anything) ─────
        const notifRows = (notifs.data ?? []) as Array<{ user_id: string; kind: string; sent_at: string; delivery_status: string | null; failure_reason: string | null }>;
        const deliveryRows = (delivery.data ?? []) as Array<{ user_id: string; status: string; attempted_at: string }>;
        const allProofs = proofRows.map((p) => ({ user_id: p.user_id, ts: new Date(p.created_at).getTime() }));

        const nudgesSent = notifRows.length;
        const nudgesDelivered = deliveryRows.filter((d) => d.status === "sent" || d.status === "delivered").length;
        const nudgesFailed = deliveryRows.filter((d) => d.status === "failed").length;
        const nudgesSuppressed = deliveryRows.filter((d) => d.status === "suppressed" || d.status === "disabled").length;

        let within2h = 0;
        let within24h = 0;
        let totalMinutes = 0;
        let measured = 0;
        let rescueAttempts = 0, rescueHits = 0;
        let recoveryAttempts = 0, recoveryHits = 0;

        for (const n of notifRows) {
          const sentMs = new Date(n.sent_at).getTime();
          const userProofsAfter = allProofs
            .filter((p) => p.user_id === n.user_id && p.ts > sentMs)
            .map((p) => p.ts - sentMs)
            .sort((a, b) => a - b);
          const first = userProofsAfter[0];
          if (first !== undefined) {
            if (first <= 2 * 3600_000) within2h++;
            if (first <= 24 * 3600_000) {
              within24h++;
              totalMinutes += first / 60_000;
              measured++;
              if (n.kind === "streak_at_risk") rescueHits++;
              if (n.kind === "recovery") recoveryHits++;
            }
          }
          if (n.kind === "streak_at_risk") rescueAttempts++;
          if (n.kind === "recovery") recoveryAttempts++;
        }

        // Fatigue = avg nudges/active-user/day relative to the daily cap (3).
        const perUser = new Map<string, Set<string>>();
        for (const n of notifRows) {
          const day = n.sent_at.slice(0, 10);
          const k = `${n.user_id}|${day}`;
          if (!perUser.has(n.user_id)) perUser.set(n.user_id, new Set());
          perUser.get(n.user_id)!.add(k);
        }
        const userDayCounts: number[] = [];
        for (const set of perUser.values()) userDayCounts.push(set.size);
        const avgPerUserDay = userDayCounts.length
          ? userDayCounts.reduce((a, b) => a + b, 0) / userDayCounts.length
          : 0;

        setRetention({
          nudgesSent,
          nudgesDelivered,
          nudgesFailed,
          nudgesSuppressed,
          proofWithin2h: within2h,
          proofWithin24h: within24h,
          followThroughRate: nudgesSent ? within24h / nudgesSent : null,
          avgMinutesToProof: measured ? Math.round(totalMinutes / measured) : null,
          fatigueRatio: avgPerUserDay > 0 ? avgPerUserDay / 3 : null,
          rescueSuccess: rescueAttempts ? rescueHits / rescueAttempts : null,
          recoverySuccess: recoveryAttempts ? recoveryHits / recoveryAttempts : null,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [user, isAdmin]);

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center text-xs text-muted-foreground">Checking access…</div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo title="Beta admin | EBLOCKI" description="Closed beta tuning dashboard." path="/dev/beta" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <Link to="/dashboard" className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Dashboard
        </Link>
        <header className="space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Beta admin</span>
          <h1 className="text-2xl sm:text-3xl font-semibold">Closed beta tuning</h1>
          <p className="text-sm text-muted-foreground">Aggregate signals only. Raw reflection content is intentionally not shown.</p>
        </header>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {funnel && (
          <Card className="panel p-4">
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Funnel</span>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <Stat label="Users" v={funnel.totalUsers} />
              <Stat label="Seen welcome" v={`${funnel.seenWelcome}/${funnel.totalUsers}`} />
              <Stat label="Completed onboarding" v={`${funnel.completedOnboarding}/${funnel.totalUsers}`} />
              <Stat label="First proof" v={`${funnel.firstProof}/${funnel.totalUsers}`} />
              <Stat label="Active 1d" v={funnel.day1Retained} />
              <Stat label="Active 3d" v={funnel.day3Retained} />
              <Stat label="Active 7d" v={funnel.day7Retained} />
              <Stat label="Avg proof quality" v={avgQuality !== null ? avgQuality.toFixed(1) : "—"} />
            </div>
          </Card>
        )}

        <Card className="panel p-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Reflection & coach</span>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <Stat label="Reflection completion" v={reflectionRate !== null ? `${Math.round(reflectionRate * 100)}%` : "—"} />
            <Stat label="Coach calls" v={eventCounts.coach_called ?? 0} />
            <Stat label="Capture opened" v={eventCounts.proof_capture_opened ?? 0} />
            <Stat label="Capture completed" v={eventCounts.proof_capture_completed ?? 0} />
            <Stat label="Capture rejected" v={eventCounts.proof_capture_rejected ?? 0} />
            <Stat label="Capture abandoned" v={eventCounts.proof_capture_abandoned ?? 0} />
            <Stat label="Notifications sent" v={eventCounts.notification_sent ?? 0} />
            <Stat label="Notifications suppressed" v={eventCounts.notification_suppressed ?? 0} />
          </div>
        </Card>

        {retention && (
          <Card className="panel p-4">
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Retention observation (read-only)</span>
            <p className="mt-1 text-[11px] text-muted-foreground">
              No auto-tuning. We watch, we don't optimise until 30+ days of data.
            </p>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <Stat label="Nudges sent" v={retention.nudgesSent} />
              <Stat label="Delivered" v={retention.nudgesDelivered} />
              <Stat label="Failed" v={retention.nudgesFailed} />
              <Stat label="Suppressed" v={retention.nudgesSuppressed} />
              <Stat label="Proof within 2h" v={retention.proofWithin2h} />
              <Stat label="Proof within 24h" v={retention.proofWithin24h} />
              <Stat label="Follow-through" v={retention.followThroughRate !== null ? `${Math.round(retention.followThroughRate * 100)}%` : "—"} />
              <Stat label="Avg min → proof" v={retention.avgMinutesToProof ?? "—"} />
              <Stat label="Fatigue (vs cap)" v={retention.fatigueRatio !== null ? `${Math.round(retention.fatigueRatio * 100)}%` : "—"} />
              <Stat label="Rescue success" v={retention.rescueSuccess !== null ? `${Math.round(retention.rescueSuccess * 100)}%` : "—"} />
              <Stat label="Recovery success" v={retention.recoverySuccess !== null ? `${Math.round(retention.recoverySuccess * 100)}%` : "—"} />
            </div>
          </Card>
        )}

        <Card className="panel p-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Calibration flags (users affected)</span>
          <ul className="mt-3 space-y-1.5 text-sm">
            {(Object.keys(FLAG_LABELS) as CalibrationFlag[]).map((f) => (
              <li key={f} className="flex justify-between items-center border-b border-border/40 pb-1.5">
                <span>{FLAG_LABELS[f]}</span>
                <span className="font-mono text-xs text-primary">{calibrationCounts[f] ?? 0}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="panel p-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Mode popularity (active)</span>
          {modePopularity.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No active modes yet.</p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm">
              {modePopularity.map((m) => (
                <li key={m.mode} className="flex justify-between font-mono text-xs">
                  <span>{m.mode}</span>
                  <span className="text-primary">{m.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="panel p-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Recent beta feedback</span>
          {topFeedback.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No feedback yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {topFeedback.map((f, i) => (
                <li key={i} className="border-b border-border/40 pb-2">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    <span className="text-primary">{f.kind}</span>
                    <span>{f.route ?? "—"} · {f.created_at.slice(0, 10)}</span>
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{f.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: number | string }) {
  return (
    <div className="rounded-md border border-border p-2.5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-mono text-lg text-primary mt-1">{v}</div>
    </div>
  );
}