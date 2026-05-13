import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- inline mode/state/contract logic (copy of src/lib/eblocki, kept in-function) ---
type Mode = type UserOnboardingProfile = {
  identity_summary: string | null;
  roles: string[] | null;
  goals: string[] | null;
  coaching_style: string | null;
  strictness_level: number | null;
  prefers_detailed_analysis: boolean | null;
  challenge_avoidance: boolean | null;
  auto_create_proof_contracts: boolean | null;
  completed_onboarding: boolean | null;
};

type UserMode = {
  mode_id: string;
  display_name: string;
  description: string | null;
  keywords: string[] | null;
  proof_examples: string[] | null;
  weak_evidence_examples: string[] | null;
  strong_evidence_examples: string[] | null;
  elite_evidence_examples: string[] | null;
  preferred_response_framework: string | null;
  scoring_criteria: Record<string, unknown> | null;
  research_needs: string[] | null;
  tone_adjustments: string | null;
  is_default: boolean | null;
  is_active: boolean | null;
};

type ModeDetectionResult = {
  primary: Mode | string;
  hybrid?: Mode | string;
  customMode?: UserMode | null;
  isCustomMode: boolean;
};
type BehaviouralState = "locked_in" | "avoidant" | "overloaded" | "low_energy" | "hype_drift" | "recovery" | "momentum" | "scattered" | "academic_displacement" | "strategic_build" | null;

interface ProofContract {
  shouldCreate: boolean;
  domain: string;
  mode: Mode;
  title: string;
  requiredArtifact: string;
  evidenceStandard: string;
  dueDate: string | null;
  seriousnessScore: number;
  reason: string;
}

interface CoachResponse {
  success: boolean;
  mode: Mode;
  hybrid: Mode | null;
  state: BehaviouralState;
  response: string;
  proofContract: ProofContract;
  proofQuestion: string;
  interactionId: string | null;
  commitmentId: string | null;
}

const KEYWORDS: Record<string, string[]> = {
  LAW_MAX: ["law","laws1005","laws1006","legal","case","statute","statutory","irac","aglc","precedent","ratio","obiter","jurisdiction","court","judicial","exam","tort","contract"],
  PSYCH_HD: ["psychology","psyc1000","cognition","cognitive","learning","memory","development","motivation","behaviour","behavior","attention","evidence-based","caee","schema"],
  SALES_CLOSE: ["good guys","tgg","sales","gse","warranty","customer","objection","close","commission","aov","upsell","attachment","appliance","tv","laptop","fridge","washer","vacuum"],
  EBLOCKI: ["eblocki","discipline","productivity","avoidance","habit","routine","accountability","proof","daily control","identity","system","focus","streak","behind","scattered","overwhelmed","procrastination"],
  SPORT: ["soccer","striker","false 9","football","match","goal","training","cockburn","movement","finishing","pressing","scooter","trick","fitness","sprint"],
  BRAND: ["brand","linkedin","instagram","youtube","caption","reel","content","script","post","video","tiktok","thumbnail","hook"],
  CAREER_MONEY: ["job","resume","cv","cover letter","career","paralegal","law clerk","money","finance","budget","invest","car","income","salary","interview"],
};
const MODE_DOMAINS: Record<Mode, string> = { LAW_MAX:"law",PSYCH_HD:"psychology",SALES_CLOSE:"sales",EBLOCKI:"discipline",SPORT:"sport",BRAND:"brand",CAREER_MONEY:"career",GENERAL_EXECUTION:"general" };

