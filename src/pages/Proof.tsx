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
import { ProofStandardPreviewPanel } from "@/components/eblocki/ProofStandardPreviewPanel";
import { scoreProofArtifact } from "@/lib/eblocki/proof-scoring";
import { classifyStudyActivity } from "@/lib/eblocki/fake-study-detector";
import { StudyVerdictHint } from "@/components/eblocki/StudyVerdictHint";
import { buildProofStandardPreview, type ProofStandardPreview } from "@/lib/eblocki/proof-standard-preview";
import type { UserMode } from "@/lib/eblocki/modes";
import { computeTemporal } from "@/lib/eblocki/temporal-engine";
import { buildTemporalSnapshotPayload, stripSensitiveTemporalSnapshotFields } from "@/lib/eblocki/temporal-snapshot";
import { logEvent } from "@/lib/eblocki/analytics";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileText,
  Gavel,
  Paperclip,
  Radar,
  Scale,
  ScanLine,
  UploadCloud,
  X,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { summariseArtifactContent } from "@/lib/eblocki/mobile-disclosure";
import { extractNextUpgrade } from "@/lib/eblocki/next-upgrade-extract";
import { MobileCollapse } from "@/components/eblocki/MobileCollapse";
import {
  FIRST_PROOF_COPY,
  FIRST_PROOF_DEFAULTS,
  FIRST_PROOF_EXAMPLES,
  FIRST_PROOF_STANDARD_PREVIEW,
  isFirstProofMode,
} from "@/lib/eblocki/first-proof";
import { parseTemporalProofParams } from "@/lib/eblocki/temporal-proof-link";
import { verdictIdentityImpact } from "@/lib/eblocki/verdict-identity-impact";

const ARTIFACT_TYPES = [
  "product system review",
  "source-bank entries",
  "IRAC paragraph",
  "implementation proof",
  "academic proof plan",
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
  selectedStandard: string;
  requiredEvidence: string[];
  contractAlignment: string;
  identityEscalationAllowed: boolean;
  identityEscalationReason: string;
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

function buildVerdictExtras(
  preview: ProofStandardPreview,
  score: { qualityScore: number; evidenceStrength: string; feedback: string; nextUpgrade: string }
) {
  const why = `Scored ${score.qualityScore}/10 (${score.evidenceStrength}). ${score.feedback}`;
  const missingStandard = score.evidenceStrength === "elite"
    ? `None - meets ${preview.standardLabel}.`
    : preview.missingStandard;
  return { why, missingStandard, eliteVersion: preview.eliteVersion };
}

function VerdictFeedback({ artifactId }: { artifactId: string }) {
  const { user } = useAuth();
  const [choice, setChoice] = useState<"yes" | "kind_of" | "no" | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (value: "yes" | "kind_of" | "no") => {
    if (!user || submitting) return;
    setChoice(value);
    setSubmitting(true);
    try {
      const { error } = await supabase.from("interest_signals").insert({
        user_id: user.id,
        signal_type: "verdict_feedback",
        source: "proof_verdict",
        note: [`vote=${value}`, `artifact=${artifactId}`, note.trim() ? `note=${note.trim().slice(0, 500)}` : null]
          .filter(Boolean)
          .join(" | "),
      });
      if (error) {
        toast.error("Could not save feedback. Your verdict is still recorded.");
      } else {
        setSubmitted(true);
        logEvent("recommendation_outcome_logged", { outcome: `verdict_feedback_${value}` });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mt-4 rounded-sm border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
        Feedback recorded. Thanks — this helps Eblocki improve future proof verdicts.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-sm border border-border bg-background/40 p-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Was this judgment useful?</div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant={choice === "yes" ? "default" : "outline"} disabled={submitting} onClick={() => submit("yes")}>Yes</Button>
        <Button size="sm" variant={choice === "kind_of" ? "default" : "outline"} disabled={submitting} onClick={() => submit("kind_of")}>Kind of</Button>
        <Button size="sm" variant={choice === "no" ? "default" : "outline"} disabled={submitting} onClick={() => submit("no")}>No</Button>
      </div>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 500))}
        rows={2}
        placeholder="Optional: what was confusing or wrong?"
        className="mt-2 text-xs"
      />
    </div>
  );
}

