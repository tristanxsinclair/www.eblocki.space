import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { scoreProofArtifact } from "../proof-scoring";
import { original, corrected } from "./fixtures/perception";
const require = createRequire(import.meta.url);
const generated = require("../../../../mcp-dist/src/lib/eblocki/proof-scoring.js") as { scoreProofArtifact: typeof scoreProofArtifact };
describe("generated MCP scoring parity", () => {
  it("agrees with browser source for production and adversarial inputs", () => {
    for (const input of [original, corrected, {...corrected,content:"I applied the concept"}, {...original,domain:"sales"}]) {
      expect(generated.scoreProofArtifact(input)).toEqual(scoreProofArtifact(input));
    }
  });
});
