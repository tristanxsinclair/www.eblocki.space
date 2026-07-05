import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  buildRefusalPayload,
  checkAnalysisSafety,
  runProofCheck,
} from "@/lib/eblocki/proof-check";

export default defineTool({
  name: "suggest_next_command",
  title: "Suggest next command",
  description:
    "Return the next Eblocki proof command from supplied artifact text. Read-only. Does not access account history or write results.",
  inputSchema: {
    artifact_text: z.string().min(1).describe("Pasted artifact text only."),
    goal: z.string().optional().describe("Optional goal or claimed completion statement."),
    domain_hint: z.string().optional().describe("Optional domain hint."),
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
      next_command: result.nextCommand,
      recommended_artifact_type: result.recommendedArtifactType,
      proof_question: result.proofQuestion,
      mode_warning: result.modeWarning,
      read_only_notice: result.readOnlyNotice,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});