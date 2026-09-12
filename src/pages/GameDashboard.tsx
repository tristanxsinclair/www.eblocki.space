import { useEffect, useMemo, useRef } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/eblocki/AppShell";
import { LifeGameHud } from "@/components/eblocki/life-game/LifeGameHud";
import { Seo } from "@/components/Seo";
import { Skeleton } from "@/components/ui/skeleton";
import { useLifeGameSnapshot } from "@/hooks/useLifeGameSnapshot";
import { useQuestReconciliation } from "@/hooks/useQuestReconciliation";
import { useWelcomeGate } from "@/hooks/useWelcomeGate";
import { logEvent } from "@/lib/eblocki/analytics";
import {
  isSafeLifeGameRecordId,
  projectEvidenceSettlement,
} from "@/lib/eblocki/life-game";

const PANEL_TARGETS = new Map([
  ["quests", "quests"],
  ["stats", "stats"],
  ["director", "quests"],
  ["gm", "quests"],
  ["run-log", "run-log"],
  ["intel", "intel"],
]);

export default function GameDashboard() {
  const welcomeCheck = useWelcomeGate();
  const [params, setParams] = useSearchParams();
  const { snapshot, loading, refreshing, refresh } = useLifeGameSnapshot();
  const { repairedCount } = useQuestReconciliation();
  const viewed = useRef(false);
  const settlementPoll = useRef({ artifactId: "", attempts: 0 });
  const settlementLogged = useRef("");
  const panel = params.get("panel");
  const panelTarget = panel ? PANEL_TARGETS.get(panel) ?? null : null;
  const resultHint = params.get("result");
  const settlementId = isSafeLifeGameRecordId(resultHint) ? resultHint : null;
  const settlement = useMemo(
    () => (snapshot && settlementId ? projectEvidenceSettlement(snapshot, settlementId) : null),
    [settlementId, snapshot],
  );

  useEffect(() => {
    if ((repairedCount ?? 0) > 0) void refresh();
  }, [refresh, repairedCount]);

  useEffect(() => {
    if (!snapshot || viewed.current) return;
    viewed.current = true;
    void logEvent("life_game_hud_viewed", {
      route: "/dashboard",
      source: "authenticated",
    });
  }, [snapshot]);

  useEffect(() => {
    if (!snapshot || !panelTarget) return;
    document.getElementById(panelTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
    void logEvent("life_game_panel_opened", {
      route: "/dashboard",
      panel: panelTarget,
    });
  }, [panelTarget, snapshot]);

  useEffect(() => {
    if (!settlementId) {
      settlementPoll.current = { artifactId: "", attempts: 0 };
      return;
    }
    if (settlementPoll.current.artifactId !== settlementId) {
      settlementPoll.current = { artifactId: settlementId, attempts: 0 };
    }
  }, [settlementId]);

  useEffect(() => {
    if (!settlementId || !settlement) return;

    if (settlement.state === "settled") {
      const logKey = `${settlementId}:${settlement.state}`;
      if (settlementLogged.current !== logKey) {
        settlementLogged.current = logKey;
        void logEvent("life_game_settlement_viewed", {
          route: "/dashboard",
          statKey: settlement.stat,
          evidenceStrength: settlement.evidenceStrength,
          verdict: settlement.courtVerdict,
          syncState: "complete",
        });
      }
      return;
    }

    if (settlement.state === "unavailable" || settlementPoll.current.attempts >= 4) return;
    const delays = [700, 1_400, 2_600, 4_200];
    const delay = delays[settlementPoll.current.attempts] ?? delays[delays.length - 1];
    const timer = window.setTimeout(() => {
      settlementPoll.current.attempts += 1;
      void refresh();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [refresh, settlement, settlementId]);

  const dismissSettlement = () => {
    const next = new URLSearchParams(params);
    next.delete("result");
    setParams(next, { replace: true });
  };

  if (welcomeCheck === "needs") {
    return <Navigate to="/welcome" replace />;
  }

  return (
    <AppShell>
      <Seo
        title="Life Game — Eblocki"
        description="Turn real actions into evidence, verdicts, and authoritative XP."
        path="/dashboard"
      />
      {welcomeCheck === "checking" || loading || !snapshot ? (
        <div className="operator-page-wide">
          <Skeleton className="h-44 w-full" />
          <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
            <Skeleton className="h-[420px]" />
            <Skeleton className="h-[420px]" />
            <Skeleton className="h-[420px]" />
          </div>
        </div>
      ) : (
        <LifeGameHud
          snapshot={snapshot}
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          settlementId={settlementId}
          onDismissSettlement={settlementId ? dismissSettlement : undefined}
        />
      )}
    </AppShell>
  );
}