function detectMode(text: string): { primary: Mode; hybrid?: Mode } {
  const t = text.toLowerCase();
  const scores: Record<string, number> = {};
  for (const [m, kws] of Object.entries(KEYWORDS)) {
    scores[m] = 0;
    for (const k of kws) if (t.includes(k)) scores[m] += k.length > 6 ? 2 : 1;
  }
  function scoreKeywordMatch(text: string, keywords: string[] = []): number {
  const lower = text.toLowerCase();

  return keywords.reduce((score, keyword) => {
    const clean = String(keyword || "").trim().toLowerCase();
    if (!clean) return score;

    if (lower.includes(clean)) {
      return score + (clean.length > 8 ? 3 : clean.length > 4 ? 2 : 1);
    }

    return score;
  }, 0);
}

function detectPersonalisedMode(
  text: string,
  userModes: UserMode[]
): ModeDetectionResult | null {
  const activeModes = userModes.filter((mode) => mode.is_active !== false);

  if (activeModes.length === 0) return null;

  const scored = activeModes
    .map((mode) => {
      const keywordScore = scoreKeywordMatch(text, mode.keywords ?? []);
      const nameScore = scoreKeywordMatch(text, [
        mode.mode_id,
        mode.display_name,
        mode.description ?? "",
      ]);

      return {
        mode,
        score: keywordScore + nameScore,
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];

  if (!best || best.score <= 0) return null;

  return {debug: {
  usedFallback,
  aiConfigured,
  aiError,
  databaseInteractionError,
  databaseCommitmentError,
  personalisedModeUsed: isCustomMode,
  customModeId: customMode?.mode_id ?? null,
  onboardingLoaded: !!onboardingProfile,
  userModesLoaded: userModes.length,
}
}

function detectModeWithUserModes(
  text: string,
  userModes: UserMode[]
): ModeDetectionResult {
  const personalised = detectPersonalisedMode(text, userModes);

  if (personalised) return personalised;

  const fallback = detectMode(text);

  return {
    primary: fallback.primary,
    hybrid: fallback.hybrid,
    customMode: null,
    isCustomMode: false,
  };
}
  const sorted = Object.entries(scores).sort((a,b) => b[1] - a[1]);
  if (sorted[0][1] === 0) return { primary: "GENERAL_EXECUTION" };
  const result: { primary: Mode; hybrid?: Mode } = { primary: sorted[0][0] as Mode };
  if (sorted[1] && sorted[1][1] >= Math.max(2, sorted[0][1] * 0.6)) result.hybrid = sorted[1][0] as Mode;
  return result;
}

function detectState(text: string): BehaviouralState {
  const t = text.toLowerCase();
  if (/reorganis|reorganiz|tidy|setup|set up|don'?t feel like|can'?t start|stuck|circling/.test(t)) return "avoidant";
  if (/too much|overwhelm|behind on|drowning/.test(t)) return "overloaded";
  if (/tired|exhausted|drained|no energy|burnt/.test(t)) return "low_energy";
  if (/big idea|huge plan|empire|launch.*everything/.test(t)) return "hype_drift";
  if (/can'?t focus|distract|jumping|fragment/.test(t)) return "scattered";
  if (/notes about notes|colour cod|colored cod|re-?reading|highlighting again/.test(t)) return "academic_displacement";
  if (/rest day|need a break|recover|deload/.test(t)) return "recovery";
  if (/locked in|deep work|finishing/.test(t)) return "locked_in";
  if (/on a roll|momentum|in flow|cooking|just shipped/.test(t)) return "momentum";
  if (/building eblocki|new feature|architect/.test(t)) return "strategic_build";
  if (t.length < 40) return "low_energy";
  if (/\b(write|draft|study|build|train|ship|finish|complete)\b/.test(t)) return "momentum";
  return "scattered";
}

const SERIOUS_VERBS = ["write","draft","study","produce","submit","build","practise","practice","reflect","revise","sell","train","complete","prepare","ship","read","analyse","analyze","argue","submit","create","fix"];
const STANDARDS: Record<Mode, { artifact: string; standard: string }> = {
  LAW_MAX: { artifact: "Written IRAC answer (250+ words)", standard: "Issue / Rule + authority / Application / Counterargument / Conclusion" },
  PSYCH_HD: { artifact: "Applied paragraph (200+ words)", standard: "Concept / Application / Evidence / Evaluation" },
  SALES_CLOSE: { artifact: "Shift reflection (one customer)", standard: "Diagnosis / Premium pain / GSE attempt / Objection / Close outcome" },
  EBLOCKI: { artifact: "Daily Control Sheet line + completed task", standard: "State / Bottleneck / Artifact / Reflection / Next upgrade" },
  SPORT: { artifact: "Training/match log", standard: "Minutes / Movement / Best / Worst / Next drill" },
  BRAND: { artifact: "One published piece", standard: "Hook / Proof angle / Clarity / Originality / Published" },
  CAREER_MONEY: { artifact: "Decision document or asset", standard: "Utility / Cost / Downside / Upside / Opportunity cost / Decision rule" },
  GENERAL_EXECUTION: { artifact: "Concrete output proving the action happened", standard: "Action / Evidence / Reflection / Next" },
};

function buildContract(message: string, output: string, mode: Mode): ProofContract {
  const text = `${message}\n${output}`.toLowerCase();
  let s = 0;
  for (const v of SERIOUS_VERBS) if (new RegExp(`\\b${v}\\b`).test(text)) s++;
  if (/\b(today|tonight|tomorrow|by \d|deadline)\b/.test(text)) s += 2;
  if (/\b(exam|due|assessment|shift|match)\b/.test(text)) s += 2;
  if (output.length > 300) s++;
  s = Math.max(1, Math.min(10, s));
  const std = STANDARDS[mode];
  return {
    shouldCreate: s >= 4,
    domain: MODE_DOMAINS[mode],
    mode,
    title: message.split("\n")[0].slice(0, 80) || "Next action",
    requiredArtifact: std.artifact,
    evidenceStandard: std.standard,
    dueDate: null,
    seriousnessScore: s,
    reason: s >= 4 ? `Detected ${s} action signals — proof contract enforced.` : "Casual question — no contract created.",
  };
}

const CORE_PROMPT = `You are Tristan Sinclair's Core Performance Architect, Apprentice Mentor, and Execution System.
Your job is to convert ambition into measurable proof.
Use the active mode. Default response structure:
1. Bottom Line Up Front
2. Analysis
3. Actionable System
4. HD/Elite Upgrade
Quality hierarchy: Accuracy > Depth > Structure > Speed > Style.
Never fabricate facts, sources, law, cases, statutes, product details, prices, or job facts. If unverified, say "Source cannot be confirmed."
If the user sounds avoidant, scattered, overloaded, low-energy, or overhyped, diagnose the state and define the next controllable proof artifact.
Tone: direct, strategic, efficient, slightly witty only when useful. Not soft. Not motivational fluff. Not hustle-bro.
End with a line: "PROOF ARTIFACT: <what will confirm completion>" when prescribing a serious action.`;

const MODE_FRAMING: Record<Mode, string> = {
  LAW_MAX: "MODE: LAW_MAX. Use IRAC. Advanced: Issue/Framework/Authority/Application/Counterargument/Evaluation/Conclusion. Identify jurisdiction. Distinguish ratio/obiter, binding/persuasive. Focus on precision.",
  PSYCH_HD: "MODE: PSYCH_HD. Concept/Application/Evidence/Evaluation. Prefer post-2016 evidence. Apply, do not just define. Name the mechanism precisely.",
  SALES_CLOSE: "MODE: SALES_CLOSE. Sell consequence control. Diagnose use case → premium pain → product solution → GSE attach → objection handling → close → review.",
  EBLOCKI: "MODE: EBLOCKI. Value → Standard → Behaviour → Proof → Feedback → Upgrade. Black Coffee Rule: define the next proof artifact, not what user does NOT want. Court of Evidence.",
  SPORT: "MODE: SPORT. Striker / false 9. Match review: Minutes/Goals/Movement/Link-up/Pressing/Best/Worst/Next focus/Elite upgrade.",
  BRAND: "MODE: BRAND. Analytical operator, proof-based discipline, quiet compounding. Avoid hustle content.",
  CAREER_MONEY: "MODE: CAREER_MONEY. Decision rule: Utility/Total cost/Downside/Upside/Opportunity cost/Decision.",
  GENERAL_EXECUTION: "MODE: GENERAL_EXECUTION. Diagnose bottleneck. Prescribe one controllable next action with proof artifact.",
};
function buildPersonalisedContext(
  profile: UserOnboardingProfile | null,
  customMode: UserMode | null
): string {
  const parts: string[] = [];

  if (profile) {
    parts.push(`USER ONBOARDING PROFILE:
Identity summary: ${profile.identity_summary || "Not provided"}
Roles: ${(profile.roles ?? []).join(", ") || "Not provided"}
Goals: ${(profile.goals ?? []).join(", ") || "Not provided"}
Coaching style: ${profile.coaching_style || "direct"}
Strictness level: ${profile.strictness_level ?? 7}/10
Prefers detailed analysis: ${profile.prefers_detailed_analysis ?? true}
Challenge avoidance directly: ${profile.challenge_avoidance ?? true}
Auto-create proof contracts: ${profile.auto_create_proof_contracts ?? true}`);
  }

  if (customMode) {
    parts.push(`MATCHED PERSONALISED MODE:
Mode ID: ${customMode.mode_id}
Display name: ${customMode.display_name}
Description: ${customMode.description || "Not provided"}
Keywords: ${(customMode.keywords ?? []).join(", ") || "Not provided"}

Proof examples:
${(customMode.proof_examples ?? []).map((x) => `- ${x}`).join("\n") || "- Not provided"}

Weak evidence examples:
${(customMode.weak_evidence_examples ?? []).map((x) => `- ${x}`).join("\n") || "- Not provided"}

Strong evidence examples:
${(customMode.strong_evidence_examples ?? []).map((x) => `- ${x}`).join("\n") || "- Not provided"}

Elite evidence examples:
${(customMode.elite_evidence_examples ?? []).map((x) => `- ${x}`).join("\n") || "- Not provided"}

Preferred response framework:
${customMode.preferred_response_framework || "Bottom Line Up Front → Analysis → Actionable System → HD/Elite Upgrade"}

Research needs:
${(customMode.research_needs ?? []).map((x) => `- ${x}`).join("\n") || "- Not provided"}

Tone adjustments:
${customMode.tone_adjustments || "Direct, strategic, proof-first."}

Scoring criteria:
${JSON.stringify(customMode.scoring_criteria ?? {}, null, 2)}`);
  }

  if (parts.length === 0) {
    return "No personalised onboarding context found. Use general Eblocki coaching.";
  }

  return parts.join("\n\n");
}

function fallbackResponse(message: string, mode: Mode, state: string): string {
  return `1. Bottom Line Up Front
The bottleneck is execution clarity, not information. Pick one artifact and ship it.

2. Analysis
Detected mode: ${mode}. Detected state: ${state}. Your message centres on "${message.slice(0,140)}". Without a defined proof artifact, this drifts into reorganisation.

3. Actionable System
- Set a 25-minute timer.
- Produce the smallest version of the artifact below.
- Stop. Review. Log it.

4. HD/Elite Upgrade
Repeat tomorrow under tighter constraint (10 minutes less, +1 quality criterion).

PROOF ARTIFACT: ${STANDARDS[mode].artifact}`;
}

serve(async (req): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  console.log("coach: request received");
  let usedFallback = false;
  let aiConfigured = false;
  let aiError: string | null = null;
  let databaseInteractionError: string | null = null;
  let databaseCommitmentError: string | null = null;

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const message = body?.message;
    if (!message || typeof message !== "string" || message.length > 5000) {
      return new Response(JSON.stringify({ success: false, error: "Invalid message" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("coach: message parsed, length=", message.length);

    // Optional auth — never fatal
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      authHeader ? { global: { headers: { Authorization: authHeader } } } : undefined,
    );

    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData, error: uErr } = await supabase.auth.getUser(token);
        if (!uErr && userData?.user) {
          userId = userData.user.id;
        } else if (uErr) {
          console.warn("coach: auth.getUser failed", uErr.message);
        }
      } catch (authEx) {
        console.warn("coach: auth lookup threw", authEx);
      }
    }
    console.log("coach: userId=", userId);

    // Load config (best-effort)
    let cfg: any = null;
    if (userId) {
      try {
        const { data } = await supabase.from("performance_os_config").select("*").eq("user_id", userId).maybeSingle();
        cfg = data;
      } catch (cfgErr) {
        console.warn("coach: config fetch failed", cfgErr);
      }
    }
    const model = cfg?.model || "google/gemini-3-flash-preview";
    const autoCreate = cfg?.auto_create_proof_contracts ?? true;
    const threshold = cfg?.proof_contract_minimum_seriousness ?? 5;

let onboardingProfile: UserOnboardingProfile | null = null;
let userModes: UserMode[] = [];

if (userId) {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from("user_onboarding_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.warn("coach: onboarding profile fetch failed", profileError.message);
    } else {
      onboardingProfile = profileData as UserOnboardingProfile | null;
    }
  } catch (profileEx) {
    console.warn("coach: onboarding profile lookup threw", profileEx);
  }

  try {
    const { data: modeData, error: modesError } = await supabase
      .from("user_modes")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (modesError) {
      console.warn("coach: user modes fetch failed", modesError.message);
    } else {
      userModes = (modeData ?? []) as UserMode[];
    }
  } catch (modesEx) {
    console.warn("coach: user modes lookup threw", modesEx);
  }
}

const detected = detectModeWithUserModes(message, userModes);
const mode = detected.primary as Mode;
const hybrid = detected.hybrid as Mode | undefined;
const customMode = detected.customMode ?? null;
const isCustomMode = detected.isCustomMode;

const state = detectState(message);

console.log("coach: mode=", mode, "hybrid=", hybrid, "state=", state, "isCustomMode=", isCustomMode);
    console.log("coach: mode=", mode, "hybrid=", hybrid, "state=", state);
const personalisedContext = buildPersonalisedContext(
  onboardingProfile,
  customMode
);

const fallbackModeFraming =
  MODE_FRAMING[mode as Mode] ?? MODE_FRAMING.GENERAL_EXECUTION;

const hybridFraming =
  hybrid && MODE_FRAMING[hybrid as Mode]
    ? `\n\nSecondary: ${MODE_FRAMING[hybrid as Mode]}`
    : "";

const customModeInstruction = customMode
  ? `\n\nIMPORTANT:
This user has a personalised Eblocki mode matched to their message.
Use the personalised mode above before hardcoded defaults.
Do not force Tristan-specific labels like LAW_MAX unless the user's custom mode or message clearly supports it.
Keep the Eblocki ideology, BLUF structure, academic integrity, and proof-first standard.
Adapt the proof artifact and evidence standard to this user's own mode.`
  : "";

const systemPrompt = `${CORE_PROMPT}

${fallbackModeFraming}${hybridFraming}

${personalisedContext}
${customModeInstruction}`;

    let assistantOutput = "";
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    aiConfigured = !!apiKey;
    console.log("coach: aiConfigured=", aiConfigured);
    if (apiKey) {
      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message },
            ],
          }),
        });
        if (!aiResp.ok) {
          const errText = await aiResp.text();
          console.error("coach: AI gateway error", aiResp.status, errText);
          aiError = `AI_HTTP_${aiResp.status}`;
          usedFallback = true;
          assistantOutput = fallbackResponse(message, mode, state);
        } else {
          const j = await aiResp.json();
          assistantOutput = j.choices?.[0]?.message?.content ?? fallbackResponse(message, mode, state);
          if (!j.choices?.[0]?.message?.content) {
            usedFallback = true;
            aiError = "AI_EMPTY_RESPONSE";
          } else {
            console.log("coach: AI call succeeded");
          }
        }
      } catch (apiErr) {
        console.error("coach: AI fetch error", apiErr);
        aiError = apiErr instanceof Error ? apiErr.message : "AI_FETCH_ERROR";
        usedFallback = true;
        assistantOutput = fallbackResponse(message, mode, state);
      }
    } else {
      usedFallback = true;
      aiError = "AI_NOT_CONFIGURED";
      assistantOutput = fallbackResponse(message, mode, state);
    }

