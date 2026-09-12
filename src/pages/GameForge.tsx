import { AppShell } from "@/components/eblocki/AppShell";
import { GameForgeShell } from "@/components/gameforge/GameForgeShell";
import { Seo } from "@/components/Seo";

export default function GameForge() {
  return (
    <AppShell>
      <Seo
        title="Arena — Eblocki"
        description="Practise under pressure, then file a reviewed result into the evidence loop."
        path="/gameforge"
      />
      <GameForgeShell />
    </AppShell>
  );
}
