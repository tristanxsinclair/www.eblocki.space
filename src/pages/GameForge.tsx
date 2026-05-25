import { AppShell } from "@/components/eblocki/AppShell";
import { GameForgeShell } from "@/components/gameforge/GameForgeShell";
import { Seo } from "@/components/Seo";

export default function GameForge() {
  return (
    <AppShell>
      <Seo title="GameForge — Eblocki" description="Turn any topic into playable proof." path="/gameforge" />
      <GameForgeShell />
    </AppShell>
  );
}