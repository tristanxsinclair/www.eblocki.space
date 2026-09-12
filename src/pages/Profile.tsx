import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CalendarCheck2, CheckCircle2, Clock, FileText, Gavel, Settings, Target } from "lucide-react";
import { AppShell } from "@/components/eblocki/AppShell";
import { Seo } from "@/components/Seo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { localDayKey, isSameLocalDay } from "@/lib/eblocki/local-day";
import { plainEvidenceStrength } from "@/lib/eblocki/user-facing-copy";

type AccountProfile = Pick<Tables<"profiles">, "full_name" | "email" | "access_level">;
type OnboardingProfile = Pick<
  Tables<"user_onboarding_profiles">,
  "identity_summary" | "roles" | "goals" | "coaching_style" | "strictness_level" | "timezone"
>;
type ModeRow = Pick<Tables<"user_modes">, "mode_id" | "display_name" | "description" | "is_active">;
type ProofRow = Pick<Tables<"proof_artifacts">, "id" | "title" | "domain" | "evidence_strength" | "created_at" | "quality_score">;
type ObjectiveRow = Pick<Tables<"daily_objectives">, "id" | "title" | "status" | "proof_required" | "objective_date">;

export default function Profile() {
  const { user } = useAuth();
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [modes, setModes] = useState<ModeRow[]>([]);
  const [proofs, setProofs] = useState<ProofRow[]>([]);
  const [objectives, setObjectives] = useState<ObjectiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const today = localDayKey();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      supabase.from("profiles").select("full_name,email,access_level").eq("id", user.id).maybeSingle(),
      supabase
        .from("user_onboarding_profiles")
        .select("identity_summary,roles,goals,coaching_style,strictness_level,timezone")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_modes")
        .select("mode_id,display_name,description,is_active")
        .eq("user_id", user.id)
        .order("is_active", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("proof_artifacts")
        .select("id,title,domain,evidence_strength,created_at,quality_score")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("daily_objectives")
        .select("id,title,status,proof_required,objective_date")
        .eq("user_id", user.id)
        .gte("objective_date", today)
        .order("objective_date", { ascending: true })
        .limit(12),
    ])
      .then(([accountResult, profileResult, modesResult, proofsResult, objectivesResult]) => {
        if (cancelled) return;
        setAccount(accountResult.data ?? null);
        setProfile(profileResult.data ?? null);
        setModes(modesResult.data ?? []);
        setProofs(proofsResult.data ?? []);
        setObjectives(objectivesResult.data ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [today, user]);

  const displayName = useMemo(() => {
    const named = account?.full_name?.trim();
    if (named) return named;
    const emailName = user?.email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();
    return emailName || "Student";
  }, [account?.full_name, user?.email]);

  const activeModes = modes.filter((mode) => mode.is_active);
  const proofsToday = proofs.filter((proof) => isSameLocalDay(proof.created_at, today)).length;
  const strongProofs = proofs.filter((proof) => ["strong", "elite"].includes((proof.evidence_strength ?? "").toLowerCase())).length;
  const completedObjectives = objectives.filter((objective) => objective.status === "completed").length;
  const nextObjective = objectives.find((objective) => objective.status === "pending" || objective.status === "active") ?? null;
  const latestProof = proofs[0] ?? null;
  const roles = profile?.roles ?? [];
  const goals = profile?.goals ?? [];

  return (
    <AppShell>
      <Seo
        title="Profile | Eblocki"
        description="Your student profile: goals, study areas, proof record, and today's next move."
        path="/profile"
      />
      <div className="mobile-safe-page mx-auto flex max-w-6xl flex-col gap-5 p-4 md:p-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <span className="operator-label-signal">Student Profile</span>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-4xl">{displayName}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {profile?.identity_summary?.trim() ||
                "Your profile gets sharper as you add roles, goals, areas, and proof. Eblocki uses this context to keep today focused."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link to="/proof"><Gavel className="mr-1.5 h-4 w-4" />Log proof</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/settings"><Settings className="mr-1.5 h-4 w-4" />Edit</Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ProfileMetric icon={CalendarCheck2} label="Proof today" value={String(proofsToday)} />
          <ProfileMetric icon={FileText} label="Total proofs" value={String(proofs.length)} />
          <ProfileMetric icon={CheckCircle2} label="Strong+" value={String(strongProofs)} />
          <ProfileMetric icon={BookOpen} label="Active areas" value={String(activeModes.length)} />
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <Card className="panel rounded-2xl border-border/70 bg-card/60 p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="operator-label">Today</div>
                <h2 className="mt-1 text-xl font-semibold">Next useful move</h2>
              </div>
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-5 rounded-xl border border-border/70 bg-background/25 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {nextObjective ? "Queued task" : "No queued task"}
              </div>
              <p className="mt-2 text-base font-medium">
                {nextObjective?.title ?? "Open Today and create one proof-backed action."}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {nextObjective?.proof_required
                  ? "This one needs evidence before it can count."
                  : "Complete it only when the real work exists."}
              </p>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button asChild className="w-full">
                <Link to="/dashboard">Open Today</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/start-today">Plan next task</Link>
              </Button>
            </div>
          </Card>

          <Card className="panel rounded-2xl border-border/70 bg-card/60 p-5 md:p-6">
            <div className="operator-label">Account</div>
            <dl className="mt-4 grid gap-3 text-sm">
              <ProfileFact label="Email" value={account?.email ?? user?.email ?? "Not set"} />
              <ProfileFact label="Access" value={account?.access_level ?? "free"} />
              <ProfileFact label="Style" value={profile?.coaching_style ?? "direct"} />
              <ProfileFact label="Pressure" value={`${profile?.strictness_level ?? 7}/10`} />
              <ProfileFact label="Timezone" value={profile?.timezone ?? "browser default"} />
            </dl>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Card className="panel rounded-2xl border-border/70 bg-card/60 p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="operator-label">Areas</div>
                <h2 className="mt-1 text-lg font-semibold">What Eblocki knows you are working on</h2>
              </div>
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-4 grid gap-2">
              {activeModes.length === 0 ? (
                <EmptyLine text="No active areas yet. Add your subjects or commitments in Settings." />
              ) : (
                activeModes.slice(0, 5).map((mode) => (
                  <div key={mode.mode_id} className="rounded-xl border border-border/70 bg-background/25 p-3">
                    <div className="font-medium">{mode.display_name}</div>
                    {mode.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{mode.description}</p>}
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="panel rounded-2xl border-border/70 bg-card/60 p-5 md:p-6">
            <div className="operator-label">Goals</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[...roles, ...goals].length === 0 ? (
                <EmptyLine text="Add roles and goals so the coach can speak to your actual student life." />
              ) : (
                [...roles, ...goals].map((item) => (
                  <span key={item} className="rounded-full border border-primary/25 bg-primary/[0.06] px-3 py-1.5 text-xs font-medium text-primary">
                    {item}
                  </span>
                ))
              )}
            </div>
          </Card>
        </section>

        <Card className="panel rounded-2xl border-border/70 bg-card/60 p-5 md:p-6">
          <div className="operator-label">Recent proof</div>
          <div className="mt-4 grid gap-2">
            {loading ? (
              <EmptyLine text="Loading profile..." />
            ) : !latestProof ? (
              <EmptyLine text="No proof yet. Submit one artifact to start your record." />
            ) : (
              proofs.slice(0, 5).map((proof) => (
                <div key={proof.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/25 p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{proof.title}</div>
                    <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {proof.domain ?? "general"}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {plainEvidenceStrength(proof.evidence_strength)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function ProfileMetric({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) {
  return (
    <Card className="panel rounded-2xl border-border/70 bg-card/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="operator-label">{label}</div>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums">{value}</div>
    </Card>
  );
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-b-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[65%] truncate text-right font-medium">{value}</dd>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border/70 bg-background/20 p-4 text-sm text-muted-foreground">
      {text}
    </p>
  );
}
