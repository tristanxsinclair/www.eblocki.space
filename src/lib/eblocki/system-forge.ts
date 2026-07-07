import { scoreProofArtifact, type EvidenceStrength } from "./proof-scoring";

export type SystemForgeDomain =
  | "law"
  | "sales"
  | "spanish"
  | "football"
  | "founder"
  | "study"
  | "fitness"
  | "general";

export interface SystemForgeInput {
  domain: string;
  improvementGoal: string;
  desiredOutcome: string;
  currentBottleneck: string;
  availableMinutesPerDay: number;
}

export interface SystemForgeRubricItem {
  criterion: string;
  weak: string;
  strong: string;
}

export interface SystemForgeLevel {
  level: string;
  standard: string;
}

export interface SystemForgeWeeklyBlock {
  day: string;
  focus: string;
  command: string;
}

export interface SystemForgeDraft {
  name: string;
  domain: SystemForgeDomain;
  goal: string;
  outcome: string;
  bottleneck: string;
  availableMinutesPerDay: number;
  skills: string[];
  dailyLoop: string;
  weeklyStructure: SystemForgeWeeklyBlock[];
  minimumViableRep: string;
  proofArtifacts: string[];
  scoringRubric: SystemForgeRubricItem[];
  progressionLevels: SystemForgeLevel[];
  reviewCycle: string;
  firstCommand: string;
  activeCommand: string;
  artifactType: string;
}

export interface SystemForgeRepEvaluation {
  score: number;
  verdict: EvidenceStrength;
  why: string;
  weakness: string;
  nextUpgrade: string;
}

interface DomainPreset {
  domain: SystemForgeDomain;
  label: string;
  skills: string[];
  proofArtifacts: string[];
  artifactType: string;
  firstCommand: string;
  rubric: SystemForgeRubricItem[];
}

