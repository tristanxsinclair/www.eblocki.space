import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  buildRefusalPayload,
  checkAnalysisSafety,
  runProofCheck,
} from "@/lib/eblocki/proof-check";

export default defineTool({
  name: "check_proof_artifact",
  title: "Check proof artifact",
  description:
    "Judge pasted proof artifact text against Eblocki's rubric. Read-only. Does not access account data or verify external facts.",
  inputSchema: {
    artifact_text: z.string().min(1).describe("Pasted artifact text only. No files, links, or secrets."),
    goal: z.string().optional().describe("Optional claimed goal or completion statement."),
    domain_hint: z.string().optional().describe("Optional domain hint such as law, product, psychology, or general."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ artifact_text, goal, domain_hint }) => {
    const safety = { artifactText: artifact_text, goal, domainHint: domain_hint };
    if (checkAnalysisSafety(safety).blocked) {
      const refusal = buildRefusalPayload(safety);
      return {
        content: [{ type: "text", text: JSON.stringify(refusal) }],
        structuredContent: refusal,
        isError: true,
      };
    }
    const result = runProofCheck({
      artifactText: artifact_text,
      goal,
      domainHint: domain_hint,
    });
    const payload = {
      verdict: result.verdict,
      score: result.score,
      selected_standard: result.selectedStandard,
      standard_label: result.standardLabel,
      reasoning_summary: result.reasoningSummary,
      self_deception_risk: result.selfDeceptionRisk,
      limitations: result.limitations,
      read_only_notice: result.readOnlyNotice,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});