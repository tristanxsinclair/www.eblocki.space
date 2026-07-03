export const INTEREST_SIGNAL_COOLDOWN_HOURS = 24;

export type InterestSignalIdentity = {
  user_id?: string | null;
  userId?: string | null;
  email?: string | null;
};

export type InterestSignalRecord = InterestSignalIdentity & {
  signal_type?: string | null;
  signalType?: string | null;
  preferred_price_cents?: number | string | null;
  preferredPriceCents?: number | string | null;
  note?: string | null;
  created_at?: string | Date | null;
  createdAt?: string | Date | null;
};

export type InterestSignalDecision = {
  allowed: boolean;
  reason:
    | "duplicate_within_cooldown"
    | "changed_intent"
    | "cooldown_expired"
    | "no_previous_matching_signal";
  message?: string;
  matchingSignal?: InterestSignalRecord;
};

type InterestSignalDecisionInput = {
  candidate: InterestSignalRecord;
  recentSignals: InterestSignalRecord[];
  now?: string | Date;
  cooldownHours?: number;
};

export function normaliseInterestNote(note?: string | null): string {
  return (note ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalisePreferredPrice(price?: number | string | null): number | null {
  if (price === null || price === undefined) return null;

  if (typeof price === "number") {
    return Number.isFinite(price) ? Math.round(price) : null;
  }

  const trimmed = price.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed.replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function signalType(signal: InterestSignalRecord): string {
  return signal.signal_type ?? signal.signalType ?? "";
}

function preferredPrice(signal: InterestSignalRecord): number | null {
  return normalisePreferredPrice(signal.preferred_price_cents ?? signal.preferredPriceCents ?? null);
}

function createdAt(signal: InterestSignalRecord): string | Date | null | undefined {
  return signal.created_at ?? signal.createdAt;
}

function identityKey(signal: InterestSignalRecord): string | null {
  const userId = (signal.user_id ?? signal.userId ?? "").trim();
  if (userId) return `user:${userId}`;

  const email = (signal.email ?? "").trim().toLowerCase();
  if (email) return `email:${email}`;

  return null;
}

function createdAtMs(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function isSameInterestSignal(a: InterestSignalRecord, b: InterestSignalRecord): boolean {
  const aIdentity = identityKey(a);
  const bIdentity = identityKey(b);

  if (!aIdentity || !bIdentity || aIdentity !== bIdentity) return false;

  return (
    signalType(a) === signalType(b) &&
    preferredPrice(a) === preferredPrice(b) &&
    normaliseInterestNote(a.note) === normaliseInterestNote(b.note)
  );
}

export function isWithinCooldown(
  createdAtValue: string | Date | null | undefined,
  now: string | Date = new Date(),
  cooldownHours = INTEREST_SIGNAL_COOLDOWN_HOURS,
): boolean {
  const createdMs = createdAtMs(createdAtValue);
  const nowMs = createdAtMs(now);

  if (createdMs === null || nowMs === null) return false;

  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  return nowMs >= createdMs && nowMs - createdMs < cooldownMs;
}

export function getInterestSignalDecision({
  candidate,
  recentSignals,
  now = new Date(),
  cooldownHours = INTEREST_SIGNAL_COOLDOWN_HOURS,
}: InterestSignalDecisionInput): InterestSignalDecision {
  const matchingSignals = recentSignals
    .filter((signal) => isSameInterestSignal(candidate, signal))
    .sort((a, b) => (createdAtMs(createdAt(b)) ?? 0) - (createdAtMs(createdAt(a)) ?? 0));

  const latestMatchingSignal = matchingSignals[0];

  if (!latestMatchingSignal) {
    const sameTypeSameIdentity = recentSignals.some((signal) => {
      const candidateIdentity = identityKey(candidate);
      return (
        candidateIdentity !== null &&
        candidateIdentity === identityKey(signal) &&
        signalType(candidate) === signalType(signal)
      );
    });

    return {
      allowed: true,
      reason: sameTypeSameIdentity ? "changed_intent" : "no_previous_matching_signal",
    };
  }

  if (isWithinCooldown(createdAt(latestMatchingSignal), now, cooldownHours)) {
    return {
      allowed: false,
      reason: "duplicate_within_cooldown",
      message: "Already captured. Change the price/note or try again later if your intent has changed.",
      matchingSignal: latestMatchingSignal,
    };
  }

  return {
    allowed: true,
    reason: "cooldown_expired",
    matchingSignal: latestMatchingSignal,
  };
}
