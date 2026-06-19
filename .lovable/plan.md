## BLUF

Add a deterministic **Fake Study Detector v1** that classifies a student's described study activity as `weak | useful | strong | elite`, returns the required verdict copy + one Proof Upgrade Command, and surfaces it in the existing Proof page (pre-submit hint + post-submit verdict). No Supabase schema change, no changes to scoring engine, Court, Sentinel, identity ledger, or Dashboard data flow.

## Repo findings

- Stack confirmed: React 18 + Vite + TS + React Router + Tailwind/shadcn + Supabase + Capacitor. No Next.js.
- Existing proof pipeline:
  - `src/lib/eblocki/proof-scoring.ts` — `scoreProofArtifact()` returns `qualityScore` + `evidenceStrength` (`weak|moderate|strong|elite`). Generic, marker-based. **Does not classify study-activity type** (passive vs retrieval vs applied vs timed/marked).
  - `src/lib/eblocki/domain-standards.ts` — domain rubric selection.
  - `src/lib/eblocki/proof-standard-preview.ts` + `ProofStandardPreviewPanel.tsx` — pre-submit standard preview.
  - `src/lib/eblocki/next-upgrade-extract.ts` — pulls upgrade text out of content.
  - `src/pages/Proof.tsx` (1347 lines) — submission flow. Already calls `scoreProofArtifact`, shows `EvidenceStrengthBadge`, toasts verdict, and (per H1.2) routes to `/dashboard`.
  - DB trigger `cle_after_proof_insert` writes Court verdict + XP server-side from `quality_score` / `evidence_strength`. **Do not touch.**
- Tests live in `src/lib/eblocki/__tests__/` (vitest). 174/174 passing per prior pass.

## Existing systems to reuse

- `scoreProofArtifact` for the existing quality score (unchanged).
- `ProofStandardPreviewPanel` slot for pre-submit hint.
- Existing verdict card area on Proof.tsx for post-submit verdict.
- Existing toast + back-to-dashboard CTA.

## Design — Fake Study Detector v1

Pure deterministic TS module at `src/lib/eblocki/fake-study-detector.ts`.

Public API:

```ts
export type StudyVerdict = "weak" | "useful" | "strong" | "elite";

export interface StudyClassification {
  verdict: StudyVerdict;
  reason: string;          // short why
  verdictCopy: string;     // exact required copy
  upgradeCommand: string;  // one Proof Upgrade Command
  matchedSignal: string;   // e.g. "passive_exposure"
}

export function classifyStudyActivity(input: {
  content?: string;
  title?: string;
  artifactType?: string;
}): StudyClassification;
```

Classification rules (deterministic, ordered — highest wins):

1. **Elite** — regex hits for timed AND (marked|corrected|feedback|rewrite|self-mark|closed[- ]book).
   Examples: "closed-book timed", "marked my answer", "rewrote after feedback".
2. **Strong** — assessable output / applied explanation:
   `\b(irac|essay plan|thesis|practice question|timed (answer|question)|taught (myself|aloud)|from memory|applied .* to|mistake ledger|past paper|exam answer|wrote (a|an|one) (paragraph|answer))\b`.
3. **Useful** — retrieval / setup-for-retrieval / AI support:
   `\b(flashcard|quizlet|anki|recall|quiz|pomodoro|focus timer|asked (ai|chatgpt|gpt)|summari[sz]ed?|own words|short answer)\b`.
4. **Weak** — passive exposure / organisation:
   `\b(reread|re-read|read (the )?(slides|chapter|textbook)|highlight|watched (a |the )?(video|lecture|recording)|cop(y|ied) notes|made (a )?(dashboard|timetable|schedule|plan)|organi[sz]ed notes)\b`.
5. **Fallback** — if no signal but `content` length ≥ 250 and includes an action verb (`wrote|completed|produced|shipped|submitted`) → `useful`. Otherwise → `weak`.

Verdict copy (exact, required):

- weak: "You touched the material, but did not prove command of it. Upgrade required."
- useful: "This helps, but it is not strong evidence yet. Convert it into application."
- strong: "This is real study evidence. Store it and raise the next standard."
- elite: "This proves capability under pressure or correction. Identity evidence accepted."

Upgrade command — pick deterministically by `matchedSignal` from a small lookup, falling back to a per-verdict default from the spec ("Close the notes. Write 5 points from memory." / "Apply this concept to a new scenario." / "Add one counterargument or limitation." / "Save before/after versions as identity evidence.").

Empty/partial input → returns `weak` with a safe default reason + command. Never throws.

## UI integration (Proof.tsx only)

Two small, additive insertions:

