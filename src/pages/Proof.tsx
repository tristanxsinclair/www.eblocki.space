import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { EvidenceStrengthBadge } from "@/components/eblocki/Badges";
import { scoreProofArtifact } from "@/lib/eblocki/proof-scoring";
import type { UserMode } from "@/lib/eblocki/modes";
import { computeTemporal } from "@/lib/eblocki/temporal-engine";
import { buildTemporalSnapshotPayload, stripSensitiveTemporalSnapshotFields } from "@/lib/eblocki/temporal-snapshot";
import { logEvent } from "@/lib/eblocki/analytics";
import { toast } from "sonner";
import { CheckCircle2, Gavel, Scale, Paperclip, X, FileText, UploadCloud, ScanLine, AlertTriangle } from "lucide-react";
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
const ACCEPTED_MIME_LIST = ACCEPTED_TYPES.split(",");

type AttachStatus = "idle" | "validating" | "reading" | "extracting" | "ready" | "failed";

interface AttachmentState {
  file: File | null;
  status: AttachStatus;
  progress: number; // 0-100
  message: string;
  error: string | null;
  extractedSource: "none" | "text-file" | "ocr";
  ocrTruncated: boolean;
}

const INITIAL_ATTACH: AttachmentState = {
  file: null,
  status: "idle",
  progress: 0,
  message: "",
  error: null,
  extractedSource: "none",
  ocrTruncated: false,
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error || new Error("Read failed"));
    fr.onload = () => resolve(String(fr.result));
    fr.readAsDataURL(file);
  });
}

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
  const [originalExtractedText, setOriginalExtractedText] = useState<string>("");
  const [extractedEdited, setExtractedEdited] = useState(false);
  const [attachState, setAttachState] = useState<AttachmentState>(INITIAL_ATTACH);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pressureFlag, setPressureFlag] = useState(false);
  const [transferFlag, setTransferFlag] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    setOriginalExtractedText("");
    setExtractedEdited(false);
    setAttachState(INITIAL_ATTACH);
    setPressureFlag(false);
    setTransferFlag(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
          pressure_flag: pressureFlag,
          transfer_flag: transferFlag,
        })
        .select()
        .single();
      if (error) throw error;

      // Temporal snapshot is advisory. Proof filing has already succeeded;
      // snapshot failure must never make the UI claim proof submission failed.
      try {
        const [{ data: priorArts }, { data: priorVerds }, { data: priorLed }, { data: priorModes }] = await Promise.all([
          supabase.from("proof_artifacts")
            .select("id,domain,quality_score,evidence_strength,transfer_flag,pressure_flag,proof_tier,created_at")
            .eq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
          supabase.from("court_verdicts")
            .select("verdict,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
          supabase.from("identity_ledger")
            .select("kind,domain,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
          supabase.from("user_modes").select("mode_id").eq("user_id", user.id).eq("is_active", true),
        ]);
        const temporal = computeTemporal({
          artifacts: priorArts ?? [],
          verdicts: priorVerds ?? [],
          ledger: priorLed ?? [],
          activeDomains: (priorModes ?? []).map((mode) => mode.mode_id),
        });
        const snapshot = stripSensitiveTemporalSnapshotFields(buildTemporalSnapshotPayload(temporal));
        if (snapshot) {
          const { error: snapshotError } = await supabase
            .from("proof_artifacts")
            .update({ temporal_snapshot: snapshot })
            .eq("id", artifact!.id);
          if (!snapshotError) {
            logEvent("temporal_snapshot_created", {
              modelVersion: snapshot.modelVersion,
              confidenceLevel: snapshot.confidenceLevel,
              riskKind: snapshot.mainRisk,
              recommendedPath: snapshot.recommendedPath,
            });
          }
        }
      } catch {
        // Snapshot creation is intentionally non-blocking and contains no raw proof text.
      }

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

  const clearAttachment = () => {
    setAttachment(null);
    setAttachmentText("");
    setOriginalExtractedText("");
    setExtractedEdited(false);
    setAttachState(INITIAL_ATTACH);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateFile = (file: File): string | null => {
    if (file.size === 0) return "File is empty.";
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return `File is ${(file.size / 1024 / 1024).toFixed(1)} MB — limit is 10 MB.`;
    }
    const isTextByName = /\.(md|txt|csv)$/i.test(file.name);
    const mime = file.type || (isTextByName ? "text/plain" : "");
    const matches = ACCEPTED_MIME_LIST.includes(mime) || isTextByName;
    if (!matches) return `Unsupported file type${file.type ? ` (${file.type})` : ""}. Allowed: PDF, image, or text.`;
    return null;
  };

  const handleAttachmentChange = async (file: File | null) => {
    setAttachmentText("");
    setOriginalExtractedText("");
    setExtractedEdited(false);
    if (!file) {
      clearAttachment();
      return;
    }

    setAttachState({ ...INITIAL_ATTACH, file, status: "validating", progress: 5, message: "Validating…" });

    const err = validateFile(file);
    if (err) {
      setAttachment(null);
      setAttachState({ ...INITIAL_ATTACH, file: null, status: "failed", error: err, message: err });
      toast.error(err);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setAttachment(file);

    const isText = file.type.startsWith("text/") || /\.(md|txt|csv)$/i.test(file.name);
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";

    try {
      if (isText) {
        setAttachState((s) => ({ ...s, status: "reading", progress: 40, message: "Reading text file…" }));
        const text = await file.text();
        const clipped = text.slice(0, 20000);
        setAttachmentText(clipped);
        setOriginalExtractedText(clipped);
        setExtractedEdited(false);
        setAttachState({
          file, status: "ready", progress: 100,
          message: `Text indexed — ${clipped.length.toLocaleString()} chars added to verdict context.`,
          error: null, extractedSource: "text-file", ocrTruncated: text.length > 20000,
        });
        return;
      }

      if (isImage || isPdf) {
        setAttachState((s) => ({ ...s, status: "reading", progress: 25, message: "Reading file…" }));
        const dataUrl = await readFileAsDataUrl(file);

        setAttachState((s) => ({
          ...s, status: "extracting", progress: 60,
          message: isPdf ? "OCR extracting from PDF…" : "OCR extracting from image…",
        }));

        const { data, error } = await supabase.functions.invoke("ocr-extract", {
          body: { dataUrl, mimeType: file.type, fileName: file.name },
        });
        if (error) throw new Error(error.message || "OCR call failed.");
        if ((data as any)?.error) throw new Error((data as any).error);

        const extracted: string = (data as any)?.textPreview ?? (data as any)?.text ?? "";
        const truncated: boolean = !!(data as any)?.truncated;
        setAttachmentText(extracted);
        setOriginalExtractedText(extracted);
        setExtractedEdited(false);

        if (!extracted.trim()) {
          setAttachState({
            file, status: "ready", progress: 100,
            message: "No readable text detected. File will still be attached as evidence.",
            error: null, extractedSource: "ocr", ocrTruncated: false,
          });
        } else {
          setAttachState({
            file, status: "ready", progress: 100,
            message: `OCR captured ${extracted.length.toLocaleString()} chars${truncated ? " (truncated)" : ""} — added to verdict context.`,
            error: null, extractedSource: "ocr", ocrTruncated: truncated,
          });
        }
        return;
      }

      // Fallback (shouldn't hit due to validate)
      setAttachState({
        file, status: "ready", progress: 100,
        message: "Attached. No text extraction available for this format.",
        error: null, extractedSource: "none", ocrTruncated: false,
      });
    } catch (e: any) {
      const msg = e?.message || "Failed to process attachment.";
      setAttachState({
        file, status: "failed", progress: 100, message: msg, error: msg,
        extractedSource: "none", ocrTruncated: false,
      });
      toast.error(msg);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleAttachmentChange(file);
  };

  const attachmentBusy = attachState.status === "validating" || attachState.status === "reading" || attachState.status === "extracting";

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
            {verdict.attachmentUrl && (
              <div className="mt-3 rounded-sm border border-border p-2.5 text-xs flex items-center gap-2">
                <Paperclip className="h-3 w-3 text-primary" />
                <span className="text-muted-foreground">Attached evidence:</span>
                <a href={verdict.attachmentUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">
                  {verdict.attachmentName ?? "view file"}
                </a>
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

            <div className="grid sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPressureFlag((v) => !v)}
                aria-pressed={pressureFlag}
                className={
                  "rounded-md border p-3 text-left transition-colors " +
                  (pressureFlag
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40")
                }
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                    Pressure XP
                  </span>
                  <span className={"font-mono text-[10px] " + (pressureFlag ? "text-primary" : "text-muted-foreground")}>
                    {pressureFlag ? "ON ×1.3" : "OFF"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                  Shipped under real pressure — deadline, exam, live, fatigue, avoidance overcome.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTransferFlag((v) => !v)}
                aria-pressed={transferFlag}
                className={
                  "rounded-md border p-3 text-left transition-colors " +
                  (transferFlag
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40")
                }
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                    Transfer XP
                  </span>
                  <span className={"font-mono text-[10px] " + (transferFlag ? "text-primary" : "text-muted-foreground")}>
                    {transferFlag ? "ON ×1.4" : "OFF"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                  Skill transferred to the real world — match, mark, revenue, client outcome.
                </p>
              </button>
            </div>

            <div>
              <Label htmlFor="proof-attachment" className="flex items-center gap-2">
                <Paperclip className="h-3.5 w-3.5 text-primary" />
                Attach supporting evidence (optional)
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                PDF, image, or text up to 10MB. Images & PDFs are run through OCR; text files are read directly. Extracted text is added to the verdict context.
              </p>

              <input
                ref={fileInputRef}
                id="proof-attachment"
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={(e) => handleAttachmentChange(e.target.files?.[0] ?? null)}
                className="sr-only"
              />

              {!attachment && attachState.status !== "failed" && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={onDrop}
                  className={
                    "mt-2 cursor-pointer rounded-sm border border-dashed p-5 text-center transition-colors " +
                    (isDragOver
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-muted/30")
                  }
                >
                  <UploadCloud className="mx-auto h-6 w-6 text-primary" />
                  <div className="mt-2 text-sm font-medium">
                    {isDragOver ? "Drop to attach" : "Drop a file here or click to upload"}
                  </div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    PDF · PNG · JPG · WEBP · TXT · MD · CSV — max 10MB
                  </div>
                </div>
              )}

              {attachment && (
                <div className="mt-2 rounded-sm border border-primary/30 bg-primary/5 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {attachState.status === "extracting" ? (
                        <ScanLine className="h-3.5 w-3.5 text-primary shrink-0 animate-pulse" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                      <span className="truncate text-foreground">{attachment.name}</span>
                      <span className="text-muted-foreground shrink-0">
                        {(attachment.size / 1024).toFixed(1)} KB
                      </span>
                      {attachState.status === "ready" && attachState.extractedSource !== "none" && (
                        <span className="font-mono uppercase tracking-widest text-[9px] text-primary shrink-0">
                          {attachState.extractedSource === "ocr" ? "ocr indexed" : "text indexed"}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearAttachment}
                      disabled={attachmentBusy}
                      className="h-7 px-2"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {attachmentBusy && (
                    <div className="mt-2">
                      <Progress value={attachState.progress} className="h-1.5" />
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {attachState.message}
                      </div>
                    </div>
                  )}

                  {attachState.status === "ready" && attachState.message && (
                    <div className="mt-2 text-muted-foreground">{attachState.message}</div>
                  )}
                </div>
              )}

              {attachment && attachState.status === "ready" && attachState.extractedSource !== "none" && (
                <div className="mt-2 rounded-sm border border-border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <ScanLine className="h-3.5 w-3.5 text-primary" />
                      <span className="font-mono uppercase tracking-widest text-[10px] text-muted-foreground">
                        Extracted text {attachState.extractedSource === "ocr" ? "(OCR)" : "(text file)"} — editable
                      </span>
                      {extractedEdited && (
                        <span className="font-mono uppercase tracking-widest text-[9px] text-primary">edited</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {extractedEdited && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => {
                            setAttachmentText(originalExtractedText);
                            setExtractedEdited(false);
                          }}
                        >
                          Reset
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => {
                          setAttachmentText("");
                          setExtractedEdited(originalExtractedText.length > 0);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={attachmentText}
                    onChange={(e) => {
                      setAttachmentText(e.target.value);
                      setExtractedEdited(e.target.value !== originalExtractedText);
                    }}
                    placeholder="Extracted text will appear here. Correct OCR mistakes before scoring."
                    className="mt-2 min-h-[140px] max-h-[280px] font-mono text-xs leading-relaxed"
                  />
                  <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span>{attachmentText.length.toLocaleString()} chars · fed into verdict</span>
                    {attachState.ocrTruncated && <span className="text-primary">truncated at 20k</span>}
                  </div>
                </div>
              )}

              {attachState.status === "failed" && (
                <div className="mt-2 flex items-start justify-between gap-2 rounded-sm border border-destructive/40 bg-destructive/10 p-3 text-xs">
                  <div className="flex items-start gap-2 min-w-0">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-destructive">Attachment rejected</div>
                      <div className="text-muted-foreground mt-0.5">{attachState.error}</div>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={clearAttachment} className="h-7 px-2">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
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
              disabled={submitting || attachmentBusy || !content.trim() || !title.trim()}
              className="w-full sm:w-auto"
            >
              {submitting ? "Filing…" : attachmentBusy ? "Processing attachment…" : "Score & File Proof Artifact"}
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
                  {a.attachment_url && (
                    <a
                      href={a.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <Paperclip className="h-3 w-3" />
                      {a.attachment_name ?? "attached evidence"}
                    </a>
                  )}
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
