import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EvidenceStrengthBadge } from "@/components/eblocki/Badges";
import { scoreProofArtifact } from "@/lib/eblocki/proof-scoring";
import type { UserMode } from "@/lib/eblocki/modes";
import { toast } from "sonner";
import { CheckCircle2, Gavel, Scale, Paperclip, X, FileText } from "lucide-react";
import { Seo } from "@/components/Seo";

const ARTIFACT_TYPES = [
  "written answer",
  "reflection",
  "script",
  "training log",
  "decision memo",
  "summary",
  "post / publication",
  "other",
];

interface Verdict {
  qualityScore: number;
  evidenceStrength: "weak" | "moderate" | "strong" | "elite";
  feedback: string;
  nextUpgrade: string;
  why: string;
  missingStandard: string;
  eliteVersion: string;
  artifactId: string;
  contractClosed: boolean;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

const ACCEPTED_TYPES = "application/pdf,image/png,image/jpeg,image/webp,image/gif,text/plain,text/markdown,text/csv";
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB

export default function Proof() {
  const { user } = useAuth();
  const [params] = useSearchParams();

  const [pending, setPending] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);
  const [missed, setMissed] = useState<any[]>([]);
  const [userModes, setUserModes] = useState<UserMode[]>([]);

  const [selectedModeId, setSelectedModeId] = useState<string>("");
  const [linkedContractId, setLinkedContractId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [artifactType, setArtifactType] = useState<string>(ARTIFACT_TYPES[0]);
  const [content, setContent] = useState("");
  const [reflection, setReflection] = useState("");
  const [nextUpgrade, setNextUpgrade] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [filterDomain, setFilterDomain] = useState("all");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentText, setAttachmentText] = useState<string>("");

  const activeModes = useMemo(
    () => userModes.filter((m) => m.is_active !== false),
    [userModes]
  );

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

  // Honour ?mode=… and ?contract=… deep links
  useEffect(() => {
    const m = params.get("mode");
    if (m) setSelectedModeId(m.toUpperCase());
    const c = params.get("contract");
    if (c) setLinkedContractId(c);
  }, [params]);

  const selectedMode = useMemo(
    () => activeModes.find((m) => m.mode_id === selectedModeId) ?? null,
    [activeModes, selectedModeId]
  );

  const linkedContract = useMemo(
    () => pending.find((p) => p.id === linkedContractId) ?? null,
    [pending, linkedContractId]
  );

