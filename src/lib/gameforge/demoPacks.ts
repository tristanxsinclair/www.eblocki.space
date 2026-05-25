import type { GamePack } from "./types";
import { generateLocalGamePack } from "./packGenerator";

export const DEMO_SEEDS: Array<{
  label: string;
  source: string;
  mode: GamePack["mode"];
  intensity: GamePack["intensity"];
  style: GamePack["style"];
}> = [
  {
    label: "LAWS1005 Statutory Interpretation Quest",
    source:
      "statutory interpretation purposive literal mischief golden rule context legislation parliament intention ambiguity construction",
    mode: "law_max",
    intensity: "exam_prep",
    style: "full_lesson_path",
  },
  {
    label: "PSYC1000 Social Psychology Arena",
    source:
      "conformity obedience attribution dissonance heuristics persuasion stereotype prejudice attitude behaviour cognition culture",
    mode: "psych_hd",
    intensity: "focused",
    style: "application_challenge",
  },
  {
    label: "The Good Guys Premium Sales Sprint",
    source:
      "discovery diagnosis features benefits value objection close warranty financing premium attachment bundle margin",
    mode: "sales_close",
    intensity: "boss_fight",
    style: "scenario_simulator",
  },
  {
    label: "Spanish Travel Conversation Path",
    source: "saludos comida hotel direcciones transporte numeros emergencia tiempo familia compras",
    mode: "language_grind",
    intensity: "casual",
    style: "memory_drill",
  },
  {
    label: "Soccer False 9 Tactical Boss Battle",
    source: "pressing transitions overload halfspace rotation false nine combination third man inverted fullback",
    mode: "sport_iq",
    intensity: "elite_mastery",
    style: "boss_battle",
  },
  {
    label: "Financial Literacy Starter Pack",
    source: "budget compound interest inflation diversification liquidity equity debt risk return tax savings",
    mode: "finance_builder",
    intensity: "focused",
    style: "mixed_mode",
  },
];

export function buildDemoPack(index: number): GamePack {
  const seed = DEMO_SEEDS[index % DEMO_SEEDS.length];
  const pack = generateLocalGamePack({
    sourceMaterial: seed.source,
    mode: seed.mode,
    intensity: seed.intensity,
    style: seed.style,
  });
  return { ...pack, title: seed.label };
}