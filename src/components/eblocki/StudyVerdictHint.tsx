import type { StudyClassification, StudyVerdict } from "@/lib/eblocki/fake-study-detector";

interface Props {
  classification: StudyClassification;
  /** Header label. Defaults differ for live vs post-submit. */
  label?: string;
  className?: string;
}

const CHIP_STYLES: Record<StudyVerdict, string> = {
  weak: "border-destructive/40 text-destructive bg-destructive/10",
  useful: "border-amber-500/40 text-amber-400 bg-amber-500/10",
  strong: "border-primary/40 text-primary bg-primary/10",
  elite: "border-primary/60 text-primary bg-primary/15",
};

const VERDICT_LABEL: Record<StudyVerdict, string> = {
  weak: "Weak proof",
  useful: "Useful proof",
  strong: "Strong proof",
  elite: "Elite proof",
};

export function StudyVerdictHint({ classification, label = "Activity classification", className }: Props) {
  const { verdict, reason, verdictCopy, upgradeCommand } = classification;
  return (
    <div
      className={`rounded-sm border border-border bg-card/60 p-3 max-w-full overflow-hidden ${className ?? ""}`}
      data-testid="study-verdict-hint"
      data-verdict={verdict}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <span
          className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest ${CHIP_STYLES[verdict]}`}
        >
          {VERDICT_LABEL[verdict]}
        </span>
      </div>
      <p className="mt-2 text-sm text-foreground break-words">{verdictCopy}</p>
      <p className="mt-1 text-xs text-muted-foreground break-words">{reason}</p>
      <div className="mt-3 rounded-sm border border-border/70 bg-background/40 p-2.5">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Proof upgrade command
        </div>
        <p className="mt-1 text-sm text-foreground break-words">{upgradeCommand}</p>
      </div>
    </div>
  );
}
