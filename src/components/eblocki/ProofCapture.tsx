import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Check, Lock, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { logEvent } from "@/lib/eblocki/analytics";
import { normaliseModeKey } from "@/lib/eblocki/mode-templates";
import { previewProof, TIER_LABEL } from "@/lib/eblocki/level-engine";
import { CourtVerdictBadge } from "./CourtVerdictBadge";

export interface ProofCapturePayload {
  proof: string;
  hard: string | null;
  upgrade: string | null;
  qualityRating: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectiveTitle: string;
  modeId?: string | null;
  resistanceLevel?: number;
  onSubmit: (payload: ProofCapturePayload) => Promise<void> | void;
}

const MODE_TO_DOMAIN: Record<string, string> = {
  LAW_MAX: "law",
  PSYCH_HD: "psychology",
  SALES_CLOSE: "sales",
  ATHLETE_MODE: "soccer",
  FINANCE_BASICS: "finance",
  EBLOCKI_BUILD: "eblocki",
  GENERAL_EXECUTION: "life",
};

const WAFFLE_PATTERNS = /^(done|yes|ok|finished|complete|did it|na|n\/a|nothing|good|fine)\b/i;

const MODE_EXAMPLES: Record<string, { proof: string[]; hard: string; upgrade: string }> = {
  LAW_MAX: {
    proof: [
      "IRAC paragraph on statutory interpretation issue — saved to OneNote",
      "Authority checked for jurisdiction and currency on Mabo v Queensland",
    ],
    hard: "Avoiding the application step — kept restating the rule",
    upgrade: "Draft the application sentence FIRST tomorrow, then the rule",
  },
  PSYCH_HD: {
    proof: [
      "CAEE paragraph with one post-2016 source on memory consolidation",
      "Study limitation added to evaluation of Loftus & Palmer",
    ],
    hard: "Finding a post-2016 source on the specific claim",
    upgrade: "Pre-load 3 peer-reviewed sources before starting the paragraph",
  },
  SALES_CLOSE: {
    proof: [
      "GSE objection script written for premium appliance category",
      "Premium appliance comparison angle created vs. mid-tier",
    ],
    hard: "Held the silence after the price reveal",
    upgrade: "Open with the comparison frame next time, not the spec",
  },
  EBLOCKI_BUILD: {
    proof: [
      "Bug fixed and committed — sha 4f3a2 on main",
      "Build note refined, tested, and saved to the work log",
    ],
    hard: "Resisted scope creep on the auth refactor",
    upgrade: "Write the failing test BEFORE the next attempt",
  },
  ATHLETE_MODE: {
    proof: [
      "10 finishing reps completed both feet — videoed",
      "Game movement note recorded after session",
    ],
    hard: "Pushed through the last 3 reps on weaker foot",
    upgrade: "Add a 30s rest cap between sets next session",
  },
  FINANCE_BASICS: {
    proof: [
      "Expense category reviewed — flagged 2 duplicate subscriptions",
      "One saving rule created (round-up to nearest $5)",
    ],
    hard: "Looking at the actual eating-out total",
    upgrade: "Set a weekly review reminder, not monthly",
  },
  GENERAL_EXECUTION: {
    proof: [
      "Resisted task completed — first draft of the email sent",
      "Tomorrow's first move written: open the doc, write the headline",
    ],
    hard: "Starting before I 'felt ready'",
    upgrade: "Pre-commit the first sentence the night before",
  },
};

function qualityCopy(n: number): string {
  return [
    "Surface-level — proves it happened, nothing more.",
    "Shallow — it counts, but the depth isn't there yet.",
    "Solid — real artifact, real effort.",
    "Strong — would hold up to review.",
    "Elite — defendable evidence with a finished output.",
  ][n - 1];
}

