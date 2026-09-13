import type { CorrectionComparison as Comparison } from "@/lib/eblocki/correction-assessment";
export function CorrectionComparison({ comparison }: { comparison: Comparison }) {
  return <section className="mt-3 min-w-0 max-w-full rounded-sm border border-border bg-background/50 p-3 break-words [overflow-wrap:anywhere]" data-testid="correction-comparison">
    <h3 className="text-sm font-semibold">Correction result</h3>
    <p className="mt-2 text-sm">Original: {comparison.originalStrength ?? "unknown"} · {comparison.originalScore ?? "?"}/10 → Corrected: {comparison.newStrength} · {comparison.newScore}/10</p>
    <p className="mt-1 text-sm">Raw score change: {comparison.scoreDelta == null ? "unknown" : `${comparison.scoreDelta > 0 ? "+" : ""}${comparison.scoreDelta}`}</p>
    <p className="mt-2 text-sm">Requested correction: {comparison.requestedCorrection}</p>
    <p className="mt-2 text-sm">Gap: {comparison.status.replace(/_/g, " ")} · Structural change: {comparison.change}</p>
    <p className="mt-2 text-xs text-muted-foreground">{comparison.explanation}</p>
    {comparison.improved.map(item => <p className="mt-2 text-sm" key={item}>{item}</p>)}
    {comparison.remaining.map(item => <p className="mt-2 text-xs text-muted-foreground" key={item}>{item}</p>)}
  </section>;
}
