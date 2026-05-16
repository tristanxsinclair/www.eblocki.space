// Coach edge function — momentum-aware, strategic, short.
//
// Responsibilities:
//   1. Authenticate the caller via JWT, derive user_id.
//   2. Read momentum_state, today's objectives, recent commitments,
//      and the user's active mode to build behavioural context.
//   3. Call Lovable AI Gateway with a tight system prompt that demands
//      <=4 sentence, proof-led outputs. No generic motivation.
//   4. Optionally synthesise a proof contract from the user input + reply.
//   5. Persist the interaction and (when serious) a proof_commitment.
//   6. Return a stable shape compatible with normaliseCoachResponse.
//
// Graceful degradation: every step that can fail has a safe fallback so
// the UI never sees a 5xx. AI failure → deterministic coach line.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// -------------------- types --------------------
type Mode =
  | "LAW_MAX"
  | "PSYCH_HD"
  | "SALES_CLOSE"
  | "EBLOCKI_BUILD"
  | "ATHLETE_MODE"
  | "FINANCE_BASICS"
  | "GENERAL_EXECUTION";

interface MomentumRow {
  momentum_score: number | null;
  state: string | null;
  streak_days: number | null;
  freeze_tokens: number | null;
  proofs_today: number | null;
  avg_quality: number | null;
  resistance_overcome: number | null;
  last_proof_at: string | null;
  identity_signal: string | null;
}

interface ObjectiveRow {
  title: string;
  status: string;
  kind: string;
  resistance_level: number | null;
}

interface CommitmentRow {
  title: string;
  domain: string | null;
  mode: string | null;
  status: string;
  created_at: string;
}

// -------------------- helpers --------------------
function normaliseMode(input: string | null | undefined): Mode {
  if (!input) return "GENERAL_EXECUTION";
  const k = input.toUpperCase().replace(/[\s-]+/g, "_");
  if (k.includes("LAW")) return "LAW_MAX";
  if (k.includes("PSYCH")) return "PSYCH_HD";
  if (k.includes("SALES")) return "SALES_CLOSE";
  if (k.includes("EBLOCKI") || k.includes("BUILD")) return "EBLOCKI_BUILD";
  if (k.includes("ATHLETE") || k.includes("SPORT")) return "ATHLETE_MODE";
  if (k.includes("FINANCE") || k.includes("MONEY")) return "FINANCE_BASICS";
  return "GENERAL_EXECUTION";
}

function detectModeFromText(text: string): Mode {
  const t = text.toLowerCase();
  if (/\b(law|irac|statutory|jurisdiction|tort|contract law)\b/.test(t)) return "LAW_MAX";
  if (/\b(psych|cognition|hd|caee|peer.?review)\b/.test(t)) return "PSYCH_HD";
  if (/\b(sales|gse|customer|close|objection|attach)\b/.test(t)) return "SALES_CLOSE";
  if (/\b(eblocki|ship|bug|product|feature|behaviour loop)\b/.test(t)) return "EBLOCKI_BUILD";
  if (/\b(training|match|drill|mobility|recovery|game)\b/.test(t)) return "ATHLETE_MODE";
  if (/\b(budget|spend|saving|expense|invest)\b/.test(t)) return "FINANCE_BASICS";
  return "GENERAL_EXECUTION";
}

function detectState(text: string): string {
  const t = text.toLowerCase();
  if (/reorganis|reorganiz|tidy|setup|stuck|circl/i.test(t)) return "avoidant";
  if (/too much|overwhelm|drowning|behind/i.test(t)) return "overloaded";
  if (/tired|exhausted|no energy|burnt/i.test(t)) return "low_energy";
  if (/big idea|huge plan|launch everything/i.test(t)) return "hype_drift";
  if (/on a roll|momentum|in flow|just shipped/i.test(t)) return "momentum";
  if (text.length < 40) return "low_energy";
  return "scattered";
}

const SERIOUS_VERBS = [
  "write","draft","study","produce","submit","build","practice","practise",
  "reflect","revise","train","complete","prepare","ship","create","fix","analyse","analyze",
];

