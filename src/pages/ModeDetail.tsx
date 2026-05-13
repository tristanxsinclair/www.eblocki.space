import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ModeBadge } from "@/components/eblocki/Badges";
import { calculateModeProgress } from "@/lib/eblocki/mode-progress";
import { TRISTAN_DEFAULT_MODES, GENERAL_DEFAULT_MODES, type EblockiDefaultMode } from "@/lib/eblocki/default-modes";
import type { UserMode } from "@/lib/eblocki/modes";
import { toast } from "sonner";
import { ArrowRight, BookOpen, ClipboardList, Sparkles } from "lucide-react";

export default function ModeDetail() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { modeId } = useParams();
  const [mode, setMode] = useState<UserMode | EblockiDefaultMode | null>(null);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [commitments, setCommitments] = useState<any[]>([]);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [researchNotes, setResearchNotes] = useState("");
  const [researchLoading, setResearchLoading] = useState(false);
  const [modeError, setModeError] = useState<string | null>(null);

  const modeKey = modeId ? decodeURIComponent(modeId) : "";
  const modeKeyUpper = modeKey.toUpperCase();

  const progress = useMemo(
    () => calculateModeProgress({ artifacts, commitments, interactions }),
    [artifacts, commitments, interactions]
  );

  useEffect(() => {
    if (!user || !modeKey) return;

    const loadMode = async () => {
      try {
        setModeError(null);
        const [{ data: userModeData, error: userModeError }, { data: artifactsData, error: artifactsError }, { data: commitmentsData, error: commitmentsError }, { data: interactionsData, error: interactionsError }, { data: researchData, error: researchError }] = await Promise.all([
          supabase.from("user_modes").select("*").eq("user_id", user.id).eq("mode_id", modeKeyUpper).maybeSingle(),
          supabase.from("proof_artifacts").select("*").or(`mode.eq.${modeKeyUpper},domain.eq.${modeKey.toLowerCase()}`).eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("proof_commitments").select("*").or(`mode.eq.${modeKeyUpper},domain.eq.${modeKey.toLowerCase()}`).eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("coach_interactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
          supabase.from("user_research_profiles").select("*").eq("user_id", user.id).eq("mode_id", modeKeyUpper).maybeSingle(),
        ]);

        if (userModeError) throw userModeError;
        if (artifactsError) throw artifactsError;
        if (commitmentsError) throw commitmentsError;
        if (interactionsError) throw interactionsError;
        if (researchError) throw researchError;

        if (userModeData) {
          setMode(userModeData as UserMode);
        } else {
          const fallback = [...TRISTAN_DEFAULT_MODES, ...GENERAL_DEFAULT_MODES].find((item) => item.mode_id === modeKeyUpper);
          if (fallback) {
            setMode(fallback);
          } else {
            setMode(null);
          }
        }

        setArtifacts(artifactsData ?? []);
        setCommitments(commitmentsData ?? []);
        setInteractions(interactionsData ?? []);
        setResearchNotes(researchData?.notes ?? "");
      } catch (error: any) {
        setModeError(error?.message || "Unable to load mode details.");
      }
    };

    loadMode();
  }, [user, modeKey, modeKeyUpper]);

  const saveResearch = async () => {
    if (!user || !modeKey) return;
    setResearchLoading(true);
    try {
      const payload = { user_id: user.id, mode_id: modeKeyUpper, notes: researchNotes }; 
      const { error } = await supabase.from("user_research_profiles").upsert(payload, { onConflict: ["user_id", "mode_id"] });
      if (error) throw error;
      toast.success("Mode research saved.");
    } catch (err: any) {
      toast.error(err?.message || "Unable to save research notes.");
    } finally {
      setResearchLoading(false);
    }
  };

  const proofLink = `/proof?mode=${encodeURIComponent(modeKeyUpper)}`;
  const coachPrompt = encodeURIComponent(`Help me execute in ${mode?.display_name ?? modeKeyUpper} with a proof-first outcome.`);

  if (!user) {
    return (
      <AppShell>
        <div className="p-8 text-center text-sm text-muted-foreground">Sign in to view mode details.</div>
      </AppShell>
    );
  }

  if (modeError) {
    return (
      <AppShell>
        <div className="p-8">
          <Card className="panel p-4 border-destructive/30 bg-destructive/5">
            <p className="text-sm text-destructive">{modeError}</p>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (!mode) {
    return (
      <AppShell>
        <div className="p-8">
          <Card className="panel p-4">
            <h1 className="text-xl font-semibold">Mode not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">The selected mode does not exist or has not been added yet.</p>
            <div className="mt-4">
              <Button onClick={() => navigate("/modes")}>Back to Modes</Button>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>Mode detail</span>
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <ModeBadge mode={mode.mode_id} />
              <span className="text-sm text-muted-foreground">{mode.mode_id}</span>
            </div>
            <h1 className="text-3xl font-semibold mt-3">{mode.display_name}</h1>
            <p className="mt-3 text-sm text-muted-foreground max-w-3xl">{mode.description}</p>
          </div>
        </header>

        <div className="grid xl:grid-cols-[1.5fr,0.9fr] gap-4">
          <div className="space-y-4">
            <Card className="panel p-4 border-primary/10">
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div className="rounded-sm border border-border p-3">
                  <div className="font-mono uppercase tracking-[0.2em]">Proof velocity (7d)</div>
                  <div className="mt-2 text-2xl font-semibold">{progress.proofVelocity7Days}</div>
                </div>
                <div className="rounded-sm border border-border p-3">
                  <div className="font-mono uppercase tracking-[0.2em]">Avg quality</div>
                  <div className="mt-2 text-2xl font-semibold">{progress.averageQualityScore.toFixed(1)}</div>
                </div>
                <div className="rounded-sm border border-border p-3">
                  <div className="font-mono uppercase tracking-[0.2em]">Strong + elite</div>
                  <div className="mt-2 text-2xl font-semibold">{progress.strongOrEliteCount}</div>
                </div>
                <div className="rounded-sm border border-border p-3">
                  <div className="font-mono uppercase tracking-[0.2em]">Compounding score</div>
                  <div className="mt-2 text-2xl font-semibold">{progress.compoundingScore}</div>
                </div>
              </div>
            </Card>

            <Card className="panel p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Mode focus</span>
                  <h2 className="text-xl font-semibold mt-2">What matters most</h2>
                </div>
                <div className="flex gap-2">
                  <Link to={`/coach?prompt=${coachPrompt}`}>
                    <Button size="sm">Coach in mode</Button>
                  </Link>
                  <Link to={proofLink}>
                    <Button size="sm" variant="secondary">Submit proof</Button>
                  </Link>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                <div className="rounded-sm border border-border p-3">
                  <div className="font-mono uppercase tracking-[0.2em] text-muted-foreground">Next upgrade</div>
                  <p className="mt-2 text-sm">{progress.suggestedUpgrade}</p>
                </div>
                <div className="rounded-sm border border-border p-3">
                  <div className="font-mono uppercase tracking-[0.2em] text-muted-foreground">Last proof date</div>
                  <p className="mt-2 text-sm">{progress.lastProofDate ?? "No proof artifacts yet."}</p>
                </div>
              </div>
            </Card>

            <Card className="panel p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                <ClipboardList className="h-4 w-4" />
                <span>Recent commitments</span>
              </div>
              {commitments.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No proof commitments for this mode yet.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {commitments.slice(0, 6).map((commit) => (
                    <div key={commit.id} className="rounded-lg border border-border p-3">
                      <div className="font-medium">{commit.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{commit.status}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="panel p-4 border-primary/10">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span>Mode research</span>
              </div>
              <div className="mt-4 space-y-3">
                <Textarea
                  value={researchNotes}
                  onChange={(e) => setResearchNotes(e.target.value)}
                  rows={10}
                  placeholder="Capture examples, frameworks, research needs, tone guidance, and evidence standards for this mode."
                />
                <Button onClick={saveResearch} disabled={researchLoading} className="w-full">
                  {researchLoading ? "Saving…" : "Save research notes"}
                </Button>
              </div>
            </Card>

            <Card className="panel p-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Recent coach interactions</div>
              {interactions.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No coach interactions recorded for this mode yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {interactions.slice(0, 6).map((interaction) => (
                    <li key={interaction.id} className="text-sm text-foreground">
                      {interaction.created_at?.slice(0, 10)} — {interaction.created_at?.slice(11, 19)}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
