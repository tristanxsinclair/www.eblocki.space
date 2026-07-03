import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ShieldCheck, AlertTriangle } from "lucide-react";
import {
  buildProductMatchingResult,
  type ProductMatchingInput,
} from "@/lib/eblocki/product-matching";
import { logEvent } from "@/lib/eblocki/analytics";

interface Props extends ProductMatchingInput {}

/**
 * Trust-gated product/feature recommendation. Renders at most one card.
 * Stays silent when behavioural evidence is too thin.
 */
export function ProductMatchPanel(props: Props) {
  const result = useMemo(() => buildProductMatchingResult(props), [props]);
  const primary = result.recommendedMatches[0] ?? null;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (result.primaryNeed) {
      logEvent("product_need_detected", {
        domain: result.primaryNeed.domain,
        needSource: result.primaryNeed.source,
        needUrgency: result.primaryNeed.urgency,
      });
    }
    if (primary) {
      logEvent("product_match_shown", {
        matchCategory: primary.category,
        monetisationType: primary.monetisationType,
        fitScore: Math.round(primary.fitScore * 100) / 100,
        accessLevel: props.accessLevel ?? "free",
      });
      if (primary.monetisationType === "internal_pro") {
        logEvent("upgrade_cta_shown", { accessLevel: props.accessLevel ?? "free" });
      }
    }
  }, [result.primaryNeed?.id, primary?.id]);

  if (dismissed) return null;

  if (!result.primaryNeed) {
    return (
      <Card className="panel p-4 border-border/80 bg-card/50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          <span className="font-mono text-[10px] uppercase tracking-widest">Recommendation engine</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {result.recommendationSummary}
        </p>
      </Card>
    );
  }

  if (!primary) {
    return (
      <Card className="panel p-4 border-border/80 bg-card/50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          <span className="font-mono text-[10px] uppercase tracking-widest">Need detected, no trusted match</span>
        </div>
        <p className="mt-2 text-sm">
          Need: <span className="text-foreground">{result.primaryNeed.need}</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{result.recommendationSummary}</p>
      </Card>
    );
  }

  const onClick = () => {
    logEvent("product_match_clicked", {
      matchCategory: primary.category,
      monetisationType: primary.monetisationType,
    });
    if (primary.monetisationType === "internal_pro") {
      logEvent("upgrade_clicked", { accessLevel: props.accessLevel ?? "free" });
    }
  };

  const onDismiss = () => {
    logEvent("product_match_dismissed", {
      matchCategory: primary.category,
      monetisationType: primary.monetisationType,
    });
    setDismissed(true);
  };

  return (
    <Card className="panel p-4 border-primary/30 bg-primary/5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Need detected</span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          {primary.monetisationType.replace(/_/g, " ")}
        </span>
      </div>
      <h3 className="mt-2 text-base font-semibold">{primary.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{primary.description}</p>
      <div className="mt-3 rounded-sm border border-border bg-background/40 p-2 text-xs text-muted-foreground">
        <span className="text-foreground">Why this fits:</span> {primary.fitReason}
        {result.primaryNeed.evidence.length > 0 && (
          <ul className="mt-1 list-disc pl-4">
            {result.primaryNeed.evidence.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </div>
      {result.trustWarning && (
        <div className="mt-3 flex items-start gap-2 rounded-sm border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{result.trustWarning}</span>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={onClick}>{primary.ctaLabel}</Button>
        <Button size="sm" variant="outline" onClick={onDismiss}>Dismiss</Button>
      </div>
    </Card>
  );
}