export function ProofCapture({
  open,
  onOpenChange,
  objectiveTitle,
  modeId,
  resistanceLevel = 3,
  onSubmit,
}: Props) {
  const [proof, setProof] = useState("");
  const [hard, setHard] = useState("");
  const [upgrade, setUpgrade] = useState("");
  const [quality, setQuality] = useState<number>(3);
  const [submitting, setSubmitting] = useState(false);
  const [locked, setLocked] = useState(false);
  const submittedRef = useRef(false);

  const modeKey = useMemo(() => normaliseModeKey(modeId ?? null), [modeId]);
  const examples = MODE_EXAMPLES[modeKey] ?? MODE_EXAMPLES.GENERAL_EXECUTION;
  const proofPlaceholder = examples.proof[0];
  const highResistance = resistanceLevel >= 4;
  const domainLabel = MODE_TO_DOMAIN[modeKey] ?? "life";

  // Live preview (optimistic — server trigger is authoritative).
  const preview = useMemo(() => {
    if (!proof.trim()) return null;
    return previewProof({
      content: proof.trim(),
      quality,
      pressureFlag: resistanceLevel >= 4,
    });
  }, [proof, quality, resistanceLevel]);

  useEffect(() => {
    if (open) {
      submittedRef.current = false;
      setLocked(false);
      void logEvent("proof_capture_opened", {
        mode: modeKey,
        resistance: resistanceLevel,
      });
    }
  }, [open, modeKey, resistanceLevel]);

  const reset = () => {
    setProof("");
    setHard("");
    setUpgrade("");
    setQuality(3);
    setLocked(false);
  };

  const proofTrim = proof.trim();
  const upgradeTrim = upgrade.trim();
  const checks = [
    { ok: proofTrim.length >= 12, label: "Specific (12+ chars)" },
    { ok: !WAFFLE_PATTERNS.test(proofTrim), label: "Not generic ('done', 'ok'…)" },
    { ok: /\s/.test(proofTrim), label: "Describes an artifact, not a word" },
    {
      ok: !highResistance || upgradeTrim.length >= 4,
      label: highResistance ? "Upgrade required (high resistance)" : "Upgrade optional",
      soft: !highResistance,
    },
  ];
  const canSubmit = checks.every((c) => c.ok || c.soft);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    if (proofTrim.length < 12) {
      toast.error("Be specific. What did you actually produce?");
      void logEvent("proof_capture_rejected", { reason: "too_short" });
      return;
    }
    if (WAFFLE_PATTERNS.test(proofTrim)) {
      toast.error("Anti-waffle: describe the artifact, not the feeling.");
      void logEvent("proof_capture_rejected", { reason: "waffle" });
      return;
    }
    if (highResistance && upgradeTrim.length < 4) {
      toast.error("High-resistance mission — name the upgrade for next time.");
      void logEvent("proof_capture_rejected", { reason: "missing_upgrade" });
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        proof: proofTrim,
        hard: hard.trim() || null,
        upgrade: upgradeTrim || null,
        qualityRating: quality,
      });
      submittedRef.current = true;
      setLocked(true);
      void logEvent("proof_capture_completed", {
        mode: modeKey,
        quality,
        proof_len: proofTrim.length,
        has_upgrade: !!upgradeTrim,
        has_hard: !!hard.trim(),
        resistance: resistanceLevel,
      });
      // Give the lock animation 700ms before closing.
      setTimeout(() => {
        reset();
        onOpenChange(false);
      }, 750);
    } catch {
      // parent toasts the error; keep dialog open for retry
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (submitting) return;
    if (!v) {
      if (!submittedRef.current && (proofTrim || hard.trim() || upgradeTrim)) {
        void logEvent("proof_capture_abandoned", {
          mode: modeKey,
          proof_len: proofTrim.length,
        });
      }
      reset();
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {/* Header strip */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              <ShieldCheck className="h-3 w-3" /> Proof Capture
            </span>
            {modeId && (
              <span className="font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm border border-border text-muted-foreground">
                {modeKey.replace(/_/g, " ")}
              </span>
            )}
            <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Resistance {resistanceLevel}/5
            </span>
          </div>
          <DialogTitle className="text-base leading-snug">{objectiveTitle}</DialogTitle>
          <p className="text-[11px] text-muted-foreground italic">Proof beats intention.</p>
        </DialogHeader>

        {/* Locked-in overlay */}
        {locked && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm animate-in fade-in duration-300 ease-calm">
            <div className="relative h-16 w-16 rounded-full bg-primary/15 border-2 border-primary flex items-center justify-center lock-in-pulse">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
              Evidence locked
            </p>
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Proof &gt; intention
            </p>
          </div>
        )}

        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Proof field */}
          <div>
            <Label htmlFor="pc-proof" className="text-[11px] font-mono uppercase tracking-widest">
              What did you actually produce? *
            </Label>
            <Textarea
              id="pc-proof"
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              rows={3}
              placeholder={proofPlaceholder}
              className="mt-1.5 text-sm"
              autoFocus
            />
            <div className="mt-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <span>{proofTrim.length} chars</span>
              {examples.proof[1] && (
                <button
                  type="button"
                  onClick={() => setProof(examples.proof[1])}
                  className="hover:text-foreground"
                >
                  Use example
                </button>
              )}
            </div>
          </div>

          {/* Quality rating */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-mono uppercase tracking-widest">
                Proof quality (self)
              </Label>
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                {quality}/5
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setQuality(n)}
                  className={cn(
                    "h-9 flex-1 rounded-sm border text-xs font-mono transition-all touch-manipulation",
                    n <= quality
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                  aria-label={`Quality ${n}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{qualityCopy(quality)}</p>
          </div>

          {/* Hard part */}
          <div>
            <Label htmlFor="pc-hard" className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              What made this harder than expected?
            </Label>
            <Textarea
              id="pc-hard"
              value={hard}
              onChange={(e) => setHard(e.target.value)}
              rows={2}
              placeholder={examples.hard}
              className="mt-1.5 text-sm"
            />
          </div>

          {/* Upgrade */}
          <div>
            <Label htmlFor="pc-upgrade" className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              What is the upgrade next time? {highResistance && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="pc-upgrade"
              value={upgrade}
              onChange={(e) => setUpgrade(e.target.value)}
              rows={2}
              placeholder={examples.upgrade}
              className="mt-1.5 text-sm"
            />
          </div>

          {/* Validation checklist */}
          <div className="rounded-md border border-border p-3 bg-muted/20">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Valid proof checklist
              </span>
            </div>
            {preview && (
              <div className="mb-3 -mx-1 px-2 py-2 rounded-sm border border-primary/20 bg-primary/[0.04] flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                    Predicted
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-sm border border-border text-foreground">
                    T{preview.tier} · {TIER_LABEL[preview.tier]}
                  </span>
                  <CourtVerdictBadge verdict={preview.verdict} />
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {domainLabel}
                  </span>
                </div>
                <span className={cn(
                  "font-mono text-xs tabular-nums",
                  preview.xp.final > 0 ? "text-primary" : "text-destructive",
                )}>
                  {preview.xp.final > 0 ? `+${preview.xp.final} XP` : "0 XP"}
                </span>
              </div>
            )}
            <ul className="space-y-1">
              {checks.map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-[11px]">
                  <span
                    className={cn(
                      "h-3.5 w-3.5 rounded-full flex items-center justify-center border",
                      c.ok
                        ? "border-primary bg-primary/15 text-primary"
                        : c.soft
                        ? "border-border text-muted-foreground"
                        : "border-destructive/50 text-destructive",
                    )}
                  >
                    {c.ok && <Check className="h-2.5 w-2.5" />}
                  </span>
                  <span className={cn(c.ok ? "text-foreground" : "text-muted-foreground")}>
                    {c.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Resistance → proof conversion */}
          <div className="flex items-start gap-2 text-[11px] text-muted-foreground border-l-2 border-primary/40 pl-2 italic">
            <Zap className="h-3 w-3 text-primary mt-0.5 shrink-0" />
            <span>
              Resistance {resistanceLevel}/5 converted into quality {quality}/5 evidence. That is how identity compounds.
            </span>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
            className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            size="sm"
            className="min-w-[140px]"
          >
            {submitting ? "Locking…" : "Lock in evidence"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
