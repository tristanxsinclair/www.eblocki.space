import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- inline mode/state/contract logic (copy of src/lib/eblocki, kept in-function) ---
type Mode = "LAW_MAX" | "PSYCH_HD" | "SALES_CLOSE" | "EBLOCKI" | "SPORT" | "BRAND" | "CAREER_MONEY" | "GENERAL_EXECUTION";
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

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub as string;

    const { message } = await req.json();
    if (!message || typeof message !== "string" || message.length > 5000) {
      return new Response(JSON.stringify({ success: false, error: "Invalid message" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load config
    const { data: cfg } = await supabase.from("performance_os_config").select("*").eq("user_id", userId).maybeSingle();
    const model = cfg?.model || "google/gemini-3-flash-preview";
    const autoCreate = cfg?.auto_create_proof_contracts ?? true;
    const threshold = cfg?.proof_contract_minimum_seriousness ?? 5;

    const { primary: mode, hybrid } = detectMode(message);
    const state = detectState(message);

    const systemPrompt = `${CORE_PROMPT}\n\n${MODE_FRAMING[mode]}${hybrid ? `\n\nSecondary: ${MODE_FRAMING[hybrid]}` : ""}`;

    let assistantOutput = "";
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
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
        if (aiResp.status === 429) {
          return new Response(JSON.stringify({ success: false, error: "Rate limit hit. Try again in a minute." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (aiResp.status === 402) {
          return new Response(JSON.stringify({ success: false, error: "AI credits exhausted. Add funds in Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (!aiResp.ok) {
          console.error("AI gateway error", aiResp.status, await aiResp.text());
          assistantOutput = fallbackResponse(message, mode, state);
        } else {
          const j = await aiResp.json();
          assistantOutput = j.choices?.[0]?.message?.content ?? fallbackResponse(message, mode, state);
        }
      } catch (apiErr) {
        console.error("AI fetch error", apiErr);
        assistantOutput = fallbackResponse(message, mode, state);
      }
    } else {
      assistantOutput = fallbackResponse(message, mode, state);
    }

    const proofContract = buildContract(message, assistantOutput, mode);

    // Persist interaction
    let interaction: { id: string } | null = null;
    try {
      const { data: interactionData } = await supabase
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
      interaction = interactionData;
    } catch (dbErr) {
      console.error("Failed to persist interaction", dbErr);
      // Continue anyway; return response without interactionId
    }

    let commitmentId: string | null = null;
    if (proofContract.shouldCreate && autoCreate && proofContract.seriousnessScore >= threshold) {
      try {
        const { data: pc } = await supabase
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
        commitmentId = pc?.id ?? null;
        if (pc?.id && interaction?.id) {
          await supabase.from("coach_interactions").update({ proof_contract_id: pc.id }).eq("id", interaction.id);
        }
      } catch (pcErr) {
        console.error("Failed to create proof commitment", pcErr);
        // Continue anyway; return response without commitmentId
      }
    }

    const response: CoachResponse = {
      success: true,
      mode,
      hybrid: hybrid ?? null,
      state: state ?? null,
      response: assistantOutput,
      proofContract,
      proofQuestion: "What proof artifact will confirm completion?",
      interactionId: interaction?.id ?? null,
      commitmentId,
    };

    return new Response(JSON.stringify(response), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("coach error", e);
    return new Response(
      JSON.stringify({
        success: false,
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
