import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Route = {
  domain: string;
  intent: string;
  state: string;
  mode: string;
  confidence: number;
  proofStandardKey: string;
  title: string;
  requiredArtifact: string;
  evidenceStandard: string;
  action: string;
};

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function lower(value: string): string {
  return clean(value).toLowerCase();
}

function has(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function routeCoach(message: string): Route {
  const text = lower(message);
  const mentionsLawUnit = has(text, /\b(blaw\d{4}|laws\d{4}|law unit|law study|law mastery)\b/);
  const sourceBank = has(text, /\b(source[- ]?bank|authority log|authority logging|statute note|case note|issue matrix|source preparation)\b/);
  const academicPlan = has(text, /\b(study system|mastery plan|proof plan|unit plan|weekly law proof|academic workflow|unit preparation|source strategy)\b/);
  const legalAnswer = has(text, /\b(irac|legal answer|problem answer|legal reasoning|issue|rule|application|case explanation|statute explanation|legal analysis)\b/);
  const proofReview = has(text, /\b(review|judge|verdict|court of evidence|score|critique|audit|mark my|feedback on)\b/) && has(text, /\b(proof|artifact|answer|paragraph|submission|work)\b/);
  const productReview = has(text, /\b(eblocki|coach router|router|routing|court|proof standard|product system|ux|dashboard|logic|bug|behaviour|behavior)\b/) && has(text, /\b(review|critique|wrong|fix|bug|mismatch|standard|classified|classification|logic)\b/);
  const executionLock = has(text, /\b(overbuild|overbuilding|planning too much|more theory|drifting|avoid|procrastinat|one artifact|required now)\b/);

  if (productReview) {
    return {
      domain: "product",
      intent: "product_system_review",
      state: "strategic_build",
      mode: "EBLOCKI_BUILD",
      confidence: 0.92,
      proofStandardKey: "product_system_review_standard",
      title: "Product System Review",
      requiredArtifact: "One product-system review with actual output evidence, corrected logic, implementation path, and measurable test.",
      evidenceStandard: "specific product issue identified / evidence from actual output or screen / corrected logic proposed / implementation path stated / measurable test or acceptance criterion / next upgrade defined",
      action: "Submit one product-system review: actual output, corrected logic, implementation path, and measurable acceptance test.",
    };
  }

  if (sourceBank || (mentionsLawUnit && has(text, /\b(authority|statute|case|source|matrix)\b/))) {
    return sourceBankRoute();
  }

  if ((mentionsLawUnit && academicPlan) || (academicPlan && has(text, /\blaw\b/))) {
    return sourceBankRoute("academic_proof_plan", "academic_operating_system", 0.95);
  }

  if (proofReview) {
    return {
      domain: legalAnswer || mentionsLawUnit ? "law" : "general",
      intent: "proof_review",
      state: legalAnswer ? "confused" : "clear",
      mode: "proof_review",
      confidence: 0.86,
      proofStandardKey: legalAnswer || mentionsLawUnit ? "law_irac_standard" : "general_proof_standard",
      title: "Proof Review Submission",
      requiredArtifact: "One submitted artifact plus the standard it should be judged against.",
      evidenceStandard: legalAnswer || mentionsLawUnit
        ? "issue identified / rule stated accurately / authority used / application to facts / conclusion / citation precision"
        : "visible artifact / applied detail / feedback awareness / next upgrade",
      action: "Submit the artifact for Court review with the exact standard it should be judged against.",
    };
  }

  if (legalAnswer) {
    return {
      domain: "law",
      intent: "legal_reasoning",
      state: "clear",
      mode: "LAW_MAX",
      confidence: 0.88,
      proofStandardKey: "law_irac_standard",
      title: "IRAC Paragraph",
      requiredArtifact: "One 200-400 word IRAC paragraph with issue, rule, authority, application, conclusion, and citation precision.",
      evidenceStandard: "issue identified / rule stated accurately / authority used / application to facts / conclusion / counterargument or limitation where relevant / citation precision",
      action: "Write one IRAC paragraph with issue, rule, authority, application, conclusion, and one limitation if relevant.",
    };
  }

  if (executionLock) {
    return {
      domain: "general",
      intent: "execution_lock",
      state: "pre_execution",
      mode: "GENERAL_EXECUTION",
      confidence: 0.82,
      proofStandardKey: "general_proof_standard",
      title: "Execution Lock Artifact",
      requiredArtifact: "One visible artifact with one evidence standard.",
      evidenceStandard: "visible artifact / applied detail / feedback awareness / next upgrade",
      action: "Produce one visible artifact in 25 minutes. No second requirement until it exists.",
    };
  }

  return {
    domain: "general",
    intent: text.endsWith("?") ? "question" : "diagnosis",
    state: "clear",
    mode: "GENERAL_EXECUTION",
    confidence: 0.58,
    proofStandardKey: "general_proof_standard",
    title: "General Proof Artifact",
    requiredArtifact: "One visible artifact with applied detail, feedback awareness, and next upgrade.",
    evidenceStandard: "visible artifact / applied detail / feedback awareness / next upgrade",
    action: "Submit one concrete artifact that proves the action happened and names the next upgrade.",
  };
}

function sourceBankRoute(intent = "law_source_bank", mode = "LAW_MAX", confidence = 0.94): Route {
  return {
    domain: "law_academic",
    intent,
    state: intent === "academic_proof_plan" ? "strategic_build" : "pre_execution",
    mode,
    confidence,
    proofStandardKey: "law_source_bank_standard",
    title: intent === "academic_proof_plan" ? "BLAW1003 + LAWS1004 Source Bank Start" : "Law Source Bank Entries",
    requiredArtifact: "Two completed source-bank entries with source, jurisdiction, authority level, current version check, key rule, unit relevance, assessment use, limitation, and confidence rating.",
    evidenceStandard: "source name / jurisdiction / authority level / current version checked / key provision or material / key rule / unit relevance / possible assessment use / limitation or counterargument / confidence rating",
    action: "Create two source-bank entries:\n1. BLAW1003 - Native Title Act 1993 (Cth)\n2. LAWS1004 - Competition and Consumer Act 2010 (Cth), Schedule 2 Australian Consumer Law",
  };
}

function deterministicResponse(route: Route): string {
  if (route.intent === "academic_proof_plan") {
    return "This is a law academic operating-system request, not an IRAC request. One artifact only: create two verified source-bank entries, one for BLAW1003 and one for LAWS1004. After two source-bank entries exist, generate one issue matrix. Do not require an IRAC paragraph before at least one authority exists.";
  }
  if (route.intent === "product_system_review") {
    return "This is product-system proof, not law-answer proof. Submit one review with actual output evidence, corrected logic, implementation path, and a measurable test. Identity escalation stays blocked until implementation or external proof exists.";
  }
  if (route.intent === "law_source_bank") {
    return "Source-bank work comes before analysis. Verify the authority, complete the source-bank fields, and only then move to an issue matrix or IRAC paragraph.";
  }
  if (route.intent === "legal_reasoning") {
    return "Use IRAC: issue, rule with authority, application to facts, and conclusion. Do not invent authority. The proof artifact is one IRAC paragraph judged by the law IRAC standard.";
  }
  if (route.intent === "execution_lock") {
    return "Planning is replacing proof. Produce one visible artifact in 25 minutes. No second requirement until it exists.";
  }
  return `Classified as ${route.intent} in ${route.domain}. Next action: ${route.action}`;
}

function shouldCreateContract(message: string, route: Route): boolean {
  if (["academic_proof_plan", "law_source_bank", "product_system_review", "execution_lock"].includes(route.intent)) return true;
  return /\b(write|draft|study|prepare|build|practise|practice|revise|reflect|train|sell|complete|submit|create|produce|fix|review)\b/i.test(message);
}

async function callAi(message: string, route: Route): Promise<{ output: string; error: string | null; usedFallback: boolean; configured: boolean }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return { output: deterministicResponse(route), error: "AI_NOT_CONFIGURED", usedFallback: true, configured: false };

  try {
    const system = [
      "You are Eblocki Coach. Use the deterministic route exactly.",
      "One classification, one artifact, one proof standard, one next action.",
      "Do not fabricate legal sources. Do not create competing artifacts.",
      `Route: ${JSON.stringify(route)}`,
    ].join("\n");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: message },
        ],
        temperature: 0.2,
        max_tokens: 220,
      }),
    });

    if (!resp.ok) return { output: deterministicResponse(route), error: `AI_HTTP_${resp.status}`, usedFallback: true, configured: true };
    const json = await resp.json();
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return { output: deterministicResponse(route), error: "AI_EMPTY_RESPONSE", usedFallback: true, configured: true };
    }
    return { output: content.trim(), error: null, usedFallback: false, configured: true };
  } catch (error) {
    return { output: deterministicResponse(route), error: error instanceof Error ? error.message : "AI_FETCH_ERROR", usedFallback: true, configured: true };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message : "";
    if (!message || message.length > 5000) {
      return new Response(JSON.stringify({ success: false, error: "Invalid message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Require authentication BEFORE invoking AI to prevent unauthenticated
    // AI credit consumption.
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });

    let userId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      userId = null;
    }
    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const route = routeCoach(message);
    const ai = await callAi(message, route);

    const proofContract = {
      shouldCreate: shouldCreateContract(message, route),
      domain: route.domain,
      mode: route.mode,
      title: route.title,
      requiredArtifact: route.requiredArtifact,
      evidenceStandard: route.evidenceStandard,
      dueDate: null,
      seriousnessScore: shouldCreateContract(message, route) ? 8 : 0,
      reason: "Typed coach route requires one artifact with one standard.",
    };

    let interactionId: string | null = null;
    let commitmentId: string | null = null;
    let interactionFailed = false;
    let commitmentFailed = false;

    if (userId) {
      const { data, error } = await supabase
        .from("coach_interactions")
        .insert({
          user_id: userId,
          mode: route.mode,
          user_input: message,
          assistant_output: ai.output,
          state_detected: route.state,
          proof_required: proofContract.shouldCreate,
        })
        .select("id")
        .single();
      if (error) {
        interactionFailed = true;
        console.error("coach: coach_interactions insert failed", error.message);
      } else interactionId = data?.id ?? null;

      if (proofContract.shouldCreate) {
        const { data: commitment, error: commitError } = await supabase
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
        if (commitError) {
          commitmentFailed = true;
          console.error("coach: proof_commitments insert failed", commitError.message);
        } else commitmentId = commitment?.id ?? null;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      mode: route.mode,
      hybrid: null,
      state: route.state,
      response: ai.output,
      proofContract,
      proofQuestion: "What proof artifact will confirm completion?",
      interactionId,
      commitmentId,
      debug: {
        usedFallback: ai.usedFallback,
        aiConfigured: ai.configured,
        interactionFailed,
        commitmentFailed,
        route: {
          domain: route.domain,
          intent: route.intent,
          state: route.state,
          confidence: route.confidence,
          proofStandardKey: route.proofStandardKey,
        },
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("coach: top-level error", err);
    const route = routeCoach("");
    return new Response(JSON.stringify({
      success: true,
      mode: "GENERAL_EXECUTION",
      hybrid: null,
      state: "clear",
      response: "No data yet. Submit one small proof artifact to begin the pattern.",
      proofContract: {
        shouldCreate: false,
        domain: route.domain,
        mode: route.mode,
        title: route.title,
        requiredArtifact: route.requiredArtifact,
        evidenceStandard: route.evidenceStandard,
        dueDate: null,
        seriousnessScore: 0,
        reason: "Top-level fallback.",
      },
      proofQuestion: "What proof artifact will confirm completion?",
      interactionId: null,
      commitmentId: null,
      debug: { usedFallback: true },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
