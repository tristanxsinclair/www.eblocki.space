/**
 * Proof Week — deterministic 7-day validation challenge.
 *
 * Day 1 starts the day the user joins Proof Week (or, by fallback, the
 * date of their first proof artifact). The engine never reads private
 * proof content — only counts and timestamps.
 */

export type ProofWeekDay = {
  day: number; // 1..7
  label: string;
  command: string;
  proofRequired: string;
};

export const PROOF_WEEK_DAYS: ProofWeekDay[] = [
  {
    day: 1,
    label: "Activate",
    command: "Submit your first proof artifact.",
    proofRequired: "One measurable artifact — a paragraph, answer, drill, or shipped change.",
  },
  {
    day: 2,
    label: "Expose fake productivity",
    command: "Name one behaviour today that felt productive but produced no artifact.",
    proofRequired: "Reflection logged + one real artifact instead of the fake pattern.",
  },
  {
    day: 3,
    label: "Do the uncomfortable rep",
    command: "Complete one task you have been avoiding. Quality is illegal for two minutes.",
    proofRequired: "Ugly proof unit — output exists even if rough.",
  },
  {
    day: 4,
    label: "Applied output",
    command: "Produce one artifact applied to a real assessment, customer, match, or shipped target.",
    proofRequired: "Applied artifact tagged with depth or transfer.",
  },
  {
    day: 5,
    label: "Review proof quality",
    command: "Look at this week's proof. Mark the strongest, weakest, and one upgrade.",
    proofRequired: "Quality review reflection — no new artifact required.",
  },
  {
    day: 6,
    label: "Command before work",
    command: "Use the Eblocki command before starting your hardest block today.",
    proofRequired: "Artifact produced during the commanded block.",
  },
  {
    day: 7,
    label: "Verdict and feedback",
    command: "Decide: did this expose fake productivity? Submit feedback and signal intent.",
    proofRequired: "Feedback submitted + waitlist / payment-interest answered.",
  },
];

export type ProofWeekStatus = {
  active: boolean;
  joinedAt: string | null;
  currentDay: number; // 1..7 while active, 0 if not started, 8 if completed
  today: ProofWeekDay | null;
  artifactsThisWeek: number;
  daysWithProof: number;
  completed: boolean;
};

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO + "T00:00:00Z").getTime();
  const to = new Date(toISO + "T00:00:00Z").getTime();
  return Math.floor((to - from) / 86_400_000);
}

/**
 * Derive Proof Week status from a join date and a list of artifact
 * created_at timestamps. Pure function — easy to test.
 */
export function computeProofWeek(input: {
  joinedAt: string | null;
  artifactDates: string[];
  todayISO?: string;
}): ProofWeekStatus {
  const todayISO = (input.todayISO ?? new Date().toISOString()).slice(0, 10);
  if (!input.joinedAt) {
    return {
      active: false,
      joinedAt: null,
      currentDay: 0,
      today: null,
      artifactsThisWeek: 0,
      daysWithProof: 0,
      completed: false,
    };
  }
  const joinISO = input.joinedAt.slice(0, 10);
  const offset = daysBetween(joinISO, todayISO); // 0 == day 1
  const currentDay = Math.max(1, Math.min(8, offset + 1));
  const today = currentDay >= 1 && currentDay <= 7 ? PROOF_WEEK_DAYS[currentDay - 1] : null;

  const windowStart = new Date(joinISO + "T00:00:00Z").getTime();
  const windowEnd = windowStart + 7 * 86_400_000;
  const inWindow = input.artifactDates.filter((iso) => {
    const t = new Date(iso).getTime();
    return t >= windowStart && t < windowEnd;
  });
  const daysWithProof = new Set(inWindow.map((iso) => iso.slice(0, 10))).size;

  return {
    active: currentDay <= 7,
    joinedAt: joinISO,
    currentDay,
    today,
    artifactsThisWeek: inWindow.length,
    daysWithProof,
    completed: currentDay > 7,
  };
}