1. **Live pre-submit hint** under the existing `ProofStandardPreviewPanel`:
   - Computes `classifyStudyActivity` from current `content`/`title`/`artifactType` (memoised).
   - New presentation component `src/components/eblocki/StudyVerdictHint.tsx` — single line: chip (`Weak / Useful / Strong / Elite`) + the verdict copy + one upgrade command. Mobile-first, dark/charcoal, green accent only for `strong|elite`.
   - Renders only when `content.length >= 12` so it doesn't flash on empty form.

2. **Post-submit verdict block** rendered alongside the existing `EvidenceStrengthBadge`:
   - Same `StudyVerdictHint` reused, fed by the submitted artifact.
   - Sits above the existing "Back to dashboard" CTA. Does not replace existing scoring UI.

No changes to submit payload, no new DB writes, no Supabase calls, no schema migration.

## What is NOT touched

- `proof-scoring.ts`, `domain-standards.ts`, `proof-standard-preview.ts`
- `cle_after_proof_insert` trigger and any DB function
- Court of Evidence, Sentinel, temporal engine, identity ledger
- Auth, RLS, storage, attachments, OCR
- Dashboard data flow / `DashboardForecastTabs` / CommandHero
- `MobileBottomNav`, `AppShell`

(Dashboard "next action" surfacing is **out of scope** for v1 — the spec marks it "where appropriate" and the existing CommandHero already shows latest verdict. Adding study-verdict to Dashboard would require touching dashboard view-model; deferred to a follow-up to keep this change small.)

## Files likely to change

- **Create** `src/lib/eblocki/fake-study-detector.ts`
- **Create** `src/lib/eblocki/__tests__/fake-study-detector.test.ts`
- **Create** `src/components/eblocki/StudyVerdictHint.tsx`
- **Edit** `src/pages/Proof.tsx` — two insertions (pre-submit hint, post-submit hint). No logic moves.

## Supabase / schema decision

**No schema changes.** Detector is pure client-side classification surfaced in UI. Existing `proof_artifacts.evidence_strength` + `quality_score` remain the persisted truth; study-verdict is a UI-layer overlay.

## Tests (vitest, fixture pattern matching existing files)

`fake-study-detector.test.ts`:

- weak: "I reread the slides for 1 hour"
- weak: "Built a beautiful Notion dashboard for my semester"
- useful: "Did 30 mins of Anki recall on torts"
- useful: "Asked ChatGPT to explain mens rea then summarised in my own words"
- strong: "Wrote one IRAC paragraph on negligence from memory and applied it to a scenario"
- strong: "Taught the concept aloud from memory then did a timed practice question"
- elite: "Closed-book timed answer on contract formation, self-marked against the rubric, rewrote after feedback"
- fallback: empty string → weak, no crash
- fallback: 300-char generic action-verb content → useful
- upgrade-command: weak verdict returns one of the spec upgrade commands
- verdict-copy: each verdict returns the exact required copy

## Mobile UX decision

- `StudyVerdictHint` is a single stacked block on `<640px`: chip on row 1, verdict copy on row 2, upgrade command on row 3. No horizontal scroll. Uses existing tokens (`text-foreground`, `text-muted-foreground`, `bg-card`, `border-border`).

## Verification plan

1. `bunx vitest run` — expect 174 + new tests pass.
2. Build via harness.
3. Playwright at 390×1800 on `/proof`:
   - Type "reread slides" → hint shows weak + correct copy + upgrade command.
   - Type strong sample → hint shifts to strong.
   - Submit strong sample → post-submit StudyVerdictHint visible above "Back to dashboard".
   - No horizontal overflow, no `pageerror`.

## Risks / limits

- Deterministic regex won't catch every phrasing. Acceptable for v1 — falls back to `weak`, which is the safe default per doctrine ("no artifact, no claim").
- Detector verdict and `evidence_strength` from `scoreProofArtifact` are independent — they may disagree (e.g. long passive-exposure text could score moderate while detector says weak). This is intentional for v1: the detector explicitly punishes fake study even when the rubric scorer is generous. Copy will make the two signals distinct ("Activity classification" vs "Standard score").
- No backend persistence means the verdict isn't replayed when revisiting an old artifact's detail view. Out of scope for v1.

## Build Mode prompt (use after approval)

> BUILD MODE. Implement the approved Fake Study Detector v1 plan exactly as specified. Create `src/lib/eblocki/fake-study-detector.ts`, its vitest file under `src/lib/eblocki/__tests__/`, `src/components/eblocki/StudyVerdictHint.tsx`, and edit `src/pages/Proof.tsx` to render the hint pre-submit (under `ProofStandardPreviewPanel`) and post-submit (above the "Back to dashboard" CTA). Do not change `proof-scoring.ts`, DB triggers, Court, Sentinel, identity ledger, Dashboard, AppShell, or any Supabase schema. Use exact verdict copy from the plan. Run `bunx vitest run`, then a Playwright smoke at 390×1800 on `/proof` to confirm hint renders, no horizontal overflow, no pageerror. Report files changed, exact test result, build status, browser QA result, and remaining risks.
