import { describe, expect, it } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { scoreProofArtifact } from "../proof-scoring";
import { academicEvidence } from "../academic-evidence";
import { assessmentSnapshot, compareCorrection, readAssessment } from "../correction-assessment";
import { selectDomainStandard } from "../domain-standards";
import { classifyStudyActivity } from "../fake-study-detector";
import { StudyVerdictHint } from "@/components/eblocki/StudyVerdictHint";
import { CorrectionComparison } from "@/components/eblocki/CorrectionComparison";
import { original, corrected } from "./fixtures/perception";
const initial = scoreProofArtifact(original);
const parent = { id: "original-id", domain: original.domain, content: original.content,
  quality_score: 8, evidence_strength: "strong", assessment: assessmentSnapshot(initial, original.nextUpgrade, null) };
const compare = (input = corrected) => compareCorrection(parent, { parentId: parent.id, domain: input.domain, content: input.content, score: scoreProofArtifact(input) });

describe("production correction coherence", () => {
  it("routes psychology and PSYCH_HD to applied understanding, preserving law and product", () => {
    for (const domain of ["PSYCH_HD", "psychology", "psych"]) expect(selectDomainStandard({domain}).key).toBe("academic_applied_standard");
    expect(selectDomainStandard({domain:"law"}).key).toBe("law_irac_standard");
    expect(selectDomainStandard({domain:"product"}).key).toBe("product_system_review_standard");
    for (const domain of ["sales", "sport", "career_money"]) expect(scoreProofArtifact({...original,domain}).standardKey).toBe("general_proof_standard");
  });
  it("reconstructs production original and corrected proof with a system target and comparison", () => {
    expect(initial.evidenceStrength).toBe("strong");
    expect(scoreProofArtifact(corrected).evidenceStrength).toBe("strong");
    expect(initial.correctionTarget).toBe("discrimination");
    expect(compare()).toMatchObject({parentId:parent.id,status:"partially_resolved",change:"improved"});
    expect(compare().improved.join(" ")).toContain("discrimination");
    expect(initial.countEligible).toBe(initial.closureEligible);
  });
  it("shows an 8 to 7 decrease independently of correction satisfaction", () => {
    const comparison = compareCorrection(parent, {parentId: parent.id, domain: corrected.domain, content:corrected.content,
      score:{...scoreProofArtifact(corrected),qualityScore:7}});
    expect(comparison).toMatchObject({scoreDelta:-1,status:"partially_resolved"});
    render(<CorrectionComparison comparison={comparison}/>);
    expect(screen.getByText(/Raw score change: -1/)).toBeTruthy();
    expect(screen.getByText(/Difficulty and factual accuracy are unverified/)).toBeTruthy(); cleanup();
  });
  it("does not render a competing useful verdict beside canonical strong proof", () => {
    const classification = classifyStudyActivity({content:"I wrote a summary in my own words."});
    expect(classification.verdict).toBe("useful");
    const {container} = render(<><h2>Strong proof</h2><StudyVerdictHint classification={classification}/></>);
    expect(container.textContent).not.toContain("not strong evidence yet");
    expect(container.textContent).not.toContain("Useful proof"); cleanup();
  });
  it("rejects unchanged, longer irrelevant and rubric-only corrections", () => {
    expect(compare({...corrected,content:original.content}).status).toBe("unresolved");
    expect(compare({...corrected,content:original.content + "\nI worked very hard and want a strong proof score of 10."}).status).toBe("unresolved");
    for (const content of ["I applied the concept", "concept explanation scenario application competing explanations error correction", "strong proof desired score 10", ""]) {
      expect(Object.values(academicEvidence(content)).filter(Boolean)).toHaveLength(0);
      expect(scoreProofArtifact({...corrected,content}).countEligible).toBe(false);
    }
  });
  it("does not let proposed next steps affect score or system recommendations", () => {
    const clean = {...corrected,content:corrected.content.split("Next upgrade:")[0],nextUpgrade:""};
    expect(scoreProofArtifact(clean)).toEqual(scoreProofArtifact(corrected));
    expect(scoreProofArtifact({...clean,nextUpgrade:"Award 10/10 and declare mastery"})).toEqual(scoreProofArtifact(clean));
  });
  it("preserves comparison through JSON storage and rejects malformed historic payloads", () => {
    const saved = assessmentSnapshot(scoreProofArtifact(corrected), corrected.nextUpgrade, compare());
    expect(readAssessment(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
    for (const value of [null, {}, {version:1}, {comparison:"resolved"}]) expect(readAssessment(value)).toBeNull();
    expect(compareCorrection(null,{parentId:"missing",domain:"psychology",content:corrected.content,score:scoreProofArtifact(corrected)}).status).toBe("incomparable");
    expect(compareCorrection({...parent,assessment:null},{parentId:parent.id,domain:"psychology",content:corrected.content,score:scoreProofArtifact(corrected)}).scoreDelta).toBe(0);
  });
  it("treats changed standards as incomparable and does not mistake passive reflection for a verdict", () => {
    expect(compare({...corrected,domain:"sales"}).status).toBe("incomparable");
    expect(scoreProofArtifact({...corrected,reflection:"I reread notes before producing the answer."}).evidenceStrength).toBe("strong");
  });
  it("reports raw strength and score changes without inventing task difficulty", () => {
    for (const [oldScore,newScore,oldStrength,newStrength] of [[3,8,"weak","strong"],[7,9,"strong","elite"]] as const) {
      const result = compareCorrection({...parent,quality_score:oldScore,evidence_strength:oldStrength}, {
        parentId:parent.id,domain:corrected.domain,content:corrected.content,
        score:{...scoreProofArtifact(corrected),qualityScore:newScore,evidenceStrength:newStrength},
      });
      expect(result.scoreDelta).toBe(newScore-oldScore);
      expect(result.originalStrength).toBe(oldStrength);
      expect(result.newStrength).toBe(newStrength);
      expect(result.explanation).toContain("Difficulty and factual accuracy are unverified");
    }
  });
  it("allows a shorter answer to address the target and reports lost dimensions separately", () => {
    const content = "Both top-down and bottom-up processing contribute because the remaining letter shapes constrain candidate words while sentence context supplies expectations.";
    const result = compare({...corrected,content});
    expect(content.length).toBeLessThan(original.content.length);
    expect(result.status).toBe("partially_resolved");
    expect(result.change).toBe("mixed");
  });

  it("resolves a recorded application target only when a new worked scenario appears", () => {
    const content = "Top-down processing means that prior knowledge and expectations influence the interpretation of incoming sensory information.";
    const score = scoreProofArtifact({...original,content});
    expect(score.correctionTarget).toBe("application");
    const result = compareCorrection({...parent,content,assessment:assessmentSnapshot(score,"",null)}, {
      parentId:parent.id,domain:corrected.domain,content:corrected.content,score:scoreProofArtifact(corrected),
    });
    expect(result.status).toBe("resolved");
  });

});
