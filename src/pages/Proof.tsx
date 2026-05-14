import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EvidenceStrengthBadge } from "@/components/eblocki/Badges";
import { scoreProof } from "@/lib/eblocki/proof-scoring";
import type { UserMode } from "@/lib/eblocki/modes";
import { toast } from "sonner";
import { Gavel } from "lucide-react";
import { Seo } from "@/components/Seo";

export default function Proof() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [pending, setPending] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);
  const [missed, setMissed] = useState<any[]>([]);
  const [userModes, setUserModes] = useState<UserMode[]>([]);
  const [selectedModeId, setSelectedModeId] = useState<string>("all");
  const [submitFor, setSubmitFor] = useState<any | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [reflection, setReflection] = useState("");
  const [nextUpgrade, setNextUpgrade] = useState("");
  const [domain, setDomain] = useState<string>("all");

  const activeModes = useMemo(
    () => userModes.filter((mode) => mode.is_active !== false),
    [userModes]
  );

  useEffect(() => {
    const requestedMode = params.get("mode");
    if (requestedMode) {
      setSelectedModeId(requestedMode);
    }
  }, [params]);

  const reload = async () => {
    if (!user) return;
    const [{ data: pc }, { data: pa }, { data: modes }] = await Promise.all([
      supabase.from("proof_commitments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("proof_artifacts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("user_modes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setPending((pc ?? []).filter((p) => p.status === "pending"));
    setMissed((pc ?? []).filter((p) => p.status === "missed"));
    setCompleted(pa ?? []);
    setUserModes((modes ?? []) as any);
  };

  useEffect(() => {
    reload();
  }, [user]);

  const selectedMode = activeModes.find((mode) => mode.mode_id === selectedModeId) ?? null;

  const submit = async () => {
    if (!user || !submitFor || !content.trim()) return;
    const modeId = selectedMode?.mode_id ?? submitFor.mode ?? submitFor.domain?.toUpperCase() ?? "GENERAL_EXECUTION";
    const domainValue = selectedMode ? selectedMode.mode_id.toLowerCase() : submitFor.domain;
    const score = scoreProof(domainValue, content);
    const composedFeedback = [score.feedback, reflection.trim() && `Reflection: ${reflection.trim()}`]
      .filter(Boolean)
      .join(" ");
    const composedNextUpgrade = nextUpgrade.trim() || score.nextUpgrade;
    const { data: artifact, error } = await supabase.from("proof_artifacts").insert({
      user_id: user.id,
      domain: domainValue,
      title: title || submitFor.title,
      artifact_type: submitFor.required_artifact,
      content,
      quality_score: score.score,
      evidence_strength: score.strength,
      feedback: composedFeedback,
      next_upgrade: composedNextUpgrade,
    }).select().single();
    if (error) return toast.error(error.message);
    await supabase.from("proof_commitments").update({
      status: "completed",
      proof_artifact_id: artifact!.id,
      completed_at: new Date().toISOString(),
      completion_reflection: reflection.trim() || null,
    }).eq("id", submitFor.id);
    toast.success(`Scored ${score.score}/10 — ${score.strength}`);
    setSubmitFor(null);
    setContent("");
    setTitle("");
    setReflection("");
    setNextUpgrade("");
    reload();
  };

  const filterByDomain = <T extends { domain: string; mode?: string }>(items: T[]) =>
    domain === "all"
      ? items
      : items.filter(
          (i) =>
            i.domain === domain ||
            i.mode === domain ||
            i.mode?.toLowerCase() === domain ||
            i.domain === domain.toLowerCase()
        );

  const filteredPending = filterByDomain(pending);
  const filteredCompleted = filterByDomain(completed);
  const filteredMissed = filterByDomain(missed);

  const strengthCount = (k: string) =>
    filteredCompleted.filter((c) => c.evidence_strength === k).length;

  return (
    <AppShell>
      <Seo
        title="Court of Evidence | EBLOCKI"
        description="Submit, score, and audit proof artifacts. Pending contracts, completed verdicts, and missed promises in one ledger."
        path="/proof"
      />
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <header>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Court of Evidence</span>
          <h1 className="text-2xl md:text-3xl font-semibold mt-1">Receipts, scored.</h1>
        </header>

        <Card className="panel p-4 border-primary/20">
          <div className="flex items-start gap-3">
            <Gavel className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                The Court of Evidence
              </span>
              <p className="text-sm text-muted-foreground mt-1">
                Every identity claim needs evidence. This dashboard shows what has actually been produced, not what was intended. A Proof Contract is a promise of evidence. A Proof Artifact is completed evidence.
              </p>
            </div>
          </div>
        </Card>

        <Card className="panel p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="grid grid-cols-4 gap-2 flex-1 min-w-[260px]">
              {(["weak", "moderate", "strong", "elite"] as const).map((s) => (
                <div key={s} className="rounded-sm border border-border p-2 text-center">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{s}</div>
                  <div className={"mt-1 text-lg font-semibold font-mono " + (s === "elite" ? "text-primary" : "")}>{strengthCount(s)}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="proof-domain-filter" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Domain</Label>
              <select
                id="proof-domain-filter"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                <option value="all">all</option>
                {activeModes.map((mode) => (
                  <option key={mode.mode_id} value={mode.mode_id.toLowerCase()}>{mode.display_name}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card className="panel p-4">
          <div className="grid gap-3 md:grid-cols-[1fr,280px]">
            <div>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="proof-mode-select">Mode</Label>
                  <select
                    id="proof-mode-select"
                    value={selectedModeId}
                    onChange={(e) => setSelectedModeId(e.target.value)}
                    className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All modes</option>
                    {activeModes.map((mode) => (
                      <option key={mode.mode_id} value={mode.mode_id}>{mode.display_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="proof-title">Proof title</Label>
                  <Input id="proof-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short artifact title" />
                </div>
                <div>
                  <Label htmlFor="proof-content">Proof content</Label>
                  <Textarea
                    id="proof-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    placeholder="Paste the artifact — IRAC answer, CAEE paragraph, sales reflection, training log, script, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="proof-reflection">Reflection</Label>
                  <Textarea id="proof-reflection" value={reflection} onChange={(e) => setReflection(e.target.value)} rows={2} placeholder="What did this expose? Where did it fall short?" />
                </div>
                <div>
                  <Label htmlFor="proof-next-upgrade">Next upgrade</Label>
                  <Input id="proof-next-upgrade" value={nextUpgrade} onChange={(e) => setNextUpgrade(e.target.value)} placeholder="One concrete upgrade for next time." />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-border p-4 bg-background/40">
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Selected mode</p>
                <p className="mt-2 text-sm font-semibold">{selectedMode?.display_name ?? "None selected"}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedMode?.description ?? "Choose a personalised mode to tie this artifact to the right arena."}</p>
              </div>
              <Button onClick={submit} className="w-full" disabled={!user || !submitFor || !content.trim()}>
                Score & File
              </Button>
            </div>
          </div>
        </Card>

        <Card className="panel p-4">
          <div className="flex items-center gap-2 mb-3">
            <Gavel className="h-4 w-4 text-primary" />
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary m-0">Pending proof contracts</h2>
          </div>
          {filteredPending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending contracts in this domain. Open the AI Coach and define one.</p>
          ) : (
            <div className="space-y-2">
              {filteredPending.map((p) => (
                <Card key={p.id} className="panel p-4 flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10px] uppercase text-muted-foreground">{p.domain} · {p.mode}</div>
                    <div className="text-sm font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{p.required_artifact}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Standard: {p.evidence_standard}</div>
                  </div>
                  <Button size="sm" onClick={() => { setSubmitFor(p); setTitle(p.title); setSelectedModeId(p.mode ?? p.domain?.toUpperCase() ?? "all"); }}>
                    Submit Proof
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </Card>

        <Card className="panel p-4">
          <div className="flex items-center gap-2 mb-3">
            <Gavel className="h-4 w-4 text-primary" />
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary m-0">Completed proof artifacts</h2>
          </div>
          {filteredCompleted.length === 0 ? (
            <p className="text-sm text-muted-foreground">No proof logged yet. The Court of Evidence is empty. Create your first artifact.</p>
          ) : (
            <div className="space-y-3">
              {filteredCompleted.map((a) => (
                <Card key={a.id} className="panel p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono text-[10px] uppercase text-muted-foreground">{a.domain} · {a.mode}</div>
                    {a.evidence_strength && <EvidenceStrengthBadge strength={a.evidence_strength} score={a.quality_score} />}
                  </div>
                  <div className="text-sm font-medium mt-1">{a.title}</div>
                  {a.feedback && <p className="text-xs text-muted-foreground mt-2">{a.feedback}</p>}
                  {a.next_upgrade && <p className="text-xs text-primary mt-1">Next upgrade: {a.next_upgrade}</p>}
                </Card>
              ))}
            </div>
          )}
        </Card>

        <Card className="panel p-4">
          <div className="flex items-center gap-2 mb-3">
            <Gavel className="h-4 w-4 text-primary" />
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary m-0">Missed proof contracts</h2>
          </div>
          {filteredMissed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No missed contracts.</p>
          ) : (
            filteredMissed.map((p) => (
              <Card key={p.id} className="panel p-3 mb-2"><div className="text-sm">{p.title}</div></Card>
            ))
          )}
        </Card>
      </div>
    </AppShell>
  );
}
