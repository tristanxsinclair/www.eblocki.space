
# Eblocki Mobile Beta Audit — Smallest Safe Plan

## 1. Current UX diagnosis

The proof loop works (Proof page, scoring, verdict, Court, Identity ledger, Temporal). The blockers are surface-level: too much intelligence is rendered at once on mobile, copy still leaks internal vocabulary, and a few subsystems (Coach, GameForge, Mistake Clinic, Identity Ledger) show output that contradicts itself or looks raw. A first-time beta user cannot reach the "submit one proof → understand verdict → come back tomorrow" path without seeing 6–8 advanced modules first.

## 2. Beta blockers (must fix before invites)

- B1. Safe-area / status-bar overlap on Landing + mobile top bar (CTA cut-off).
- B2. Horizontal overflow on Dashboard Temporal/Forecast section at 375px.
- B3. Coach domain mismatch: selected mode (e.g. Law) but response classified `general` — user loses trust immediately.
- B4. Coach output renders raw markdown (`##`, `**`) instead of the structured cards Coach already supports.
- B5. Mistake Clinic shows "resolved" items when open weak-point count is 0 (empty-state bug).
- B6. Identity / Evidence Ledger truncates evidence and hides verdict + standard.

## 3. Minor issues (fix in Phase 2)

- M1. Operator surfaces internal jargon ("Operator", state IDs) before user has any proof.
- M2. Temporal cards show precise probabilities without an evidence explanation toggle.
- M3. GameForge produces shaky target concepts from pasted notes (needs guardrail + "needs review" flag, not a rewrite).
- M4. Too many top-level destinations in MobileBottomNav "More" before activation.
- M5. Landing → Proof Week → Dashboard → Proof has competing CTAs ("Start Today", "Start Proof Week", "Submit Proof").

## 4. Files / components likely involved

Mobile shell + overflow
- `src/components/eblocki/AppShell.tsx`
- `src/components/eblocki/MobileBottomNav.tsx`
- `src/index.css` (safe-area utilities already exist; verify on Landing)
- `src/pages/Landing.tsx`

Dashboard density
- `src/pages/Dashboard.tsx`
- `src/components/eblocki/DashboardForecastTabs.tsx`
- `src/components/eblocki/TemporalCommandCard.tsx`
- `src/components/eblocki/TemporalIntelligencePanel.tsx`
- `src/components/eblocki/TemporalMap.tsx`
- `src/components/eblocki/IdentityLedger.tsx`
- `src/lib/eblocki/mobile-disclosure.ts` (already has helpers — reuse)

Coach correctness + rendering
- `src/pages/Coach.tsx`
- `src/lib/eblocki/coach-router.ts`
- `src/lib/eblocki/coach-response.ts`
- `src/lib/eblocki/coach-engine.ts`

Operator clarity
- `src/pages/Operator.tsx`

Mistake Clinic empty state
- `src/components/gameforge/GameForgeShell.tsx` (and any "mistakes" panel referenced)
- `src/lib/gameforge/mistakes.ts`

## 5. Recommended fix order (3 phases)

Phase 1 — Containment & trust (blockers only, ~1 build pass)
1. B1 safe-area on Landing + mobile header.
2. B2 wrap Temporal panels in mobile-collapse + `min-w-0` / overflow rails on Dashboard.
3. B6 IdentityLedger row: always show verdict + standard, allow expand for full evidence.
4. B5 Mistake Clinic: render empty state when open count = 0 (no "resolved" leakage).
5. B3 Coach: pass selected mode through to `coach-router` domain classification; fall back to `auto` only when user picks Auto.
6. B4 Coach: when response is markdown text, render via the existing structured renderer (split headings → cards) instead of raw `<pre>`/`whitespace-pre-wrap`.

Phase 2 — Simplification (after Phase 1 verified)
- M1 Operator: rename visible labels, hide page entry until user has ≥1 artifact.
- M4 Trim MobileBottomNav "More" to Settings + Sign out + a single "Advanced" group.
- M5 Single primary CTA per surface (Landing → "Start Proof Week"; Dashboard zero-state → "Submit Proof").
- M2 Add a one-line evidence caption under Temporal probability ("based on N artifacts over D days").

Phase 3 — GameForge guardrail (smallest safe)
- M3 Mark generated concepts as `needs_review` when source text confidence is low; show "Review concepts" step before play. No engine rewrite.

## 6. What should be hidden / collapsed on mobile

Wrap these in the existing `MobileCollapse` (desktop unchanged):
- Dashboard: TemporalCommandCard details, DashboardForecastTabs, TemporalIntelligencePanel, TemporalModelAuditPanel, ProductMatchPanel, InterestSignalCard, full IdentityLedger history (keep latest 2).
- Operator page: hide entire route from primary nav until `allArtifacts.length ≥ 1`.
- Proof page (normal mode unchanged): no change in Phase 1.

