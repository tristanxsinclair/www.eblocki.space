export type BehaviouralState =
  | "locked_in" | "avoidant" | "overloaded" | "low_energy"
  | "hype_drift" | "recovery" | "momentum" | "scattered"
  | "academic_displacement" | "strategic_build";

export const STATE_LABELS: Record<BehaviouralState, string> = {
  locked_in: "Locked In",
  avoidant: "Avoidant",
  overloaded: "Overloaded",
  low_energy: "Low Energy",
  hype_drift: "Hype Drift",
  recovery: "Recovery",
  momentum: "Momentum",
  scattered: "Scattered",
  academic_displacement: "Academic Displacement",
  strategic_build: "Strategic Build",
};

export const STATE_PRESCRIPTION: Record<BehaviouralState, string> = {
  locked_in: "Protect momentum. Ship the proof artifact already in motion.",
  avoidant: "Reduce scope. Define the smallest first proof artifact and start a 5-minute timer.",
  overloaded: "Triage. Pick one prime objective. Park the rest until that ships.",
  low_energy: "Drop to the 5-minute entry version. Any artifact beats a perfect plan.",
  hype_drift: "Stop ideating. Convert one idea into a shippable artifact in the next 30 minutes.",
  recovery: "Controlled recovery. One light proof, then rest deliberately.",
  momentum: "Continue. Do not redesign the plan. Ship the next artifact.",
  scattered: "One objective. One artifact. One timer. Close all other tabs.",
  academic_displacement: "Return to the rubric. Write answer-ready work, not adjacent prep.",
  strategic_build: "Ship one feature increment. Document the decision in one line.",
};

const PATTERNS: { state: BehaviouralState; markers: RegExp[] }[] = [
  { state: "avoidant", markers: [/reorganis|reorganiz|tidy|clean.*notes|setup|set up|plan again|maybe i should/i, /don'?t feel like|can'?t start|stuck|circling/i] },
  { state: "overloaded", markers: [/too much|so much|everything|overwhelm|behind on|drowning/i] },
  { state: "low_energy", markers: [/tired|exhausted|drained|no energy|burnt out|burned out|sick/i] },
  { state: "hype_drift", markers: [/big idea|huge plan|going to revolution|empire|change the world|launch.*everything/i] },
  { state: "scattered", markers: [/can'?t focus|distract|jumping|all over|fragment/i] },
  { state: "academic_displacement", markers: [/notes about notes|colour cod|colored cod|re-?reading|highlighting again/i] },
  { state: "recovery", markers: [/rest day|need a break|recover|deload/i] },
  { state: "momentum", markers: [/on a roll|momentum|in flow|cooking|locked|just shipped/i] },
  { state: "locked_in", markers: [/locked in|deep work|focused|finishing/i] },
  { state: "strategic_build", markers: [/building eblocki|new feature|architect|design the system/i] },
];

export function detectState(text: string): BehaviouralState {
  const t = text.toLowerCase();
  for (const p of PATTERNS) {
    if (p.markers.some((r) => r.test(t))) return p.state;
  }
  // Default heuristic on length / verbs
  if (t.length < 40) return "low_energy";
  if (/\b(write|draft|study|build|train|ship|finish|complete)\b/.test(t)) return "momentum";
  return "scattered";
}