const DOMAIN_PRESETS: Record<SystemForgeDomain, DomainPreset> = {
  law: {
    domain: "law",
    label: "Law",
    skills: ["issue spotting", "rule extraction", "authority use", "application", "IRAC writing"],
    proofArtifacts: ["IRAC paragraph", "case brief", "statute map", "authority table"],
    artifactType: "IRAC paragraph",
    firstCommand: "Write one 10-minute IRAC paragraph using one authority and score it against the rubric.",
    rubric: [
      { criterion: "Issue", weak: "Issue is broad or implied.", strong: "Issue is named in one precise sentence." },
      { criterion: "Authority", weak: "No source or rule is used.", strong: "One authority is used accurately." },
      { criterion: "Application", weak: "Rule is described without facts.", strong: "Facts are applied to the rule." },
      { criterion: "Conclusion", weak: "No defensible answer.", strong: "Conclusion follows from the application." },
    ],
  },
  sales: {
    domain: "sales",
    label: "Sales",
    skills: ["customer diagnosis", "objection handling", "value framing", "attachment logic", "post-shift review"],
    proofArtifacts: ["objection log", "improved explanation", "customer insight", "attachment reflection"],
    artifactType: "objection log",
    firstCommand: "Log three customer objections, write the response used, and create one improved explanation for next shift.",
    rubric: [
      { criterion: "Customer signal", weak: "Objection is generic.", strong: "Customer words and context are captured." },
      { criterion: "Response quality", weak: "Response is defensive or vague.", strong: "Response diagnoses need and reframes value." },
      { criterion: "Upgrade", weak: "No next script exists.", strong: "A better explanation is ready for next shift." },
    ],
  },
  spanish: {
    domain: "spanish",
    label: "Spanish",
    skills: ["recall", "speaking", "listening", "sentence formation", "conversation confidence"],
    proofArtifacts: ["voice note", "transcript", "phrase list", "correction log"],
    artifactType: "voice note transcript",
    firstCommand: "Record a 90-second Spanish voice note about your routine and submit the transcript or reflection.",
    rubric: [
      { criterion: "Output", weak: "Only passive review.", strong: "A spoken or written Spanish artifact exists." },
      { criterion: "Accuracy", weak: "Mistakes are ignored.", strong: "At least one correction is logged." },
      { criterion: "Recall", weak: "Copied phrases only.", strong: "Sentences are produced from memory." },
    ],
  },
  football: {
    domain: "football",
    label: "Football",
    skills: ["finishing", "movement", "scanning", "decision-making", "match transfer"],
    proofArtifacts: ["drill log", "finishing count", "tactical note", "match reflection"],
    artifactType: "training log",
    firstCommand: "Complete one 20-minute finishing drill and log shots, goals, misses, and one correction.",
    rubric: [
      { criterion: "Rep count", weak: "Training is described vaguely.", strong: "Shots, goals, misses, and time are logged." },
      { criterion: "Correction", weak: "No technical adjustment.", strong: "One correction is named for the next drill." },
      { criterion: "Transfer", weak: "No match link.", strong: "The drill is connected to match behaviour." },
    ],
  },
  founder: {
    domain: "founder",
    label: "Founder",
    skills: ["shipping", "user feedback", "validation", "bug fixing", "sales/outreach"],
    proofArtifacts: ["shipped change", "user interview", "bug fix", "experiment result"],
    artifactType: "shipped change or user-feedback artifact",
    firstCommand: "Ship one small product improvement or write one user-feedback artifact with the decision it creates.",
    rubric: [
      { criterion: "Shipping", weak: "Only ideas are listed.", strong: "A change, interview, or experiment exists." },
      { criterion: "Decision", weak: "No decision is created.", strong: "The artifact forces a product or sales decision." },
      { criterion: "Evidence", weak: "Opinion replaces user signal.", strong: "A user, test, or behaviour signal is included." },
    ],
  },
  study: {
    domain: "study",
    label: "Study",
    skills: ["recall", "worked examples", "source use", "error correction", "assessment transfer"],
    proofArtifacts: ["practice answer", "source-bank entry", "correction log", "worked example"],
    artifactType: "practice answer",
    firstCommand: "Write one 15-minute practice answer from memory, mark the weak line, and write the corrected version.",
    rubric: [
      { criterion: "Retrieval", weak: "Notes are reread.", strong: "An answer is produced from memory." },
      { criterion: "Correction", weak: "Mistake is hidden.", strong: "The weak line and corrected version are visible." },
      { criterion: "Assessment fit", weak: "Task is disconnected from the assessment.", strong: "The artifact matches assessment format." },
    ],
  },
  fitness: {
    domain: "fitness",
    label: "Fitness",
    skills: ["movement quality", "progressive load", "consistency", "recovery awareness", "technique correction"],
    proofArtifacts: ["training log", "set record", "technique note", "recovery reflection"],
    artifactType: "training log",
    firstCommand: "Complete one 20-minute training block and log sets, reps, load or pace, and one technique correction.",
    rubric: [
      { criterion: "Training evidence", weak: "Workout is claimed but not logged.", strong: "Sets, reps, time, load, or pace are logged." },
      { criterion: "Quality", weak: "Only completion matters.", strong: "Technique or recovery weakness is named." },
      { criterion: "Progression", weak: "No next standard.", strong: "Next session has a measurable upgrade." },
    ],
  },
  general: {
    domain: "general",
    label: "General",
    skills: ["output", "consistency", "friction exposure", "review", "next command"],
    proofArtifacts: ["completed artifact", "reflection", "friction task", "next action"],
    artifactType: "visible artifact",
    firstCommand: "Produce one visible artifact in 20 minutes and write the next upgrade.",
    rubric: [
      { criterion: "Artifact", weak: "Only intention is described.", strong: "A visible output is produced." },
      { criterion: "Specificity", weak: "The proof is vague.", strong: "The artifact, time, and result are concrete." },
      { criterion: "Upgrade", weak: "No next standard.", strong: "The next command is sharper than the first." },
    ],
  },
};

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normaliseDomain(value: string): SystemForgeDomain {
  const domain = clean(value).toLowerCase();
  if (domain.includes("law") || domain.includes("legal")) return "law";
  if (domain.includes("sale") || domain.includes("retail")) return "sales";
  if (domain.includes("spanish") || domain.includes("language")) return "spanish";
  if (domain.includes("football") || domain.includes("soccer")) return "football";
  if (domain.includes("founder") || domain.includes("startup") || domain.includes("product")) return "founder";
  if (domain.includes("study") || domain.includes("academic") || domain.includes("school") || domain.includes("uni")) return "study";
  if (domain.includes("fitness") || domain.includes("gym") || domain.includes("run")) return "fitness";
  return "general";
}

function minutes(value: number): number {
  if (!Number.isFinite(value)) return 20;
  return Math.max(5, Math.min(180, Math.round(value)));
}

function timebox(value: number): string {
  if (value <= 10) return `${Math.max(5, value - 2)} minutes`;
  if (value <= 20) return `${value} minutes`;
  return `${Math.min(25, value)} minutes`;
}

function firstCommandFor(preset: DomainPreset, availableMinutes: number): string {
  if (availableMinutes <= 10) {
    return `Spend ${Math.max(5, availableMinutes - 2)} minutes producing one rough ${preset.proofArtifacts[0]} and 2 minutes logging the weakness.`;
  }
  return preset.firstCommand;
}

function minimumRepFor(preset: DomainPreset, availableMinutes: number): string {
  if (availableMinutes <= 10) {
    return `One rough ${preset.proofArtifacts[0]} plus one named weakness inside ${availableMinutes} minutes.`;
  }
  return `One ${timebox(availableMinutes)} rep that creates a ${preset.proofArtifacts[0]} and one correction.`;
}