function buildContract(message: string, assistantOutput: string, mode: Mode) {
  const text = (message + "\n" + assistantOutput).toLowerCase();
  let seriousness = 0;
  for (const v of SERIOUS_VERBS) if (new RegExp(`\\b${v}\\b`).test(text)) seriousness++;
  if (/\b(today|tonight|tomorrow|by \d|deadline|exam|due|assessment)\b/.test(text)) seriousness += 2;
  seriousness = Math.max(1, Math.min(10, seriousness));

  const domainByMode: Record<Mode, string> = {
    LAW_MAX: "law",
    PSYCH_HD: "psychology",
    SALES_CLOSE: "sales",
    EBLOCKI_BUILD: "eblocki",
    ATHLETE_MODE: "sport",
    FINANCE_BASICS: "finance",
    GENERAL_EXECUTION: "general",
  };
  const artifactByMode: Record<Mode, string> = {
    LAW_MAX: "Written IRAC paragraph (200-400 words) with issue, rule, application, conclusion.",
    PSYCH_HD: "CAEE paragraph (200+ words) with peer-reviewed evidence post-2016.",
    SALES_CLOSE: "Shift reflection: customer need, objection, attachment attempt, next script.",
    EBLOCKI_BUILD: "Commit reference or shipped artifact + the user-visible change.",
    ATHLETE_MODE: "Training/match log: movement quality, decision, repeated mistake, next drill.",
    FINANCE_BASICS: "Tracker entry + one-sentence pattern observation.",
    GENERAL_EXECUTION: "Concrete artifact proving the action happened, plus next upgrade.",
  };

  const title = message.split("\n")[0].slice(0, 120) || "Next action";
  return {
    shouldCreate: seriousness >= 4,
    domain: domainByMode[mode],
    mode,
    title,
    requiredArtifact: artifactByMode[mode],
    evidenceStandard: "Artifact must include applied detail, evidence, and a next upgrade.",
    dueDate: null,
    seriousnessScore: seriousness,
    reason:
      seriousness >= 4
        ? `Detected ${seriousness} action signals — proof contract enforced.`
        : "No serious action detected.",
  };
}

// -------------------- behavioural copy (fallback when AI fails) --------------------
function deterministicCoach(momentum: MomentumRow | null, mode: Mode): string {
  if (!momentum || momentum.state == null) {
    return "No recent data yet. Submit one small proof artifact to begin the pattern.";
  }
  const s = momentum.state;
  const q = momentum.avg_quality ?? 0;
  const streak = momentum.streak_days ?? 0;
  const today = momentum.proofs_today ?? 0;

  if (s === "at_risk") {
    return `Streak risk: ${streak}-day pattern is exposed. You are one real proof artifact away from preserving momentum. Do the smallest valid task now.`;
  }
  if (s === "cold") {
    return "Cold start. Reduce the task, not the standard — one concrete artifact is enough to restart the loop.";
  }
  if (s === "recovery") {
    return "Recovery mode: reduce the task size, not the standard. One real proof preserves identity.";
  }
  if (s === "warming") {
    return q < 5
      ? "Volume is not the issue. Your proof quality is low. Upgrade one task to depth."
      : "Quality is there. Add a second proof today to convert into momentum.";
  }
  if (s === "momentum") {
    if (q < 6) return "You have momentum, but it is shallow. Convert today into one high-resistance proof.";
    if (today >= 2) return "Strong day. Protect the streak with one early proof tomorrow before entertainment.";
    return "Momentum is stable. Increase depth, not volume — one elite-grade artifact today.";
  }
  if (s === "elite") {
    return "Elite execution. Defend the pattern — one high-resistance artifact before the day ends.";
  }
  return `Mode: ${mode}. Submit one artifact to advance the pattern.`;
}

