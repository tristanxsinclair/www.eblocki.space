import { cn } from "@/lib/utils";
import { type CourtVerdict } from "@/lib/eblocki/level-engine";
import { plainCourtVerdict } from "@/lib/eblocki/user-facing-copy";

const TONE: Record<CourtVerdict, string> = {
  rejected: "border-destructive/40 text-destructive bg-destructive/10",
  accepted_minimum: "border-muted-foreground/30 text-muted-foreground bg-muted/30",
  accepted_useful: "border-accent/40 text-accent bg-accent/10",
  accepted_strong: "border-primary/40 text-primary bg-primary/10",
  elite: "border-primary text-primary bg-primary/15 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.6)]",
};

export function CourtVerdictBadge({
  verdict,
  className,
}: { verdict: CourtVerdict; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border font-mono text-[10px] uppercase tracking-[0.18em]",
        TONE[verdict],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {plainCourtVerdict(verdict)}
    </span>
  );
}