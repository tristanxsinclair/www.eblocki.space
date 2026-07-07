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
import { humaniseModeId } from "@/lib/eblocki/display-labels";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, ClipboardList, Gavel, MessageSquare, Scale, Sparkles } from "lucide-react";
import { EvidenceStrengthBadge } from "@/components/eblocki/Badges";
import { Seo } from "@/components/Seo";

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
          // proof_artifacts has no `mode` column — match by domain only (lowercase mode id).
          supabase.from("proof_artifacts").select("*").eq("user_id", user.id).eq("domain", modeKey.toLowerCase()).order("created_at", { ascending: false }),
          supabase.from("proof_commitments").select("*").eq("user_id", user.id).or(`mode.eq.${modeKeyUpper},domain.eq.${modeKey.toLowerCase()}`).order("created_at", { ascending: false }),
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
        setResearchNotes(researchData?.research_summary ?? "");
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
      const payload = {
        user_id: user.id,
        mode_id: modeKeyUpper,
        topic: mode?.display_name ?? modeKeyUpper,
        research_summary: researchNotes || "Research integration pending. Add source links or notes manually for now.",
        verified_sources: [],
        source_quality_notes: "Source cannot be confirmed until research integration is connected.",
        last_researched_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("user_research_profiles").upsert(payload, { onConflict: "user_id,mode_id" });
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
  const coachLink = `/coach?mode=${encodeURIComponent(modeKeyUpper)}&prompt=${coachPrompt}`;

  const isActiveMode = "is_active" in (mode ?? {}) ? (mode as UserMode).is_active !== false : true;

  const diagnosis = useMemo(() => {
    if (!mode) return null;
    const lines: string[] = [];
    if (progress.totalArtifacts === 0) lines.push("This mode is under-proven. The system has no record of evidence in this arena.");
    if (progress.pendingCommitments > Math.max(1, progress.completedCommitments)) {
      lines.push("Contracts are being created faster than completed. Close one before forging the next.");
    }
    if (progress.totalArtifacts > 0 && progress.averageQualityScore < 6) {
      lines.push("Proof quality needs deeper reflection. Raise the standard, not the count.");
    }
    const recentStrong = artifacts
      .filter((a) => a.evidence_strength === "strong" || a.evidence_strength === "elite")
      .some((a) => new Date(a.created_at).getTime() > Date.now() - 14 * 864e5);
    if (recentStrong) lines.push("This mode has evidence momentum. Protect it — schedule the next artifact now.");
    if (lines.length === 0) lines.push("No major signals. Keep producing concrete artifacts in this mode.");
    return lines;
  }, [mode, progress, artifacts]);

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
          <Card className="panel p-5 max-w-xl mx-auto">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Mode not configured</span>
            <h1 className="text-xl font-semibold mt-2">This mode isn't set up yet</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Add <span className="font-mono">{modeKeyUpper || "this mode"}</span> to your operating system,
              or pick one of your existing modes. Modes need to exist before proof can compound inside them.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => navigate("/modes")}>Back to Modes</Button>
              <Button variant="outline" onClick={() => navigate("/onboarding")}>Set up modes</Button>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Seo
        title={`${mode.display_name} | Mode Detail | EBLOCKI`}
        description={`Compounding progress, evidence timeline, and pending proof contracts for ${mode.display_name}.`}
        path={`/modes/${encodeURIComponent(mode.mode_id)}`}
      />
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        <header className="space-y-3">
          <button
            onClick={() => navigate("/modes")}
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Modes
          </button>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>Mode detail</span>
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <ModeBadge mode={mode.mode_id} />
              <span className="text-sm text-muted-foreground">
                {humaniseModeId(mode.mode_id, mode.display_name)}
              </span>
              <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm border ${isActiveMode ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`}>
                {isActiveMode ? "Active" : "Inactive"}
              </span>
            </div>
            <h1 className="text-3xl font-semibold mt-3">{mode.display_name}</h1>
            <p className="mt-3 text-sm text-muted-foreground max-w-3xl">{mode.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={coachLink}>
                <Button size="sm"><MessageSquare className="h-3 w-3 mr-1.5" />Coach in this Mode</Button>
              </Link>
              <Link to={proofLink}>
                <Button size="sm" variant="outline"><Gavel className="h-3 w-3 mr-1.5" />Submit Proof in this Mode</Button>
              </Link>
            </div>
          </div>
        </header>

        <Card className="panel p-4 border-primary/30">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Proof Check</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Every identity claim in this mode needs evidence. This page shows what has actually been produced, not what was intended.
          </p>
        </Card>

        {!isActiveMode && (
          <Card className="panel p-4 border-amber-500/30 bg-amber-500/5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-amber-500">Mode inactive</span>
            <p className="mt-2 text-sm text-muted-foreground">
              This mode is currently disabled. Proof you submit won't route here and the coach
              won't use this mode's evidence standards. Reactivate from Modes to bring it back online.
            </p>
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => navigate("/modes")}>Manage modes</Button>
            </div>
          </Card>
        )}

        {/* Mode Identity */}
        <Card className="panel p-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Mode Identity</span>
          <div className="mt-3 grid md:grid-cols-2 gap-4 text-sm">
            <IdentityList label="Keywords" items={mode.keywords ?? []} mono />
            <IdentityList label="Proof examples" items={mode.proof_examples ?? []} />
            <IdentityList label="Weak evidence" items={mode.weak_evidence_examples ?? []} />
            <IdentityList label="Elite evidence" items={mode.elite_evidence_examples ?? []} />
          </div>
        </Card>

        <div className="grid xl:grid-cols-[1.5fr,0.9fr] gap-4">
          <div className="space-y-4">
            <Card className="panel p-4 border-primary/10">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Compounding Progress</span>
                <span className="font-mono text-lg text-primary">{progress.compoundingScore}<span className="text-muted-foreground text-xs">/100</span></span>
              </div>
              <div className="mt-2 h-1.5 w-full bg-muted/50 rounded-sm overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress.compoundingScore}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <Stat label="Total artifacts" value={progress.totalArtifacts} />
                <Stat label="Pending contracts" value={progress.pendingCommitments} />
                <Stat label="Completed" value={progress.completedCommitments} />
                <Stat label="Missed" value={progress.missedCommitments} />
                <Stat label="Avg quality" value={progress.averageQualityScore.toFixed(1)} />
                <Stat label="Strong + elite" value={progress.strongOrEliteCount} accent />
                <Stat label="Weak" value={progress.weakCount} />
                <Stat label="Moderate" value={progress.moderateCount} />
                <Stat label="Strong" value={progress.strongCount} />
                <Stat label="Elite" value={progress.eliteCount} accent />
                <Stat label="Velocity 7d" value={progress.proofVelocity7Days} />
                <Stat label="Velocity 30d" value={progress.proofVelocity30Days} />
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Last proof: <span className="text-foreground">{progress.lastProofDate ?? "—"}</span>
              </div>
            </Card>

            {/* Diagnosis */}
            <Card className="panel p-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Mode Diagnosis</span>
              <ul className="mt-2 space-y-1.5 text-sm">
                {diagnosis?.map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">›</span><span>{line}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Evidence Timeline */}
            <Card className="panel p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Evidence Timeline</span>
                <Link to={proofLink} className="text-xs font-mono text-muted-foreground hover:text-foreground">Submit new</Link>
              </div>
              {artifacts.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No proof artifacts in this mode yet. Intentions do not compound — submit one.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-border">
                  {artifacts.slice(0, 12).map((a) => (
                    <li key={a.id} className="py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm truncate">{a.title}</div>
                          <div className="font-mono text-[10px] uppercase text-muted-foreground mt-0.5">
                            {a.artifact_type ?? "artifact"} · {a.created_at?.slice(0, 10)}
                          </div>
                        </div>
                        {a.evidence_strength && <EvidenceStrengthBadge strength={a.evidence_strength} score={a.quality_score} />}
                      </div>
                      {a.feedback && (
                        <div className="mt-1.5 text-[12px] text-muted-foreground line-clamp-2">
                          <span className="text-foreground font-mono">Feedback:</span> {a.feedback}
                        </div>
                      )}
                      {a.next_upgrade && (
                        <div className="mt-1 text-[12px] text-muted-foreground line-clamp-2">
                          <span className="text-foreground font-mono">Next upgrade:</span> {a.next_upgrade}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Pending Proof Contracts */}
            <Card className="panel p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                <ClipboardList className="h-4 w-4" />
                <span>Pending Proof Contracts</span>
              </div>
              {(() => {
                const pending = commitments.filter((c) => c.status === "pending");
                if (pending.length === 0) {
                  return <p className="mt-3 text-sm text-muted-foreground">No pending proof contracts in this mode. Forge one in the Coach.</p>;
                }
                return (
                  <ul className="mt-3 space-y-2">
                    {pending.slice(0, 8).map((c) => (
                      <li key={c.id} className="rounded-sm border border-border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-medium">{c.title}</div>
                          <span className="font-mono text-[10px] uppercase text-muted-foreground">{c.status}</span>
                        </div>
                        {c.required_artifact && (
                          <div className="mt-1 text-xs text-muted-foreground"><span className="text-foreground font-mono">Required:</span> {c.required_artifact}</div>
                        )}
                        {c.evidence_standard && (
                          <div className="mt-0.5 text-xs text-muted-foreground"><span className="text-foreground font-mono">Standard:</span> {c.evidence_standard}</div>
                        )}
                        <Link to={proofLink} className="mt-3 block sm:inline-block">
                          <Button size="sm" variant="outline" className="w-full sm:w-auto min-h-[44px]">
                            Submit Proof
                          </Button>
                        </Link>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="panel p-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Next upgrade</span>
              <p className="mt-2 text-sm">{progress.suggestedUpgrade}</p>
            </Card>

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

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rounded-sm border border-border p-2">
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={"mt-1 text-base font-semibold font-mono " + (accent ? "text-primary" : "")}>{value}</div>
    </div>
  );
}

function IdentityList({ label, items, mono }: { label: string; items: string[]; mono?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      {items.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground italic">— none defined —</p>
      ) : mono ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {items.map((k) => (
            <span key={k} className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm border border-border text-muted-foreground">
              {k}
            </span>
          ))}
        </div>
      ) : (
        <ul className="mt-1 space-y-0.5 text-xs list-disc list-inside text-foreground">
          {items.map((k, i) => <li key={i}>{k}</li>)}
        </ul>
      )}
    </div>
  );
}