const proofContract = customMode
  ? buildCustomModeContract(message, assistantOutput, customMode)
  : buildContract(message, assistantOutput, mode as Mode);
function buildCustomModeContract(
  message: string,
  output: string,
  customMode: UserMode
): ProofContract {
  const text = `${message}\n${output}`.toLowerCase();

  let seriousness = 0;

  for (const verb of SERIOUS_VERBS) {
    if (new RegExp(`\\b${verb}\\b`).test(text)) seriousness++;
  }

  if (/\b(today|tonight|tomorrow|deadline|due|exam|assessment|shift|match|client)\b/.test(text)) {
    seriousness += 2;
  }

  seriousness = Math.max(1, Math.min(10, seriousness));

  const proofExample =
    customMode.proof_examples?.[0] ||
    `Concrete proof artifact for ${customMode.display_name}`;

  const eliteStandard =
    customMode.elite_evidence_examples?.[0] ||
    "Artifact includes action, application, feedback, correction, and next upgrade.";

  return {
    shouldCreate: seriousness >= 4,
    domain: customMode.mode_id.toLowerCase(),
    mode: customMode.mode_id as Mode,
    title: `${customMode.display_name}: Proof Contract`,
    requiredArtifact: proofExample,
    evidenceStandard: eliteStandard,
    dueDate: null,
    seriousnessScore: seriousness,
    reason:
      seriousness >= 4
        ? "Detected a serious action request inside a personalised mode."
        : "Casual or low-seriousness request inside a personalised mode.",
  };
}
    // Persist interaction
    let interaction: { id: string } | null = null;
    if (userId) {
      try {
        const { data: interactionData, error: insErr } = await supabase
          .from("coach_interactions")
          .insert({
            user_id: userId,
            mode,
            user_input: message,
            assistant_output: assistantOutput,
            state_detected: state,
            proof_required: proofContract.shouldCreate,
          })
          .select()
          .single();
        if (insErr) {
          databaseInteractionError = insErr.message;
          console.error("coach: interaction insert failed", insErr.message);
        } else {
          interaction = interactionData;
          console.log("coach: interaction stored", interaction?.id);
        }
      } catch (dbErr) {
        databaseInteractionError = dbErr instanceof Error ? dbErr.message : "DB_ERROR";
        console.error("coach: interaction insert threw", dbErr);
      }
    } else {
      databaseInteractionError = "USER_NOT_AUTHENTICATED";
    }

    let commitmentId: string | null = null;
    if (userId && proofContract.shouldCreate && autoCreate && proofContract.seriousnessScore >= threshold) {
      try {
        const { data: pc, error: pcErr } = await supabase
          .from("proof_commitments")
          .insert({
            user_id: userId,
            coach_interaction_id: interaction?.id ?? null,
            domain: proofContract.domain,
            mode: proofContract.mode,
            title: proofContract.title,
            required_artifact: proofContract.requiredArtifact,
            evidence_standard: proofContract.evidenceStandard,
            status: "pending",
          })
          .select()
          .single();
        if (pcErr) {
          databaseCommitmentError = pcErr.message;
          console.error("coach: commitment insert failed", pcErr.message);
        } else {
          commitmentId = pc?.id ?? null;
          console.log("coach: commitment stored", commitmentId);
          if (pc?.id && interaction?.id) {
            await supabase.from("coach_interactions").update({ proof_contract_id: pc.id }).eq("id", interaction.id);
          }
        }
      } catch (pcEx) {
        databaseCommitmentError = pcEx instanceof Error ? pcEx.message : "DB_ERROR";
        console.error("coach: commitment insert threw", pcEx);
      }
    } else if (!userId && proofContract.shouldCreate) {
      databaseCommitmentError = "USER_NOT_AUTHENTICATED";
    }

    const response = {
      success: true,
      mode,
      hybrid: hybrid ?? null,
      state: state ?? null,
      response: assistantOutput,
      proofContract,
      proofQuestion: "What proof artifact will confirm completion?",
      interactionId: interaction?.id ?? null,
      commitmentId,
      debug: { usedFallback, aiConfigured, aiError, databaseInteractionError, databaseCommitmentError },
    };
    console.log("coach: final response returned", { mode, state, usedFallback, hasInteraction: !!interaction, hasCommitment: !!commitmentId });

    return new Response(JSON.stringify(response), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("coach: top-level error", e);
    // Return 200 with fallback so the UI can still render rather than show "non-2xx"
    const errMsg = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({
        success: true,
        mode: "GENERAL_EXECUTION",
        hybrid: null,
        state: null,
        response: fallbackResponse("", "GENERAL_EXECUTION", "scattered"),
        proofContract: buildContract("", "", "GENERAL_EXECUTION"),
        proofQuestion: "What proof artifact will confirm completion?",
        interactionId: null,
        commitmentId: null,
        debug: { usedFallback: true, aiConfigured: !!Deno.env.get("LOVABLE_API_KEY"), aiError: errMsg, databaseInteractionError: errMsg, databaseCommitmentError: errMsg },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