  // When linking a contract, prefill mode/title/artifact type if empty
  useEffect(() => {
    if (!linkedContract) return;
    if (!title) setTitle(linkedContract.title || "");
    if (!selectedModeId && linkedContract.mode) setSelectedModeId(linkedContract.mode);
    if (linkedContract.required_artifact && artifactType === ARTIFACT_TYPES[0]) {
      setArtifactType(linkedContract.required_artifact.length > 60 ? "other" : linkedContract.required_artifact);
    }
  }, [linkedContract]);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setReflection("");
    setNextUpgrade("");
    setLinkedContractId("");
    setArtifactType(ARTIFACT_TYPES[0]);
    setAttachment(null);
    setAttachmentText("");
  };

  const buildPersonalisedExtras = (
    mode: UserMode | null,
    score: { qualityScore: number; evidenceStrength: string; feedback: string; nextUpgrade: string }
  ) => {
    const why = `Scored ${score.qualityScore}/10 (${score.evidenceStrength}). ${score.feedback}`;
    const standardExamples = mode?.strong_evidence_examples?.[0] || mode?.proof_examples?.[0];
    const eliteExample = mode?.elite_evidence_examples?.[0];
    const criteria = mode?.scoring_criteria
      ? Object.values(mode.scoring_criteria).flat().filter(Boolean).join(", ")
      : "";

    const missingStandard =
      score.evidenceStrength === "elite"
        ? "None — meets elite standard for this mode."
        : standardExamples
        ? `Aim for: ${standardExamples}${criteria ? ` (criteria: ${criteria})` : ""}`
        : "Add concrete artifact + applied detail + reflection + next upgrade.";

    const eliteVersion =
      eliteExample ||
      "Artifact shows action, applied detail, honest critique, correction, and a next upgrade that survives the Court of Evidence.";

    return { why, missingStandard, eliteVersion };
  };

  const submit = async () => {
    if (!user) return;
    if (!content.trim()) return toast.error("Add the artifact content first.");
    if (!title.trim()) return toast.error("Give the proof a title.");

    // Prevent duplicate completion
    if (linkedContract && linkedContract.proof_artifact_id) {
      return toast.error("This contract is already closed by another artifact.");
    }

    setSubmitting(true);
    try {
      const modeId = selectedMode?.mode_id ?? linkedContract?.mode ?? "GENERAL_EXECUTION";
      const domainValue = (selectedMode?.mode_id ?? linkedContract?.domain ?? modeId).toLowerCase();

      // Combine attachment-extracted text (e.g. .txt/.md/.csv) into scoring context
      const scoringContent = attachmentText
        ? `${content}\n\n--- Attached file (${attachment?.name}) ---\n${attachmentText}`
        : content;

      const score = scoreProofArtifact({
        domain: domainValue,
        title,
        artifactType,
        content: scoringContent,
        reflection,
        nextUpgrade,
      });

      const composedFeedback = [
        score.feedback,
        reflection.trim() && `Reflection: ${reflection.trim()}`,
        attachment && `Attachment: ${attachment.name} (${attachment.type || "file"})`,
      ]
        .filter(Boolean)
        .join(" ");

      // Upload attachment first (if any) so the artifact row can store the path
      let attachmentPath: string | null = null;
      let attachmentUrl: string | null = null;
      if (attachment) {
        if (attachment.size > MAX_ATTACHMENT_BYTES) {
          throw new Error("Attachment exceeds 10MB limit.");
        }
        const safeName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${Date.now()}_${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("proof-attachments")
          .upload(path, attachment, { contentType: attachment.type || undefined, upsert: false });
        if (upErr) throw upErr;
        attachmentPath = path;
        const { data: signed } = await supabase.storage
          .from("proof-attachments")
          .createSignedUrl(path, 60 * 60 * 24 * 7);
        attachmentUrl = signed?.signedUrl ?? null;
      }

      const { data: artifact, error } = await supabase
        .from("proof_artifacts")
        .insert({
          user_id: user.id,
          domain: domainValue,
          title: title.trim(),
          artifact_type: artifactType,
          content,
          quality_score: score.qualityScore,
          evidence_strength: score.evidenceStrength,
          feedback: composedFeedback,
          next_upgrade: nextUpgrade.trim() || score.nextUpgrade,
          attachment_path: attachmentPath,
          attachment_url: attachmentUrl,
          attachment_type: attachment?.type ?? null,
          attachment_name: attachment?.name ?? null,
          attachment_size: attachment?.size ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      let contractClosed = false;
      if (linkedContract && !linkedContract.proof_artifact_id) {
        const { error: upErr } = await supabase
          .from("proof_commitments")
          .update({
            status: "completed",
            proof_artifact_id: artifact!.id,
            completed_at: new Date().toISOString(),
            completion_reflection: reflection.trim() || null,
          })
          .eq("id", linkedContract.id)
          .is("proof_artifact_id", null);
        if (!upErr) contractClosed = true;
      }

      const extras = buildPersonalisedExtras(selectedMode, score);

      setVerdict({
        qualityScore: score.qualityScore,
        evidenceStrength: score.evidenceStrength,
        feedback: score.feedback,
        nextUpgrade: nextUpgrade.trim() || score.nextUpgrade,
        why: extras.why,
        missingStandard: extras.missingStandard,
        eliteVersion: extras.eliteVersion,
        artifactId: artifact!.id,
        contractClosed,
        attachmentUrl,
        attachmentName: attachment?.name ?? null,
      });

      toast.success(`Verdict: ${score.qualityScore}/10 — ${score.evidenceStrength}`);
      resetForm();
      reload();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit proof.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAttachmentChange = async (file: File | null) => {
    setAttachmentText("");
    if (!file) {
      setAttachment(null);
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error("File exceeds 10MB limit.");
      return;
    }
    setAttachment(file);
    // For plain-text files, read content so scoring/verdict can use it as evidence context
    const isText = file.type.startsWith("text/") || /\.(md|txt|csv)$/i.test(file.name);
    if (isText) {
      try {
        const text = await file.text();
        setAttachmentText(text.slice(0, 20000)); // cap context
      } catch {
        /* ignore */
      }
    }
  };

  const filterByDomain = <T extends { domain: string; mode?: string }>(items: T[]) =>
    filterDomain === "all"
      ? items
      : items.filter(
          (i) =>
            i.domain === filterDomain ||
            i.mode === filterDomain ||
            i.mode?.toLowerCase() === filterDomain ||
            i.domain === filterDomain.toLowerCase()
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
        description="Submit proof artifacts, score evidence strength, and close pending Proof Contracts."
        path="/proof"
      />
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <header>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Court of Evidence</span>
          <h1 className="text-2xl md:text-3xl font-semibold mt-1">Receipts, scored.</h1>
        </header>

        <Card className="panel p-4 border-primary/20">
          <div className="flex items-start gap-3">
            <Scale className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                Definitions
              </span>
              <p className="text-sm text-muted-foreground mt-1">
                A <span className="text-foreground">Proof Contract</span> is a promise of evidence.
                A <span className="text-foreground">Proof Artifact</span> is completed evidence. Submitting an artifact below can optionally close a pending contract.
              </p>
            </div>
          </div>
        </Card>

        {/* Strength tally */}
        <Card className="panel p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="grid grid-cols-4 gap-2 flex-1">
              {(["weak", "moderate", "strong", "elite"] as const).map((s) => (
                <div key={s} className="rounded-sm border border-border p-2 text-center">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{s}</div>
                  <div className={"mt-1 text-lg font-semibold font-mono " + (s === "elite" ? "text-primary" : "")}>{strengthCount(s)}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="proof-domain-filter" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Filter</Label>
              <select
                id="proof-domain-filter"
                value={filterDomain}
                onChange={(e) => setFilterDomain(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                <option value="all">all modes</option>
                {activeModes.map((mode) => (
                  <option key={mode.mode_id} value={mode.mode_id.toLowerCase()}>{mode.display_name}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Verdict card */}
        {verdict && (
          <Card className="panel p-4 md:p-5 border-primary/40">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Court of Evidence — Verdict</span>
              </div>
              <EvidenceStrengthBadge strength={verdict.evidenceStrength} score={verdict.qualityScore} />
            </div>
            <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
              <VerdictRow label="Why it scored that way" value={verdict.why} />
              <VerdictRow label="Missing standard" value={verdict.missingStandard} />
              <VerdictRow label="Next upgrade" value={verdict.nextUpgrade} />
              <VerdictRow label="Elite version" value={verdict.eliteVersion} />
            </div>
            {verdict.contractClosed && (
              <div className="mt-3 rounded-sm border border-primary/40 bg-primary/5 p-2.5 text-xs text-primary font-mono">
                ✓ Linked Proof Contract marked completed.
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setVerdict(null)}>Submit another</Button>
              <Link to="/dashboard"><Button size="sm" variant="ghost">Back to command centre</Button></Link>
            </div>
          </Card>
        )}

        {/* Submission form */}
        <Card className="panel p-4 md:p-5">
          <div className="flex items-center gap-2">
            <Gavel className="h-4 w-4 text-primary" />
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary m-0">Submit a Proof Artifact</h2>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="proof-mode-select">Mode</Label>
                {activeModes.length === 0 ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    No personalised modes yet. <Link to="/modes" className="text-primary hover:underline">Setup My OS</Link> so artifacts route correctly.
                  </div>
                ) : (
                  <select
                    id="proof-mode-select"
                    value={selectedModeId}
                    onChange={(e) => setSelectedModeId(e.target.value)}
                    className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">— pick a mode —</option>
                    {activeModes.map((mode) => (
                      <option key={mode.mode_id} value={mode.mode_id}>{mode.display_name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <Label htmlFor="proof-contract-link">Link a pending Proof Contract (optional)</Label>
                <select
                  id="proof-contract-link"
                  value={linkedContractId}
                  onChange={(e) => setLinkedContractId(e.target.value)}
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">— none —</option>
                  {pending.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.mode ?? p.domain} · {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {linkedContract && (
              <div className="rounded-sm border border-primary/30 bg-primary/5 p-3 text-xs">
                <div className="font-mono uppercase tracking-widest text-primary">Linked contract</div>
                <div className="mt-1 text-foreground">{linkedContract.title}</div>
                {linkedContract.required_artifact && (
                  <div className="mt-0.5 text-muted-foreground">Required: {linkedContract.required_artifact}</div>
                )}
                {linkedContract.evidence_standard && (
                  <div className="mt-0.5 text-muted-foreground">Standard: {linkedContract.evidence_standard}</div>
                )}
                {linkedContract.proof_artifact_id && (
                  <div className="mt-1 text-destructive">Already closed — submitting will create a new artifact but won't reopen.</div>
                )}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="proof-title">Title</Label>
                <Input
                  id="proof-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What did you produce?"
                />
              </div>
              <div>
                <Label htmlFor="proof-artifact-type">Artifact type</Label>
                <select
                  id="proof-artifact-type"
                  value={artifactType}
                  onChange={(e) => setArtifactType(e.target.value)}
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {ARTIFACT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="proof-content">Content</Label>
              <Textarea
                id="proof-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder="Paste the artifact or summarise the completed output."
              />
            </div>

            <div>
              <Label htmlFor="proof-reflection">Reflection</Label>
              <Textarea
                id="proof-reflection"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                rows={3}
                placeholder="What did this prove? What weakness did it reveal?"
              />
            </div>

            <div>
              <Label htmlFor="proof-next-upgrade">Next upgrade</Label>
              <Input
                id="proof-next-upgrade"
                value={nextUpgrade}
                onChange={(e) => setNextUpgrade(e.target.value)}
                placeholder="What is the next correction?"
              />
            </div>

            {selectedMode && (
              <div className="rounded-sm border border-border p-3 text-xs text-muted-foreground">
                Scoring against <span className="text-foreground font-mono">{selectedMode.display_name}</span>.
                {selectedMode.elite_evidence_examples?.[0] && (
                  <div className="mt-1">Elite target: <span className="text-foreground">{selectedMode.elite_evidence_examples[0]}</span></div>
                )}
              </div>
            )}

            <Button
              onClick={submit}
              disabled={submitting || !content.trim() || !title.trim()}
              className="w-full sm:w-auto"
            >
              {submitting ? "Filing…" : "Score & File Proof Artifact"}
            </Button>
          </div>
        </Card>

        {/* Pending contracts */}
        <Card className="panel p-4">
          <div className="flex items-center gap-2 mb-3">
            <Gavel className="h-4 w-4 text-primary" />
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary m-0">Pending Proof Contracts</h2>
          </div>
          {filteredPending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending contracts. Open the Coach to forge one.</p>
          ) : (
            <div className="space-y-2">
              {filteredPending.map((p) => (
                <Card key={p.id} className="panel p-4 flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10px] uppercase text-muted-foreground">{p.domain} · {p.mode}</div>
                    <div className="text-sm font-medium">{p.title}</div>
                    {p.required_artifact && <div className="text-xs text-muted-foreground mt-1">Required: {p.required_artifact}</div>}
                    {p.evidence_standard && <div className="text-xs text-muted-foreground mt-0.5">Standard: {p.evidence_standard}</div>}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setLinkedContractId(p.id);
                      setTitle(p.title);
                      if (p.mode) setSelectedModeId(p.mode);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Submit Proof
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </Card>

        {/* Completed artifacts */}
        <Card className="panel p-4">
          <div className="flex items-center gap-2 mb-3">
            <Gavel className="h-4 w-4 text-primary" />
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary m-0">Completed Proof Artifacts</h2>
          </div>
          {filteredCompleted.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              The Court of Evidence is empty. Create one artifact to start compounding.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredCompleted.map((a) => (
                <Card key={a.id} className="panel p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="font-mono text-[10px] uppercase text-muted-foreground">
                      {a.domain} · {a.artifact_type ?? "artifact"} · {a.created_at?.slice(0, 10)}
                    </div>
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

        {/* Missed */}
        <Card className="panel p-4">
          <div className="flex items-center gap-2 mb-3">
            <Gavel className="h-4 w-4 text-primary" />
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary m-0">Missed Proof Contracts</h2>
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

function VerdictRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border p-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
