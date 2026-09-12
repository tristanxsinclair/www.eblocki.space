import { describe, expect, it } from "vitest";
import { normaliseBuildInfo } from "@/lib/eblocki/build-info";

describe("build identity", () => {
  it("derives a short SHA from observed build metadata", () => {
    expect(normaliseBuildInfo({ commitSha: "6ab937c4aabbccddeeff00112233445566778899" })).toMatchObject({
      commitSha: "6ab937c4aabbccddeeff00112233445566778899",
      shortCommitSha: "6ab937c4aabb",
    });
  });

  it("keeps unavailable values unknown instead of inventing provenance", () => {
    expect(normaliseBuildInfo({ commitSha: "", buildId: "  " })).toEqual({
      commitSha: null,
      shortCommitSha: null,
      buildTimestamp: null,
      buildId: null,
      environment: null,
      appVersion: null,
    });
  });
});
