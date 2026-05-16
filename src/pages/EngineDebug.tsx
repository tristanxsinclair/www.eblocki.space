import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useMomentum } from "@/hooks/useMomentum";
import { supabase } from "@/integrations/supabase/client";
import { runQAChecks, type QAWarning } from "@/lib/eblocki/qa-checks";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Seo } from "@/components/Seo";

/**
 * Admin-only behavioural engine inspector. Surfaces every signal the
 * coach + scheduler use to make decisions, plus QA warnings.
 */
export default function EngineDebug() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const { snapshot, refresh } = useMomentum();

  const [objectives, setObjectives] = useState<any[]>([]);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [coachOutputs, setCoachOutputs] = useState<string[]>([]);
  const [coachEscalation, setCoachEscalation] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<QAWarning[]>([]);

  const load = async () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const [oRes, aRes, nRes, cRes, mRes, oprRes] = await Promise.all([
      supabase.from("daily_objectives").select("id, title, status, completion_proof_text, completion_hard_part, objective_date, proof_commitment_id").eq("user_id", user.id).eq("objective_date", today),
      supabase.from("proof_artifacts").select("quality_score, content, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("notification_log").select("sent_at, dedup_key, kind, delivered, total_targets").eq("user_id", user.id).order("sent_at", { ascending: false }).limit(20),
      supabase.from("coach_interactions").select("assistant_output, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("user_modes").select("mode_id, is_default").eq("user_id", user.id).eq("is_active", true).order("is_default", { ascending: false }).limit(1),
      supabase.from("user_onboarding_profiles").select("timezone").eq("user_id", user.id).maybeSingle(),
    ]);
    setObjectives(oRes.data ?? []);
    setArtifacts(aRes.data ?? []);
    setNotifications(nRes.data ?? []);
    setCoachOutputs((cRes.data ?? []).map((r) => r.assistant_output ?? ""));
    setActiveMode(mRes.data?.[0]?.mode_id ?? null);
    setTimezone(oprRes.data?.timezone ?? null);
  };

  useEffect(() => { void load(); }, [user]);

  useEffect(() => {
    setWarnings(runQAChecks({
      snapshot,
      objectives,
      artifacts,
      notifications,
      timezone,
      recentCoachOutputs: coachOutputs,
    }));
  }, [snapshot, objectives, artifacts, notifications, timezone, coachOutputs]);

  // Detect coach escalation level from last interaction message overlap (rough proxy).
  useEffect(() => {
    if (coachOutputs.length < 2) { setCoachEscalation("first"); return; }
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").trim();
    setCoachEscalation(norm(coachOutputs[0]) === norm(coachOutputs[1]) ? "stuck (repeat detected)" : "active");
  }, [coachOutputs]);

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground font-mono text-xs">Loading…</div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const lastNotif = notifications[0];
  const proofsToday = artifacts.filter((a) => a.created_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
  const avgQuality = (() => {
    const scored = artifacts.filter((a) => typeof a.quality_score === "number");
    return scored.length ? (scored.reduce((s, a) => s + (a.quality_score ?? 0), 0) / scored.length).toFixed(1) : "—";
  })();

  const eligible = (() => {
    const last24h = notifications.filter((n) => Date.now() - new Date(n.sent_at).getTime() < 86_400_000).length;
    if (last24h >= 2) return "no — daily cap reached";
    if (!snapshot) return "no — no momentum snapshot";
    return `yes — ${2 - last24h} slot${2 - last24h === 1 ? "" : "s"} remaining`;
  })();

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
        <Seo title="Engine Debug" description="Behavioural engine inspector" path="/dev/engine" />
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> back
          </Link>
          <Button size="sm" variant="outline" onClick={async () => { await refresh(); await load(); }}>
            <RefreshCw className="h-3 w-3 mr-1" /> Refresh
          </Button>
        </div>

        <Card className="panel p-4 md:p-5">
          <h1 className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">Behavioural Engine</h1>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="Score" value={snapshot?.momentum_score ?? "—"} />
            <Stat label="State" value={snapshot?.state ?? "—"} />
            <Stat label="Streak" value={snapshot?.streak_days ?? "—"} />
            <Stat label="Freeze tokens" value={snapshot?.freeze_tokens ?? "—"} />
            <Stat label="Active mode" value={activeMode ?? "—"} />
            <Stat label="Proofs today" value={proofsToday} />
            <Stat label="Avg quality" value={avgQuality} />
            <Stat label="Coach escalation" value={coachEscalation ?? "—"} />
            <Stat label="Notif eligible" value={eligible} />
            <Stat label="Last notif" value={lastNotif ? `${lastNotif.kind} @ ${new Date(lastNotif.sent_at).toLocaleString()}` : "—"} />
            <Stat label="Timezone" value={timezone ?? "UTC (fallback)"} />
            <Stat label="Hours since proof" value={snapshot ? snapshot.hours_since_proof === Infinity ? "∞" : snapshot.hours_since_proof.toFixed(1) : "—"} />
          </div>
        </Card>

        <Card className="panel p-4 md:p-5">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">QA Warnings</h2>
          {warnings.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No anomalies. System invariants hold.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {warnings.map((w, i) => (
                <li key={i} className="text-sm flex gap-2 items-start">
                  <Badge variant={w.level === "error" ? "destructive" : "outline"} className="font-mono text-[9px] uppercase">
                    {w.level}
                  </Badge>
                  <span className="text-foreground/90"><code className="text-[11px] mr-2">{w.code}</code>{w.message}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="panel p-4 md:p-5">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">Recent Notifications</h2>
          {notifications.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No notifications logged.</p>
          ) : (
            <ul className="mt-3 space-y-1 text-xs font-mono">
              {notifications.map((n, i) => (
                <li key={i}>{new Date(n.sent_at).toLocaleString()} — {n.kind} — delivered {n.delivered}/{n.total_targets}</li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="panel p-4 md:p-5">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">Recent Coach Outputs</h2>
          {coachOutputs.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No coach interactions yet.</p>
          ) : (
            <ol className="mt-3 space-y-2 text-sm">
              {coachOutputs.map((o, i) => (
                <li key={i} className="border-l-2 border-primary/30 pl-3 text-foreground/90">{o}</li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-border rounded-md p-2">
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium truncate">{String(value)}</div>
    </div>
  );
}