function weeklyStructureFor(preset: DomainPreset, availableMinutes: number): SystemForgeWeeklyBlock[] {
  const firstArtifact = preset.proofArtifacts[0];
  const secondArtifact = preset.proofArtifacts[1] ?? firstArtifact;
  return [
    { day: "Day 1", focus: "Baseline", command: `Create one ${firstArtifact} and expose the current weakness.` },
    { day: "Day 2", focus: "Correction", command: `Repeat the rep with one correction from Day 1.` },
    { day: "Day 3", focus: "Pressure", command: `Run the same artifact under a ${timebox(availableMinutes)} cap.` },
    { day: "Day 4", focus: "Variation", command: `Create one ${secondArtifact} that trains the same bottleneck.` },
    { day: "Day 5", focus: "Transfer", command: "Apply the skill in a realistic context and log the result." },
    { day: "Day 6", focus: "Review", command: "Compare two artifacts and identify the repeated weakness." },
    { day: "Day 7", focus: "Upgrade", command: "Raise one scoring standard and set next week's first command." },
  ];
}

function progressionLevelsFor(preset: DomainPreset): SystemForgeLevel[] {
  return [
    { level: "Baseline", standard: `A ${preset.proofArtifacts[0]} exists, even if rough.` },
    { level: "Building", standard: "The artifact answers the command with specific detail." },
    { level: "Solid", standard: "The artifact includes correction and measurable completion." },
    { level: "Strong", standard: "The correction improves the next rep under a constraint." },
    { level: "Elite", standard: "The artifact transfers to real performance and defines the next standard." },
  ];
}

export function generateSystemForgeDraft(input: SystemForgeInput): SystemForgeDraft {
  const domain = normaliseDomain(input.domain);
  const preset = DOMAIN_PRESETS[domain];
  const availableMinutesPerDay = minutes(input.availableMinutesPerDay);
  const goal = clean(input.improvementGoal) || `Improve ${preset.label.toLowerCase()} performance`;
  const outcome = clean(input.desiredOutcome) || "Produce better proof each week";
  const bottleneck = clean(input.currentBottleneck) || "Avoiding the artifact-producing rep";
  const firstCommand = firstCommandFor(preset, availableMinutesPerDay);
  const bottleneckSkill = bottleneck.length > 3 ? `${bottleneck} diagnosis` : "bottleneck diagnosis";

  return {
    name: `${preset.label} Proof System`,
    domain,
    goal,
    outcome,
    bottleneck,
    availableMinutesPerDay,
    skills: [...preset.skills, bottleneckSkill],
    dailyLoop: `Run one ${timebox(availableMinutesPerDay)} artifact rep, score it, name the weakness, and set the next command.`,
    weeklyStructure: weeklyStructureFor(preset, availableMinutesPerDay),
    minimumViableRep: minimumRepFor(preset, availableMinutesPerDay),
    proofArtifacts: preset.proofArtifacts,
    scoringRubric: preset.rubric,
    progressionLevels: progressionLevelsFor(preset),
    reviewCycle: "Every 7 days: keep the artifact type, raise one scoring standard, and remove one avoidance pattern.",
    firstCommand,
    activeCommand: firstCommand,
    artifactType: preset.artifactType,
  };
}

export function isArtifactProducingCommand(command: string): boolean {
  const text = command.toLowerCase();
  const action = /\b(write|record|log|complete|ship|produce|producing|create|submit|draft|spend)\b/.test(text);
  const artifact = /\b(paragraph|authority|rubric|objection|explanation|voice note|transcript|drill|shots|goals|product improvement|feedback artifact|practice answer|training block|artifact|log|reflection|rough)\b/.test(text);
  const timeboxed = /\b(\d+[-\s]?(minutes?|mins?|seconds?|secs?)|shift|next session|next shift)\b/.test(text);
  return action && artifact && timeboxed;
}

export function evaluateSystemForgeRep(input: {
  system: Pick<SystemForgeDraft, "domain" | "artifactType" | "activeCommand">;
  proofContent: string;
  selfScore?: number | null;
}): SystemForgeRepEvaluation {
  const content = clean(input.proofContent);
  const score = scoreProofArtifact({
    domain: input.system.domain,
    title: input.system.activeCommand,
    artifactType: input.system.artifactType,
    content,
    reflection: content,
  });
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const hasCorrection = /\b(correct|correction|weakness|missed|next time|upgrade|fix|improve)\b/i.test(content);
  const hasMeasure = /\b\d+|minute|min|score|shots|goals|words|customer|authority|case|set|rep|version\b/i.test(content);

  let weakness = "The artifact exists, but the next rep needs a sharper constraint.";
  if (wordCount < 20) {
    weakness = "Proof is too thin: it does not show enough artifact detail to judge the rep.";
  } else if (!hasMeasure) {
    weakness = "The proof lacks measurable detail: add time, count, source, result, or observable output.";
  } else if (!hasCorrection) {
    weakness = "The proof does not name the weakness or correction, so the next rep cannot improve cleanly.";
  } else if (input.selfScore && input.selfScore >= 9 && score.qualityScore <= 6) {
    weakness = "Self-score is ahead of the evidence. Lower confidence and add concrete artifact detail.";
  }

  return {
    score: score.qualityScore,
    verdict: score.evidenceStrength,
    why: score.feedback,
    weakness,
    nextUpgrade: score.nextUpgrade,
  };
}
