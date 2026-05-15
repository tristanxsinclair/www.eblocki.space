import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Minimal, robust coach function: validate input, run lightweight heuristics,
// and return a stable, predictable response matching the client-side normaliser.

function detectModeSimple(text: string) {
  const t = text.toLowerCase();
  if (/\blaw|irac|statutory|laws1005|laws1006\b/.test(t)) return { primary: "LAW_MAX", hybrid: null };
  if (/\bpsych|psyc|cognition|caee\b/.test(t)) return { primary: "PSYCH_HD", hybrid: null };
  if (/\bsales|gse|customer|close\b/.test(t)) return { primary: "SALES_CLOSE", hybrid: null };
  if (/\b(eblocki|discipline|avoidance|habit)\b/.test(t)) return { primary: "EBLOCKI", hybrid: null };
  if (/\bsoccer|training|match|striker\b/.test(t)) return { primary: "SPORT", hybrid: null };
  if (/\blinkedin|instagram|youtube|brand|content\b/.test(t)) return { primary: "BRAND", hybrid: null };
  if (/\bresume|cover letter|career|money|budget\b/.test(t)) return { primary: "CAREER_MONEY", hybrid: null };
  return { primary: "GENERAL_EXECUTION", hybrid: null };
}

function detectStateSimple(text: string) {
  const t = text.toLowerCase();
  if (/reorganis|reorganiz|tidy|setup|stuck|circl/i.test(t)) return "avoidant";
  if (/too much|overwhelm|drowning|behind/i.test(t)) return "overloaded";
  if (/tired|exhausted|no energy|burnt/i.test(t)) return "low_energy";
  if (/big idea|huge plan|launch everything|empire/i.test(t)) return "hype_drift";
  if (/on a roll|momentum|in flow|just shipped/i.test(t)) return "momentum";
  if (t.length < 40) return "low_energy";
  return "scattered";
}

function buildContractSimple(message: string, assistantOutput: string, mode: string) {
  const text = (message + "\n" + assistantOutput).toLowerCase();
  let seriousness = 0;
  const verbs = ["write","draft","study","produce","submit","build","practice","reflect","revise","train","complete","prepare","ship","create","fix"];
  for (const v of verbs) if (new RegExp(`\\b${v}\\b`).test(text)) seriousness++;
  if (/\b(today|tomorrow|by \d|deadline|exam|due|assessment)\b/.test(text)) seriousness += 2;
  seriousness = Math.max(1, Math.min(10, seriousness));
  const domain = mode === "LAW_MAX" ? "law" : mode === "PSYCH_HD" ? "psychology" : mode === "SALES_CLOSE" ? "sales" : mode === "EBLOCKI" ? "discipline" : mode === "SPORT" ? "sport" : mode === "BRAND" ? "brand" : mode === "CAREER_MONEY" ? "career_money" : "general";
  const title = message.split("\n")[0].slice(0, 120) || "Next action";
  const artifact = mode === "LAW_MAX" ? "Written IRAC answer (250+ words)" : mode === "PSYCH_HD" ? "Applied paragraph (200+ words)" : mode === "SALES_CLOSE" ? "Shift reflection (one customer)" : mode === "EBLOCKI" ? "Daily Control Sheet line + completed task" : "Concrete output proving the action happened";
  const standard = "Artifact must include applied detail, reflection, and a next upgrade.";
  return {
    shouldCreate: seriousness >= 4,
    domain,
    mode,
    title,
    requiredArtifact: artifact,
    evidenceStandard: standard,
    dueDate: null,
    seriousnessScore: seriousness,
    reason: seriousness >= 4 ? `Detected ${seriousness} action signals — proof contract enforced.` : "No serious action detected.",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => null);
    const message = body?.message;
    if (!message || typeof message !== "string" || message.length > 5000) {
      return new Response(JSON.stringify({ success: false, error: "Invalid message" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Lightweight heuristics (deterministic fallback). Keep server behaviour stable.
    const modeResult = detectModeSimple(message);
    const state = detectStateSimple(message);
    const responseText = `## Bottom Line Up Front\n\nThe next move is one concrete proof artifact: ${modeResult.primary}.\n\nPROOF ARTIFACT: Submit one concrete artifact that demonstrates the required standard.`;
    const proofContract = buildContractSimple(message, responseText, modeResult.primary);

    const result = {
      success: true,
      mode: modeResult.primary,
      hybrid: modeResult.hybrid ?? null,
      state,
      response: responseText,
      proofContract,
      proofQuestion: "What proof artifact will confirm completion?",
      interactionId: null,
      commitmentId: null,
    };

    return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("coach function error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
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
