import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getProofStandardLookup } from "@/lib/eblocki/proof-check";

export default defineTool({
  name: "get_proof_standard",
  title: "Get proof standard",
  description:
    "Return Eblocki's rubric for a given goal/domain. Read-only. Does not access account data or persist anything.",
  inputSchema: {
    goal: z.string().optional().describe("Optional task or goal description."),
    domain_hint: z.string().optional().describe("Optional domain hint such as law, product, psychology, or general."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ goal, domain_hint }) => {
    const result = getProofStandardLookup({ goal, domainHint: domain_hint });
    const payload = {
      standard_key: result.standardKey,
      standard_label: result.standardLabel,
      required_evidence: result.requiredEvidence,
      missing_standard: result.missingStandard,
      elite_version: result.eliteVersion,
      next_upgrade: result.nextUpgrade,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});