export default function Proof() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const firstProofMode = isFirstProofMode(params);
  const temporalBrief = useMemo(() => parseTemporalProofParams(params), [params]);
  const [firstProofSubmitted, setFirstProofSubmitted] = useState(false);

  const [pending, setPending] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);
  const [missed, setMissed] = useState<any[]>([]);
  const [userModes, setUserModes] = useState<UserMode[]>([]);

  const [selectedModeId, setSelectedModeId] = useState<string>("");
  const [linkedContractId, setLinkedContractId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [artifactType, setArtifactType] = useState<string>("");
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
  const [detailOpen, setDetailOpen] = useState(false);
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

  // Honour ?mode=... and ?contract=... deep links
  useEffect(() => {
    const m = params.get("mode");
    if (m) setSelectedModeId(m.toUpperCase());
    const c = params.get("contract");
    if (c) setLinkedContractId(c);
  }, [params]);

  // Honour ?source=temporal&domain=... — only preselect the domain when it
  // safely matches an active user mode AND the user has not already chosen
  // one. Never overwrite user-entered text fields.
  const temporalDomainMatch = useMemo(() => {
    if (!temporalBrief.isTemporal || !temporalBrief.domain) return null;
    const target = temporalBrief.domain.trim().toLowerCase();
    if (!target) return null;
    return (
      activeModes.find((m) => (m.mode_id ?? "").toLowerCase() === target) ??
      activeModes.find((m) => (m.mode_id ?? "").toLowerCase().startsWith(target)) ??
      null
    );
  }, [temporalBrief, activeModes]);

  useEffect(() => {
    if (!temporalBrief.isTemporal) return;
    if (selectedModeId) return;
    if (temporalDomainMatch) setSelectedModeId(temporalDomainMatch.mode_id);
  }, [temporalBrief.isTemporal, temporalDomainMatch, selectedModeId]);

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
    if (linkedContract.required_artifact && !artifactType) {
      setArtifactType(linkedContract.required_artifact.length > 80 ? "other" : linkedContract.required_artifact);
    }
  }, [linkedContract]);

  const proofPreview = useMemo(() => buildProofStandardPreview({
    domain: selectedMode?.mode_id ?? linkedContract?.domain ?? selectedModeId,
    artifactType,
    proofAction: linkedContract?.required_artifact ?? linkedContract?.title ?? artifactType,
    proofContract: linkedContract,
    signalText: [title, content, reflection].filter(Boolean).join("\n"),
  }), [artifactType, linkedContract, selectedMode?.mode_id, selectedModeId, title, content, reflection]);

  const hasStandardSelection = Boolean(artifactType || linkedContract || selectedModeId);

  // Fake Study Detector v1 — deterministic classification of described study activity.
  // Live (pre-submit) signal: updates as the student types.
  const liveStudyClassification = useMemo(
    () => classifyStudyActivity({ content, title, artifactType }),
    [content, title, artifactType],
  );
  // Frozen (post-submit) classification of the artifact that produced the verdict.
  const [submittedStudyClassification, setSubmittedStudyClassification] = useState<
    ReturnType<typeof classifyStudyActivity> | null
  >(null);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setReflection("");
    setNextUpgrade("");
    setLinkedContractId("");
    setArtifactType("");
    setAttachment(null);
    setAttachmentText("");
    setOriginalExtractedText("");
    setExtractedEdited(false);
    setAttachState(INITIAL_ATTACH);
    setPressureFlag(false);
    setTransferFlag(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = async () => {
    if (!user) return;
    const effectiveArtifactType = artifactType.trim()
      ? artifactType
      : firstProofMode
        ? FIRST_PROOF_DEFAULTS.artifactType
        : "";
    if (!effectiveArtifactType.trim()) return toast.error("Choose a proof type first.");
    if (!content.trim()) return toast.error("Add the artifact content first.");
    if (!title.trim()) return toast.error("Give the proof a title.");

    // Prevent duplicate completion
    if (linkedContract && linkedContract.proof_artifact_id) {
      return toast.error("This contract is already closed by another artifact.");
    }

    setSubmitting(true);
    try {
      const modeId =
        selectedMode?.mode_id ??
        linkedContract?.mode ??
        (firstProofMode ? FIRST_PROOF_DEFAULTS.modeId : "GENERAL_EXECUTION");
      const domainValue = (
        selectedMode?.mode_id ??
        linkedContract?.domain ??
        (firstProofMode ? FIRST_PROOF_DEFAULTS.domain : modeId)
      ).toLowerCase();
      const submissionPreview = buildProofStandardPreview({
        domain: domainValue,
        artifactType: effectiveArtifactType,
        proofAction: linkedContract?.required_artifact ?? linkedContract?.title ?? effectiveArtifactType,
        proofContract: linkedContract,
        signalText: [title, content, reflection].filter(Boolean).join("\n"),
      });

      // Combine attachment-extracted text (e.g. .txt/.md/.csv) into scoring context
      const scoringContent = attachmentText
        ? `${content}\n\n--- Attached file (${attachment?.name}) ---\n${attachmentText}`
        : content;

      const score = scoreProofArtifact({
        domain: domainValue,
        title,
        artifactType: effectiveArtifactType,
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
          artifact_type: effectiveArtifactType,
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

      const extras = buildVerdictExtras(submissionPreview, score);

      const verdictNextUpgrade = extractNextUpgrade({
        nextUpgrade,
        content,
        reflection,
        fallback: score.nextUpgrade,
      });

      setVerdict({
        qualityScore: score.qualityScore,
        evidenceStrength: score.evidenceStrength,
        feedback: score.feedback,
        nextUpgrade: verdictNextUpgrade,
        why: extras.why,
        missingStandard: extras.missingStandard,
        eliteVersion: extras.eliteVersion,
        artifactId: artifact!.id,
        contractClosed,
        selectedStandard: submissionPreview.standardLabel,
        requiredEvidence: submissionPreview.requiredEvidence,
        contractAlignment: submissionPreview.alignmentMessage,
        identityEscalationAllowed: submissionPreview.identityEscalationAllowed,
        identityEscalationReason: submissionPreview.identityRule,
        attachmentUrl,
        attachmentName: attachment?.name ?? null,
      });

      // Freeze the Fake Study Detector classification for this submission so the
      // post-submit hint reflects the artifact the user actually shipped, not
      // whatever they type next.
      setSubmittedStudyClassification(
        classifyStudyActivity({ content, title, artifactType }),
      );

      toast.success(`Verdict: ${score.qualityScore}/10 - ${score.evidenceStrength}`);
      if (firstProofMode) {
        setFirstProofSubmitted(true);
        logEvent("proof_capture_completed", { first_proof: true });
      }
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
      return `File is ${(file.size / 1024 / 1024).toFixed(1)} MB - limit is 10 MB.`;
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

    setAttachState({ ...INITIAL_ATTACH, file, status: "validating", progress: 5, message: "Validating..." });

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
        setAttachState((s) => ({ ...s, status: "reading", progress: 40, message: "Reading text file..." }));
        const text = await file.text();
        const clipped = text.slice(0, 20000);
        setAttachmentText(clipped);
        setOriginalExtractedText(clipped);
        setExtractedEdited(false);
        setAttachState({
          file, status: "ready", progress: 100,
          message: `Text indexed - ${clipped.length.toLocaleString()} chars added to verdict context.`,
          error: null, extractedSource: "text-file", ocrTruncated: text.length > 20000,
        });
        return;
      }

      if (isImage || isPdf) {
        setAttachState((s) => ({ ...s, status: "reading", progress: 25, message: "Reading file..." }));
        const dataUrl = await readFileAsDataUrl(file);

        setAttachState((s) => ({
          ...s, status: "extracting", progress: 60,
          message: isPdf ? "OCR extracting from PDF..." : "OCR extracting from image...",
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
            message: `OCR captured ${extracted.length.toLocaleString()} chars${truncated ? " (truncated)" : ""} - added to verdict context.`,
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
        title="Proof Check | EBLOCKI"
        description="Submit proof artifacts, score evidence strength, and close pending Proof Contracts."
        path="/proof"
      />
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 min-w-0 max-w-full text-wrap-safe">
        {firstProofMode ? (
          <header className="min-w-0">
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              Activation · First Proof
            </span>
            <h1 className="text-2xl md:text-3xl font-semibold mt-1 break-words">
              {FIRST_PROOF_COPY.title}
            </h1>
            <p className="mt-2 text-sm md:text-base text-muted-foreground break-words">
              {FIRST_PROOF_COPY.subtitle}
            </p>
          </header>
        ) : (
          <header className="min-w-0">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Proof Check</span>
            <h1 className="text-2xl md:text-3xl font-semibold mt-1 break-words">Submit proof</h1>
            <p className="mt-1 text-sm text-muted-foreground break-words">
              One measurable artifact. Standard before submission.
            </p>
          </header>
        )}

        {firstProofSubmitted && firstProofMode && (
          <Card className="panel p-4 border-primary/50 bg-primary/5 max-w-full overflow-hidden">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold break-words">
                  {FIRST_PROOF_COPY.successTitle}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground break-words">
                  Your first artifact is filed. The verdict is below, and Today will update with your next step.
                </p>
                <div className="mt-3">
                  <Link to="/dashboard">
                    <Button size="sm" className="w-full sm:w-auto">
                      {FIRST_PROOF_COPY.successCta}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        )}

        {temporalBrief.isTemporal && !firstProofMode && (
          <Card
            className="panel p-4 border-primary/40 bg-primary/5 max-w-full overflow-hidden min-w-0"
            data-testid="temporal-proof-brief"
          >
            <div className="flex items-start gap-3 min-w-0">
              <Radar className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
                  Forecast-linked proof
                </div>
                <dl className="grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                      Domain
                    </dt>
                    <dd className="break-words text-foreground">
                      {temporalBrief.domain ?? "—"}
                      {temporalBrief.domain && !temporalDomainMatch && (
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          (guidance only — no matching active mode)
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                      Expected level
                    </dt>
                    <dd className="break-words text-foreground">
                      {temporalBrief.level.replace(/_/g, " ")}
                    </dd>
                  </div>
                  <div className="min-w-0 sm:col-span-2">
                    <dt className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                      Proof required
                    </dt>
                    <dd className="break-words text-foreground">
                      {temporalBrief.proof ?? "—"}
                    </dd>
                  </div>
                  <div className="min-w-0 sm:col-span-2">
                    <dt className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                      Reason
                    </dt>
                    <dd className="break-words text-foreground">
                      {temporalBrief.reason ? temporalBrief.reason.replace(/_/g, " ") : "—"}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                      Timebox
                    </dt>
                    <dd className="break-words text-foreground">{temporalBrief.timebox}</dd>
                  </div>
                </dl>
                <p className="text-[11px] text-muted-foreground break-words">
                  Submit one measurable artifact below. This brief is guidance — it never overwrites what you type.
                </p>
              </div>
            </div>
          </Card>
        )}

        {firstProofMode ? (
          <Card className="panel p-4 border-primary/30 max-w-full overflow-hidden">
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              {FIRST_PROOF_COPY.helperHeader}
            </span>
            <p className="text-sm text-foreground mt-1 break-words">
              {FIRST_PROOF_STANDARD_PREVIEW.whatCounts}
            </p>
            <div className="mt-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                What makes it stronger?
              </div>
              <p className="text-sm text-muted-foreground mt-1 break-words">
                {FIRST_PROOF_STANDARD_PREVIEW.whatMakesItStronger}
              </p>
            </div>
            <div className="mt-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                What should I paste?
              </div>
              <p className="text-sm text-muted-foreground mt-1 break-words">
                {FIRST_PROOF_STANDARD_PREVIEW.whatShouldIPaste}
              </p>
              <ul className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                {FIRST_PROOF_EXAMPLES.map((ex) => (
                  <li key={ex.domain} className="break-words">• {ex.example}</li>
                ))}
              </ul>
            </div>
            <div className="mt-3 rounded-sm border border-primary/20 bg-background/40 p-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                What happens after I submit?
              </div>
              <p className="mt-1 text-sm text-muted-foreground break-words">
                You get a proof verdict right away. Then Today updates with your next step.
              </p>
            </div>
          </Card>
        ) : (
          <Card className="panel p-4 border-primary/30 max-w-full overflow-hidden">
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              What counts as proof?
            </span>
            <p className="text-sm text-muted-foreground mt-1 break-words">
              One measurable artifact from today. No artifact, no claim. Examples:
            </p>
            <ul className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
              <li>• one paragraph written</li>
              <li>• one shipped change</li>
              <li>• one closed loop</li>
            </ul>
          </Card>
        )}

        {!firstProofMode && (
          <MobileCollapse eyebrow="Definitions" label="Contract vs Artifact" trackId="proof_definitions">
            <Card className="panel p-4 border-primary/20 max-w-full overflow-hidden">
              <div className="flex items-start gap-3">
                <Scale className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                    Definitions
                  </span>
                  <p className="text-sm text-muted-foreground mt-1 break-words">
                    A <span className="text-foreground">Proof Contract</span> is a promise of evidence.
                    A <span className="text-foreground">Proof Artifact</span> is completed evidence. Submitting an artifact below can optionally close a pending contract.
                  </p>
                </div>
              </div>
            </Card>
          </MobileCollapse>
        )}

        {/* Strength tally */}
        {!firstProofMode && (
          <MobileCollapse eyebrow="Stats" label="Strength tally & filter" trackId="proof_stats">
            <Card className="panel p-4 max-w-full overflow-hidden">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="grid grid-cols-4 gap-2 flex-1">
                  {(["weak", "moderate", "strong", "elite"] as const).map((s) => (
                    <div key={s} className="rounded-sm border border-border p-2 text-center min-w-0">
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
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-sm max-w-full"
                  >
                    <option value="all">all modes</option>
                    {activeModes.map((mode) => (
                      <option key={mode.mode_id} value={mode.mode_id.toLowerCase()}>{mode.display_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>
          </MobileCollapse>
        )}

        {/* Verdict card */}
        {verdict && (
          <Card className="panel p-4 md:p-5 border-primary/40 max-w-full overflow-hidden">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                  Proof Verdict
                </span>
              </div>
              <EvidenceStrengthBadge strength={verdict.evidenceStrength} score={verdict.qualityScore} />
            </div>
            {(() => {
              const impact = verdictIdentityImpact(verdict.evidenceStrength);
              const toneClass =
                impact.tone === "warn"
                  ? "border-amber-500/40 bg-amber-500/5 text-amber-200"
                  : impact.tone === "good"
                    ? "border-primary/40 bg-primary/5 text-primary"
                    : impact.tone === "elite"
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-foreground";
              return (
                <div
                  className={`mt-3 rounded-sm border p-3 text-sm ${toneClass}`}
                  data-testid="verdict-identity-impact"
                >
                  <div className="font-medium">{impact.headline}</div>
                  <div className="mt-1 text-xs opacity-90">{impact.subtext}</div>
                </div>
              );
            })()}
            {firstProofMode ? (
              <>
                <div className="mt-3 grid gap-3 text-sm">
                  <VerdictRow label="What counted" value={verdict.feedback} />
                  <VerdictRow
                    label="What was weak or missing"
                    value={
                      verdict.evidenceStrength === "elite"
                        ? "Nothing major — this is a strong first proof."
                        : verdict.missingStandard
                    }
                  />
                  <VerdictRow label="One next action" value={verdict.nextUpgrade} />
                </div>
                <div className="mt-3 rounded-sm border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                  Next: open Today for your updated command, then come back tomorrow with the next proof.
                </div>
              </>
            ) : (
              <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
                <VerdictRow label="What counted" value={verdict.feedback} />
                <VerdictRow label="Required evidence" value={verdict.requiredEvidence.join(" / ")} />
                <VerdictRow label="Missing standard" value={verdict.missingStandard} />
                <VerdictRow label="Next command" value={verdict.nextUpgrade} />
                <VerdictRow label="Selected standard" value={verdict.selectedStandard} />
                <VerdictRow label="Why it scored that way" value={verdict.why} />
                <VerdictRow label="Elite version" value={verdict.eliteVersion} />
                <VerdictRow label="Proof contract completed" value={verdict.contractClosed ? "Yes - linked Proof Contract marked completed." : "No - no linked contract was completed by this artifact."} />
                <VerdictRow label="Contract alignment" value={verdict.contractAlignment} />
                <VerdictRow
                  label="Identity escalation"
                  value={`${verdict.identityEscalationAllowed ? "Allowed" : "Blocked"}: ${verdict.identityEscalationReason}`}
                />
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
            {!firstProofMode && <VerdictFeedback artifactId={verdict.artifactId} />}
            {submittedStudyClassification && !firstProofMode && (
              <div className="mt-4">
                <StudyVerdictHint
                  classification={submittedStudyClassification}
                  label="Fake study detector"
                />
              </div>
            )}
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Link to="/dashboard" className="w-full sm:w-auto">
                <Button size="sm" className="w-full sm:w-auto">
                  {firstProofMode ? "See my next step" : "Back to Today"}
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => { setVerdict(null); setSubmittedStudyClassification(null); setDetailOpen(false); }}
              >
                Submit another proof
              </Button>
            </div>
          </Card>
        )}

        {/* Submission form */}
        <Card className="panel p-4 md:p-5 max-w-full overflow-hidden">
          <div className="flex items-center gap-2">
            <Gavel className="h-4 w-4 text-primary" />
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary m-0">
              {firstProofMode ? "Submit your first proof" : "Submit proof"}
            </h2>
          </div>

          <div className="mt-4 grid gap-3">
            {!firstProofMode && (
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
                      <option value="">- pick a mode -</option>
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
                    <option value="">- none -</option>
                    {pending.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.mode ?? p.domain} - {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {!firstProofMode && linkedContract && (
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
                  <div className="mt-1 text-destructive">Already closed - submitting will create a new artifact but won't reopen.</div>
                )}
              </div>
            )}

            {firstProofMode ? (
              <div>
                <Label htmlFor="proof-title">Title</Label>
                <Input
                  id="proof-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Short name for this piece of work"
                />
              </div>
            ) : (
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
                    <option value="">choose proof type</option>
                    {ARTIFACT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {!firstProofMode && (
              hasStandardSelection ? (
                <ProofStandardPreviewPanel preview={proofPreview} />
              ) : (
                <div className="rounded-sm border border-border bg-background/40 p-3 text-sm text-muted-foreground">
                  No proof standard selected yet. Choose a proof type to see how Eblocki will score it.
                </div>
              )
            )}

            {!firstProofMode && content.trim().length >= 12 && (
              <StudyVerdictHint
                classification={liveStudyClassification}
                label="Fake study detector"
              />
            )}

            <div>
              <Label htmlFor="proof-content">
                {firstProofMode ? "Paste your work" : "Content"}
              </Label>
              <Textarea
                id="proof-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder={firstProofMode
                  ? "Paste the actual paragraph, answer, or notes you wrote."
                  : "Paste the artifact or summarise the completed output."}
              />
            </div>

            <button
              type="button"
              onClick={() => setDetailOpen((open) => !open)}
              aria-expanded={detailOpen}
              className="w-full min-h-[44px] rounded-sm border border-border bg-card/40 px-3 py-2 text-left transition-colors hover:border-primary/40 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Optional</div>
                <div className="text-sm text-foreground">
                  {firstProofMode
                    ? "Optional details — mode, proof type, reflection, attachment"
                    : "Optional details — reflection, next upgrade, XP flags, attachment"}
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${detailOpen ? "rotate-180" : ""}`}
              />
            </button>
            <div className={`${detailOpen || reflection || nextUpgrade || pressureFlag || transferFlag || attachment ? "grid" : "hidden"} gap-3`}>
              {firstProofMode && (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="proof-mode-select">Mode</Label>
                    {activeModes.length === 0 ? (
                      <div className="mt-2 text-xs text-muted-foreground">
                        No personalised modes yet. Defaults will be used.
                      </div>
                    ) : (
                      <select
                        id="proof-mode-select"
                        value={selectedModeId}
                        onChange={(e) => setSelectedModeId(e.target.value)}
                        className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">- default -</option>
                        {activeModes.map((mode) => (
                          <option key={mode.mode_id} value={mode.mode_id}>{mode.display_name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="proof-artifact-type">Proof type</Label>
                    <select
                      id="proof-artifact-type"
                      value={artifactType}
                      onChange={(e) => setArtifactType(e.target.value)}
                      className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">{`default (${FIRST_PROOF_DEFAULTS.artifactType})`}</option>
                      {ARTIFACT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
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
                      {pressureFlag ? "ON x1.3" : "OFF"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                    Shipped under real pressure - deadline, exam, live, fatigue, avoidance overcome.
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
                      {transferFlag ? "ON x1.4" : "OFF"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                    Skill transferred to the real world - match, mark, revenue, client outcome.
                  </p>
                </button>
              </div>

              <div>
                <Label htmlFor="proof-attachment" className="flex items-center gap-2">
                  <Paperclip className="h-3.5 w-3.5 text-primary" />
                  Attach supporting evidence (optional)
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  PDF, image, or text up to 10MB. Images and PDFs are run through OCR; text files are read directly. Extracted text is added to the verdict context.
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
                      PDF / PNG / JPG / WEBP / TXT / MD / CSV - max 10MB
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
                          Extracted text ({attachState.extractedSource === "ocr" ? "OCR" : "text file"}) - editable
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
                      <span>{attachmentText.length.toLocaleString()} chars / fed into verdict</span>
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
            </div>

            {selectedMode && (
              <div className="rounded-sm border border-border p-3 text-xs text-muted-foreground">
                Scoring against <span className="text-foreground font-mono">{selectedMode.display_name}</span>.
                {selectedMode.elite_evidence_examples?.[0] && (
                  <div className="mt-1">Mode target: <span className="text-foreground">{selectedMode.elite_evidence_examples[0]}</span></div>
                )}
              </div>
            )}

            <Button
              onClick={submit}
              disabled={
                submitting ||
                attachmentBusy ||
                !content.trim() ||
                !title.trim() ||
                (!firstProofMode && !artifactType.trim())
              }
              className="w-full"
            >
              {submitting
                ? "Submitting…"
                : attachmentBusy
                  ? "Processing attachment…"
                  : firstProofMode
                    ? "Submit first proof"
                    : "Submit proof"}
            </Button>
          </div>
        </Card>

        {/* Pending contracts */}
        {!firstProofMode && (
          <MobileCollapse
            eyebrow="Pending"
            label={`Pending Proof Contracts (${filteredPending.length})`}
          >
            <Card className="panel p-4 max-w-full overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <Gavel className="h-4 w-4 text-primary" />
                <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary m-0">Pending Proof Contracts</h2>
              </div>
              {filteredPending.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending contracts. Open the Coach to forge one.</p>
              ) : (
                <div className="space-y-2">
                  {filteredPending.map((p) => (
                    <Card key={p.id} className="panel p-4 flex items-start justify-between gap-3 flex-wrap max-w-full overflow-hidden">
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-[10px] uppercase text-muted-foreground break-words">{p.domain} - {p.mode}</div>
                        <div className="text-sm font-medium break-words">{p.title}</div>
                        {p.required_artifact && <div className="text-xs text-muted-foreground mt-1 break-words">Required: {p.required_artifact}</div>}
                        {p.evidence_standard && <div className="text-xs text-muted-foreground mt-0.5 break-words">Standard: {p.evidence_standard}</div>}
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
                        Submit proof
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </MobileCollapse>
        )}

        {/* Completed artifacts */}
        {!firstProofMode && (
          <Card className="panel p-4 max-w-full overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <Gavel className="h-4 w-4 text-primary" />
              <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary m-0">Completed Proof Artifacts</h2>
            </div>
            {filteredCompleted.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No proof yet. Submit one measurable artifact to activate the command layer.
              </p>
            ) : (
              <CompletedArtifactsList items={filteredCompleted} />
            )}
          </Card>
        )}

        {/* Missed */}
        {!firstProofMode && (
          <MobileCollapse
            eyebrow="Missed"
            label={`Missed Proof Contracts (${filteredMissed.length})`}
          >
            <Card className="panel p-4 max-w-full overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <Gavel className="h-4 w-4 text-primary" />
                <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary m-0">Missed Proof Contracts</h2>
              </div>
              {filteredMissed.length === 0 ? (
                <p className="text-sm text-muted-foreground">No missed contracts.</p>
              ) : (
                filteredMissed.map((p) => (
                  <Card key={p.id} className="panel p-3 mb-2 max-w-full overflow-hidden"><div className="text-sm break-words">{p.title}</div></Card>
                ))
              )}
            </Card>
          </MobileCollapse>
        )}
      </div>
    </AppShell>
  );
}

function VerdictRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border p-3 min-w-0 max-w-full overflow-hidden">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <p className="mt-1 text-sm break-words whitespace-pre-wrap">{value}</p>
    </div>
  );
}

const COMPLETED_MOBILE_LIMIT = 3;

function CompletedArtifactsList({ items }: { items: any[] }) {
  const [showAll, setShowAll] = useState(false);
  const desktopVisible = items.length;
  return (
    <div className="space-y-3">
      {items.slice(0, desktopVisible).map((a, idx) => (
        <div
          key={a.id}
          className={idx >= COMPLETED_MOBILE_LIMIT && !showAll ? "hidden md:block" : "block"}
        >
          <CompletedArtifactCard artifact={a} />
        </div>
      ))}
      {items.length > COMPLETED_MOBILE_LIMIT && (
        <button
          type="button"
          onClick={() => setShowAll((open) => !open)}
          className="md:hidden font-mono text-[10px] uppercase tracking-widest text-primary hover:underline"
        >
          {showAll ? "Show fewer" : `Show all (${items.length - COMPLETED_MOBILE_LIMIT} more)`}
        </button>
      )}
    </div>
  );
}

function CompletedArtifactCard({ artifact }: { artifact: any }) {
  const [open, setOpen] = useState(false);
  const fullFeedback: string = artifact.feedback ?? "";
  const summary = summariseArtifactContent(fullFeedback);
  const isLong = fullFeedback.length > summary.length;
  return (
    <Card className="panel p-4 max-w-full overflow-hidden">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="font-mono text-[10px] uppercase text-muted-foreground break-words min-w-0">
          {artifact.domain} - {artifact.artifact_type ?? "artifact"} - {artifact.created_at?.slice(0, 10)}
        </div>
        {artifact.evidence_strength && (
          <EvidenceStrengthBadge strength={artifact.evidence_strength} score={artifact.quality_score} />
        )}
      </div>
      <div className="text-sm font-medium mt-1 break-words">{artifact.title}</div>
      {fullFeedback && (
        <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap break-words">
          {open || !isLong ? fullFeedback : summary}
        </p>
      )}
      {artifact.next_upgrade && (
        <p className="text-xs text-primary mt-1 break-words">
          Next upgrade: {extractNextUpgrade({ nextUpgrade: artifact.next_upgrade, content: artifact.content })}
        </p>
      )}
      {artifact.attachment_url && (
        <a
          href={artifact.attachment_url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline break-all"
        >
          <Paperclip className="h-3 w-3 shrink-0" />
          {artifact.attachment_name ?? "attached evidence"}
        </a>
      )}
      {isLong && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-2 font-mono text-[10px] uppercase tracking-widest text-primary hover:underline"
        >
          {open ? "Hide full artifact" : "Show full artifact"}
        </button>
      )}
    </Card>
  );
}