// -------------------- main --------------------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const debug: Record<string, unknown> = {
    usedFallback: false,
    aiConfigured: false,
    aiError: null,
    databaseInteractionError: null,
    databaseCommitmentError: null,
  };

  try {
    const body = await req.json().catch(() => null);
    const message: string | undefined = body?.message;
    const requestedMode: string | undefined =
      typeof body?.mode === "string" && body.mode.length > 0 && body.mode.length < 64
        ? body.mode
        : undefined;
    if (!message || typeof message !== "string" || message.length > 5000) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ----- auth -----
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    let userId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch (e) {
      console.warn("coach: auth.getUser failed", e);
    }

    // ----- context fetch (parallel, all best-effort) -----
    let momentum: MomentumRow | null = null;
    let objectives: ObjectiveRow[] = [];
    let commitments: CommitmentRow[] = [];
    let activeModeRaw: string | null = null;
    // Coach memory — last 3 exchanges, used to detect repetition + escalate.
    let recentInteractions: { user_input: string; assistant_output: string | null; created_at: string }[] = [];

    if (userId) {
      const todayISO = new Date().toISOString().slice(0, 10);
      const [mRes, oRes, cRes, modesRes, hRes] = await Promise.all([
        supabase
          .from("momentum_state")
          .select("momentum_score, state, streak_days, freeze_tokens, proofs_today, avg_quality, resistance_overcome, last_proof_at, identity_signal")
          .eq("user_id", userId)
          .order("state_date", { ascending: false })
          .limit(1),
        supabase
          .from("daily_objectives")
          .select("title, status, kind, resistance_level")
          .eq("user_id", userId)
          .eq("objective_date", todayISO),
        supabase
          .from("proof_commitments")
          .select("title, domain, mode, status, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("user_modes")
          .select("mode_id, is_default")
          .eq("user_id", userId)
          .eq("is_active", true)
          .order("is_default", { ascending: false })
          .limit(1),
        supabase
          .from("coach_interactions")
          .select("user_input, assistant_output, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(3),
      ]);
      momentum = (mRes.data?.[0] as MomentumRow | undefined) ?? null;
      objectives = (oRes.data ?? []) as ObjectiveRow[];
      commitments = (cRes.data ?? []) as CommitmentRow[];
      activeModeRaw = modesRes.data?.[0]?.mode_id ?? null;
      recentInteractions = (hRes.data ?? []) as typeof recentInteractions;
    }

    // Priority: explicit request from UI (mode coach button) > active user mode > text detection.
    const mode: Mode = requestedMode
      ? normaliseMode(requestedMode)
      : activeModeRaw
      ? normaliseMode(activeModeRaw)
      : detectModeFromText(message);
    const state = detectState(message);

    // ----- system prompt -----
    const ctxSummary = momentum
      ? `Momentum state: ${momentum.state ?? "unknown"} (score ${momentum.momentum_score ?? 0}/100). Streak: ${momentum.streak_days ?? 0}d. Proofs today: ${momentum.proofs_today ?? 0}. Avg quality: ${(momentum.avg_quality ?? 0).toFixed(1)}/10. Resistance overcome (week): ${momentum.resistance_overcome ?? 0}. Identity signal: ${momentum.identity_signal ?? "n/a"}.`
      : "No momentum data yet for this user.";
    const objSummary = objectives.length
      ? `Today's objectives (${objectives.filter((o) => o.status === "completed").length}/${objectives.length} done): ${objectives.map((o) => `[${o.status}] ${o.title}`).join(" | ")}`
      : "No objectives seeded today.";
    const commitSummary = commitments.length
      ? `Recent commitments: ${commitments.slice(0, 3).map((c) => `[${c.status}] ${c.title}`).join(" | ")}`
      : "No recent proof commitments.";

    // -------- repetition + escalation detection --------
    // If the user is raising the same issue repeatedly, the coach must
    // escalate specificity rather than repeat the previous instruction.
    function tokenSet(s: string): Set<string> {
      return new Set((s.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? []).filter((w) => !["that","this","just","really","keep","kept","feel","felt"].includes(w)));
    }
    const currentTokens = tokenSet(message);
    let repetitionScore = 0;
    for (const prev of recentInteractions) {
      const overlap = [...tokenSet(prev.user_input)].filter((t) => currentTokens.has(t)).length;
      if (overlap >= 2) repetitionScore += 1;
    }
    const escalationLevel: "first" | "repeat" | "stuck" =
      repetitionScore >= 2 ? "stuck" : repetitionScore === 1 ? "repeat" : "first";

    const memorySummary = recentInteractions.length
      ? "Recent coach exchanges (most recent first):\n" +
        recentInteractions
          .map((r, i) => `(${i + 1}) USER: ${r.user_input.slice(0, 160)}\n    COACH: ${(r.assistant_output ?? "").slice(0, 180)}`)
          .join("\n")
      : "No prior coach exchanges.";

    const escalationDirective =
      escalationLevel === "stuck"
        ? "ESCALATION REQUIRED: The user is repeating the same avoidance pattern. Do NOT restate a previous instruction. Reduce the task to its smallest physical action (e.g. 'open the document and write only the issue section')."
        : escalationLevel === "repeat"
        ? "ESCALATION SOFT: This topic recurred. Add specificity that was missing last time — name the document, the first line, or the timer length."
        : "First mention of this topic — set the standard, prescribe the smallest valid proof artifact.";

    const systemPrompt = `You are Eblocki Coach. You produce short, strategic, behaviourally-aware instructions for a user training disciplined identity through proof artifacts.

HARD RULES:
- 1 to 4 short sentences MAX. No headings, no lists, no preamble.
- Never use generic motivation, hype, or fake psychology.
- Always reference at least one concrete behavioural signal (streak, quality, proofs today, mode).
- Always end with a single, specific next action that produces a proof artifact.
- If data is sparse, say so honestly and prescribe the smallest valid next step.
- Tone: direct, strategic, calm. Not therapist, not cheerleader.
- NEVER repeat verbatim an instruction from the recent exchanges below.

USER CONTEXT:
- Active mode: ${mode}
- Detected state from message: ${state}
- ${ctxSummary}
- ${objSummary}
- ${commitSummary}

MEMORY:
${memorySummary}

${escalationDirective}

Examples of acceptable outputs:
- "You are one real proof artifact away from preserving the streak. Do the smallest valid task now."
- "Volume is not the issue. Your proof quality is ${(momentum?.avg_quality ?? 0).toFixed(1)}/10 — upgrade one task to depth instead of adding another."
- "Recovery day. Reduce the task size, not the standard — submit one IRAC paragraph in 25 minutes."

Now respond to the user's message.`;

    // ----- AI call -----
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    debug.aiConfigured = !!apiKey;

    let assistantOutput = "";
    if (apiKey) {
      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message },
            ],
            temperature: 0.4,
            max_tokens: 220,
          }),
        });
        if (!aiResp.ok) {
          debug.aiError = `AI_HTTP_${aiResp.status}`;
          debug.usedFallback = true;
          assistantOutput = deterministicCoach(momentum, mode);
          if (aiResp.status === 429 || aiResp.status === 402) {
            // Surface upstream pricing/rate errors to the client.
            debug.aiError =
              aiResp.status === 429
                ? "AI rate-limited. Try again in a moment."
                : "AI credits exhausted. Add credits in workspace settings.";
          }
        } else {
          const j = await aiResp.json();
          const content = j?.choices?.[0]?.message?.content;
          if (typeof content === "string" && content.trim().length > 0) {
            assistantOutput = content.trim();
          } else {
            debug.usedFallback = true;
            debug.aiError = "AI_EMPTY_RESPONSE";
            assistantOutput = deterministicCoach(momentum, mode);
          }
        }
      } catch (e) {
        debug.aiError = e instanceof Error ? e.message : "AI_FETCH_ERROR";
        debug.usedFallback = true;
        assistantOutput = deterministicCoach(momentum, mode);
      }
    } else {
      debug.usedFallback = true;
      debug.aiError = "AI_NOT_CONFIGURED";
      assistantOutput = deterministicCoach(momentum, mode);
    }

    const proofContract = buildContract(message, assistantOutput, mode);
    // Surface escalation to UI/debug so the client can render context if it wants.
    (debug as Record<string, unknown>).escalationLevel = escalationLevel;
    (debug as Record<string, unknown>).repetitionScore = repetitionScore;

    // ----- persist (best-effort) -----
    let interactionId: string | null = null;
    let commitmentId: string | null = null;
    if (userId) {
      try {
        const { data, error } = await supabase
          .from("coach_interactions")
          .insert({
            user_id: userId,
            mode,
            user_input: message,
            assistant_output: assistantOutput,
            state_detected: state,
            proof_required: proofContract.shouldCreate,
          })
          .select("id")
          .single();
        if (error) debug.databaseInteractionError = error.message;
        else interactionId = data?.id ?? null;
      } catch (e) {
        debug.databaseInteractionError = e instanceof Error ? e.message : "DB_ERROR";
      }

      if (proofContract.shouldCreate) {
        try {
          const { data, error } = await supabase
            .from("proof_commitments")
            .insert({
              user_id: userId,
              coach_interaction_id: interactionId,
              domain: proofContract.domain,
              mode: proofContract.mode,
              title: proofContract.title,
              required_artifact: proofContract.requiredArtifact,
              evidence_standard: proofContract.evidenceStandard,
              status: "pending",
            })
            .select("id")
            .single();
          if (error) debug.databaseCommitmentError = error.message;
          else commitmentId = data?.id ?? null;
        } catch (e) {
          debug.databaseCommitmentError = e instanceof Error ? e.message : "DB_ERROR";
        }
      }
    } else {
      debug.databaseInteractionError = "USER_NOT_AUTHENTICATED";
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        hybrid: null,
        state,
        response: assistantOutput,
        proofContract,
        proofQuestion: "What proof artifact will confirm completion?",
        interactionId,
        commitmentId,
        debug,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("coach: top-level error", err);
    return new Response(
      JSON.stringify({
        success: true,
        mode: "GENERAL_EXECUTION",
        hybrid: null,
        state: "scattered",
        response: "No data yet. Submit one small proof artifact to begin the pattern.",
        proofContract: buildContract("", "", "GENERAL_EXECUTION"),
        proofQuestion: "What proof artifact will confirm completion?",
        interactionId: null,
        commitmentId: null,
        debug: { usedFallback: true, aiError: err instanceof Error ? err.message : "UNKNOWN" },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});