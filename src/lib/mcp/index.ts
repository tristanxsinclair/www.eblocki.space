import { auth, defineMcp } from "@lovable.dev/mcp-js";
import checkProofArtifactTool from "./tools/check-proof-artifact";
import getProofStandardTool from "./tools/get-proof-standard";
import suggestNextCommandTool from "./tools/suggest-next-command";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "eblocki-mcp",
  title: "Eblocki",
  version: "0.1.0",
  instructions:
    "Eblocki proof tools. Read-only. Judge pasted artifact text against Eblocki's evidence rubric; return proof standards and next commands. Never implies external verification, saved account access, or write actions.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [checkProofArtifactTool, getProofStandardTool, suggestNextCommandTool],
});