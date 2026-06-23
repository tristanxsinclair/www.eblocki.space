/**
 * Temporal → Proof deep-link utilities.
 *
 * Pure module. Builds and parses validated query parameters for the
 * "forecast-linked" Proof flow. The Proof page already owns submission;
 * this only carries a small brief from the Temporal forecast across the
 * navigation boundary.
 */

export const TEMPORAL_PROOF_SOURCE = "temporal" as const;

export const TEMPORAL_EXPECTED_LEVELS = [
  "accepted_strong",
  "accepted_elite",
  "accepted_moderate",
  "rejected",
] as const;
export type TemporalExpectedLevel = (typeof TEMPORAL_EXPECTED_LEVELS)[number];
export const DEFAULT_TEMPORAL_EXPECTED_LEVEL: TemporalExpectedLevel = "accepted_strong";

export const DEFAULT_TEMPORAL_TIMEBOX = "24h";

const LIMITS = {
  domain: 40,
  proof: 200,
  reason: 280,
  timebox: 8,
} as const;

export interface TemporalProofLinkInput {
  domain?: string | null;
  proof?: string | null;
  level?: string | null;
  reason?: string | null;
  timebox?: string | null;
}

export interface ParsedTemporalProofBrief {
  isTemporal: boolean;
  domain: string | null;
  proof: string | null;
  level: TemporalExpectedLevel;
  reason: string | null;
  timebox: string;
}

function clean(value: string | null | undefined, max: number): string | null {
  if (typeof value !== "string") return null;
  // Strip ASCII control characters (0x00-0x1F and 0x7F) without using a
  // control-char regex (lint rule no-control-regex).
  let stripped = "";
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code > 31 && code !== 127) stripped += value[i];
  }
  const trimmed = stripped.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

function normaliseLevel(value: string | null | undefined): TemporalExpectedLevel {
  const raw = (value ?? "").trim().toLowerCase();
  return (TEMPORAL_EXPECTED_LEVELS as readonly string[]).includes(raw)
    ? (raw as TemporalExpectedLevel)
    : DEFAULT_TEMPORAL_EXPECTED_LEVEL;
}

function normaliseTimebox(value: string | null | undefined): string {
  const v = clean(value, LIMITS.timebox);
  if (!v) return DEFAULT_TEMPORAL_TIMEBOX;
  // Accept simple shapes like "24h", "90m", "2d"; otherwise default.
  return /^\d{1,4}\s*(m|h|d)$/i.test(v) ? v.replace(/\s+/g, "").toLowerCase() : DEFAULT_TEMPORAL_TIMEBOX;
}

/**
 * Build a /proof URL carrying the temporal forecast brief. Only writes
 * supported, length-limited parameters. Empty/invalid fields are omitted.
 */
export function buildTemporalProofUrl(input: TemporalProofLinkInput = {}): string {
  const params = new URLSearchParams();
  params.set("source", TEMPORAL_PROOF_SOURCE);

  const domain = clean(input.domain ?? null, LIMITS.domain);
  if (domain) params.set("domain", domain);

  const proof = clean(input.proof ?? null, LIMITS.proof);
  if (proof) params.set("proof", proof);

  // Only write level if user supplied a known one; default is implicit.
  if (input.level != null) {
    params.set("level", normaliseLevel(input.level));
  }

  const reason = clean(input.reason ?? null, LIMITS.reason);
  if (reason) params.set("reason", reason);

  if (input.timebox != null) {
    params.set("timebox", normaliseTimebox(input.timebox));
  }

  return `/proof?${params.toString()}`;
}

/**
 * Parse a temporal proof brief from any URLSearchParams. Always returns a
 * fully-typed result; isTemporal=false when source is missing/unsupported.
 * Never throws on malformed or oversized values.
 */
export function parseTemporalProofParams(
  params: URLSearchParams | null | undefined,
): ParsedTemporalProofBrief {
  const empty: ParsedTemporalProofBrief = {
    isTemporal: false,
    domain: null,
    proof: null,
    level: DEFAULT_TEMPORAL_EXPECTED_LEVEL,
    reason: null,
    timebox: DEFAULT_TEMPORAL_TIMEBOX,
  };
  if (!params) return empty;

  let source: string | null = null;
  try {
    source = params.get("source");
  } catch {
    return empty;
  }
  if (source !== TEMPORAL_PROOF_SOURCE) return empty;

  return {
    isTemporal: true,
    domain: clean(params.get("domain"), LIMITS.domain),
    proof: clean(params.get("proof"), LIMITS.proof),
    level: normaliseLevel(params.get("level")),
    reason: clean(params.get("reason"), LIMITS.reason),
    timebox: normaliseTimebox(params.get("timebox")),
  };
}

export const __TEMPORAL_PROOF_LINK_LIMITS = LIMITS;