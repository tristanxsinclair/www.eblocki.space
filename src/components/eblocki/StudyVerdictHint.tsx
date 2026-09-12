import type { StudyClassification } from "@/lib/eblocki/fake-study-detector";
interface Props { classification: StudyClassification; label?: string; className?: string }
/** A lexical method signal is never a second evidence verdict. */
export function StudyVerdictHint({ classification, className }: Props) {
  return <div className={`rounded-sm border border-border bg-card/60 p-3 max-w-full overflow-hidden ${className ?? ""}`} data-testid="study-verdict-hint">
    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Study method signal</span>
    <p className="mt-2 text-xs text-muted-foreground break-words">Detected wording: {classification.matchedSignal.replace(/_/g, " ").replace(/^(weak|useful|strong|elite) /, "")}. This describes language in the submission; it does not verify the method or change the artifact verdict.</p>
  </div>;
}