Above-the-fold mobile contract:
- One eyebrow ("Today")
- One command (Next Command line)
- One status (Latest verdict OR "Submit Proof" CTA)

## 7. Copy to simplify

- Landing hero: keep current student-readable copy; only fix CTA position.
- Coach mode chips: already human ("Law", "Psychology") — keep.
- Temporal panels: replace "Temporal loop / Sentinel" surface text with "Risk forecast" + "based on your last N proofs".
- Operator: "Operator" → "Patterns" in visible labels only (internal IDs untouched).
- Identity Ledger row: "Verdict: X/10 · Standard: <label>" before the evidence excerpt.

No engine renames. No schema changes.

## 8. Logic that needs tests / verification

New / updated unit tests:
- `coach-router`: selected mode overrides auto-classification (B3).
- `coach-response`: markdown-with-headings input produces structured sections (B4).
- `mistakes`: open=0 returns empty state, never "resolved-only" list (B5).
- `mobile-disclosure`: add a test for IdentityLedger truncation contract (B6).

Manual verification (must actually run, not claim):
- Playwright at 375 / 390 / 414 px on Landing, Dashboard, Proof, Coach, ProofWeek — assert `document.documentElement.scrollWidth === clientWidth`.
- Coach: select Law → ask one Law question → assert response domain = Law and renders cards, not raw markdown.
- Mistake Clinic with 0 mistakes → empty state visible.
- `npx vitest run`, `npm run build`, `npm run lint:eblocki`.

## 9. Build-mode prompt for Phase 1 only

> MODE: Build mode. Scope: Phase 1 Mobile Beta Containment & Trust. Do not touch Supabase schema. Do not add new engines, Cortex, Stripe, or new routes.
>
> Make the following six fixes and nothing else:
>
> 1. Landing + AppShell mobile header: apply existing `safe-top` / `safe-x` utilities so the hero CTA and brand bar clear the status bar at 375/390/414 px. Files: `src/pages/Landing.tsx`, `src/components/eblocki/AppShell.tsx`, `src/index.css` only if a utility is missing.
> 2. Dashboard mobile overflow: wrap `DashboardForecastTabs`, `TemporalCommandCard`, `TemporalIntelligencePanel`, `TemporalModelAuditPanel`, `ProductMatchPanel`, `InterestSignalCard` in `MobileCollapse` (collapsed by default on `< md`). Ensure each card has `min-w-0` and the chart/table parent has `overflow-x-hidden`. File: `src/pages/Dashboard.tsx` and the named components only where a wrapper class is needed.
> 3. IdentityLedger row: render `Verdict: N/10 · Standard: <label>` above the evidence excerpt; collapse long evidence behind an in-row "Show full evidence" toggle. File: `src/components/eblocki/IdentityLedger.tsx`.
> 4. Mistake Clinic empty state: when open weak-point count is 0, render the empty state card and do not render resolved items. Files: the mistakes panel in `src/components/gameforge/GameForgeShell.tsx` and `src/lib/gameforge/mistakes.ts` selector only.
> 5. Coach domain trust: when the user selects a non-Auto mode chip, force `coach-router` to use that mode's domain instead of auto-classifying as `general`. Files: `src/pages/Coach.tsx`, `src/lib/eblocki/coach-router.ts`. Add unit test.
> 6. Coach output rendering: stop rendering markdown as raw text. Use `normaliseCoachResponse` output to render headings/bullets as the existing structured card sections. File: `src/lib/eblocki/coach-response.ts` (add a markdown-to-sections helper) + `src/pages/Coach.tsx` render path. Add unit test.
>
> Verification (must actually run, not claim):
> - `npx vitest run`
> - `npm run build`
> - `npm run lint:eblocki`
> - Playwright at 375 px on `/`, `/dashboard`, `/coach`, `/proof`, `/proof-week`: assert no horizontal scroll and take screenshots.
> - Manual Coach check: select "Law", submit one prompt, confirm response domain = Law and renders as cards.
>
> Final report must list: files changed, tests added, exact verification output, remaining mobile risks. Do not mark Phase 2/3 items as done.

## What this plan deliberately does not do

- No Supabase schema changes.
- No GameForge engine rewrite (Phase 3 only adds a `needs_review` flag).
- No new routes, no new top-level features, no Cortex, no Stripe.
- No removal of Temporal/Operator/Identity systems — only mobile collapse + label changes.
- No re-architecture of Proof.tsx (deferred).
