import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { EblockiLogo } from "@/components/eblocki/EblockiLogo";
import { LifeGameHud } from "@/components/eblocki/life-game/LifeGameHud";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { createLifeGameDemoSnapshot } from "@/lib/eblocki/life-game";

export default function Demo() {
  const [params, setParams] = useSearchParams();
  const snapshot = useMemo(() => createLifeGameDemoSnapshot(new Date()), []);
  const resultHint = params.get("result");
  const settlementId = snapshot.runLog.some(
    (entry) => entry.kind === "action" && entry.id === resultHint,
  )
    ? resultHint
    : null;

  const dismissSettlement = () => {
    const next = new URLSearchParams(params);
    next.delete("result");
    setParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Play the Eblocki Demo"
        description="Explore a read-only sample life game where real actions require evidence."
        path="/demo"
      />
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur safe-top safe-x">
        <div className="container flex min-h-16 items-center justify-between gap-3">
          <Link to="/" className="native-tap">
            <EblockiLogo variant="compact" size="md" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="hidden font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:block"
            >
              Exit demo
            </Link>
            <Button asChild size="sm">
              <Link to="/auth">
                Start your run <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <LifeGameHud
        snapshot={snapshot}
        demo
        settlementId={settlementId}
        settlementPreviewHref="/demo?result=demo-log-action-1"
        onDismissSettlement={settlementId ? dismissSettlement : undefined}
      />
    </div>
  );
}
