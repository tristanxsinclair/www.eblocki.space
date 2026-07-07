# Mobile Proof Fit Audit

**Date:** 2026-07-06  
**Branch:** `grok/mobile-proof-audit-fit-20260706-0100`  
**Prior work:** PR #37 merged (`83160ec` closure + `fef997c` semantics)

This audit uses the required frame for each issue before changing code.

---

## Product target (who Eblocki is for)

**For:** Ambitious but inconsistent students/builders; users who avoid but want standards; multi-domain proof-driven users who need the next concrete action.

**Not for:** Casual habit trackers; users who want soft motivation only; users who hate accountability; therapy/medical needs; users who cannot tolerate artifact-level feedback.

Beta should optimize for the first group, not everyone.

---

## Issue 1: TODAY CLOSED while verdict says Did not count yet

**Mistake:** Dashboard showed “Today closed” when latest verdict was weak/unscored.

**Why wrong:** Violates core doctrine — a day closes only when proof **counts**. Submission ≠ closure. Rewards filing over judged proof.

**Why not wrong:** If “closed” meant “submission filed,” wording could be internally consistent — but that would make Eblocki a journaling app, not a proof standard system.

**Who it helps:** Users wanting psychological closure after any upload.

**Who it hurts:** Serious users; anyone trusting Eblocki’s honesty; the product’s differentiation.

**Decision:** **Change now** — implemented in `fef997c` via `resolveTodayClosure()` + `todayArtifact`. Weak/pending → **Today still open** / **Proof filed**. Closed only when `plainVerdictLabel` = Counted.

---

## Issue 2: “Back to Today” on Dashboard

**Mistake:** Secondary CTA “Back to Today” while already on Dashboard.

**Why wrong:** Creates a mental loop; adds no decision value.

**Why not wrong:** Could reset scroll/state if wired that way (it was not).

**Who it helps:** Users deep in scroll (if it scrolled — it did not).

**Who it hurts:** Users parsing next action on first screen.

**Decision:** **Change now** — removed from `ProofClosureCard` in `fef997c`. Replaced with **View proof** / **Improve proof**. Note: “Back to Today” remains on **Proof page** verdict card — correct there.

---

## Issue 3: Proof page puts Definitions/Stats before form

**Mistake:** Meta panels appeared above submit form on first visit.

**Why wrong:** Delays action; mobile users must scroll past machinery to submit.

**Why not wrong:** Standards-first users may want definitions before typing.

**Who it helps:** Careful, standards-first users.

**Who it hurts:** Avoidant users; mobile first-use; beta proof loop.

**Decision:** **Change now** — implemented in `fef997c`: order is heading → what counts → **form** → verdict → Definitions/Stats collapsed below.

---

## Issue 4: “Mode” as first-use language

**Mistake:** Proof form and coach exposed “Mode” as primary label.

**Why wrong:** Mode is internal routing architecture; users think in areas/domains.

**Why not wrong:** Returning power users and Tristan know modes and value precision.

**Who it helps:** Power users, founder, multi-mode operators.

**Who it hurts:** New beta users on first proof/coach pass.

**Decision:** **Change now** (partial) — Proof form uses **Domain** on mobile/desktop primary path (`fef997c`). **Remaining:** Coach “Mode chips” and result signal “Mode” still visible — **fix in this pass** (collapse/rename on mobile). Schema unchanged.

---

## Issue 5: Raw enum leakage (accepted_strong, tier 1, etc.)

**Mistake:** Internal court/ledger tokens shown in primary UI.

**Why wrong:** Feels like database debug state; erodes trust and polish.

**Why not wrong:** Power users and Engine Debug may want exact tokens.

**Who it helps:** Founder/debug users.

**Who it hurts:** Normal beta users on dashboard, operator ledger, proof results.

**Decision:** **Change now** for primary surfaces — `plainCourtVerdict`, `plainTierLabel`, `plainLedgerText`, `plainEvidenceStrength` in `fef997c`. **Leave alone** inside collapsed advanced panels (forecast tabs, temporal intelligence) and engine internals — **hide behind advanced**, not deleted.

---

## Issue 6: Coach explanation too system-heavy

**Mistake:** Long diagnosis-engine explanation above input.

**Why wrong:** User wants to paste problem → get proof action, not learn machinery.

**Why not wrong:** Analytical users may trust the system more with mechanism visible.

**Who it helps:** Highly analytical users.

**Who it hurts:** Messy-problem users needing fast help.

**Decision:** **Change now** (partial) — mobile subtitle simplified in `fef997c`. **Remaining:** `internalPromptSummary` in results card — **hide on mobile in this pass**. Desktop keeps full detail.

---

## Issue 7: GameForge before diagnosis

**Mistake:** GameForge CTA in coach header before user submits problem.

**Why wrong:** Routes to practice before diagnosis determines if practice is correct.

**Why not wrong:** Users arriving via `/gameforge` want practice first.

**Who it helps:** Practice-first intent.

**Who it hurts:** Coach-first users with unsolved problems.

**Decision:** **Change now** — header GameForge hidden on mobile (`fef997c`); secondary link below “Start here” as “GameForge (after diagnosis)”.

---

## Issue 8: Operator / XP page

**Mistake:** Progression/XP could feel gamified vs real-world proof.

**Why wrong:** Risk of identity/status over evidence.

**Why not wrong:** Progression motivates repeat use for competitive users.

**Who it helps:** High-agency competitive users.

**Who it hurts:** Overwhelmed or shame-prone users if surfaced first.

**Decision:** **Leave alone** — keep behind **More** menu; not on first Dashboard. Mobile containment padding added in `fef997c`.

---

## Issue 9: Modes page abstract / founder-shaped

**Mistake:** “Mode Operating System” and mode IDs feel internal.

**Why wrong:** First-time users don’t know why modes matter.

**Why not wrong:** Modes are real routing architecture; valuable after onboarding.

**Who it helps:** Multi-domain serious users.

**Who it hurts:** First-time beta users.

**Decision:** **Change now** (copy only) — mobile header uses **Areas** in `fef997c`. Desktop keeps full mode language. **More menu** label updated to **Areas** in this pass.

---

## Issue 10: Mobile containment (scroll, clip, bottom nav)

**Mistake:** Clipped cards, horizontal scroll, bottom nav covering CTAs (reported in screenshots).

**Why wrong:** Broken mobile feel blocks the proof loop.

**Why not wrong:** Some artifacts may be emulator/frame-specific.

**Who it helps:** No one if real.

**Who it hurts:** Every mobile user.

**Decision:** **Change now** where code-observable — `AppShell` `pb-24`, `mobile-safe-*`, Modes/Operator padding in `fef997c`. **GameForge shell** padding added this pass. **Needs user test** for viewport confirmation — not claimed as visually verified.

---

## Issue 11: Harsh proof language

**Mistake:** Verdict copy may feel judgment-heavy.

**Why wrong:** Can trigger avoidance in low-confidence users.

**Why not wrong:** Doctrine is the product; softening kills differentiation.

**Who it helps:** Ambitious users who want standards.

**Who it hurts:** Low-confidence users if framed as personal attack.

**Decision:** **Leave alone** — judge artifacts, not people. Copy already frames “did not count yet” as proof quality, not user worth. **Needs user test** for tone with beta cohort.

---

## Issue 12: Eblocki too Tristan-shaped

**Mistake:** Law/sales/build/operator language may not generalize.

**Why wrong:** Beta pool wider than founder profile may bounce.

**Why not wrong:** Strong products often start from one lived problem.

**Who it helps:** Users like Tristan: ambitious, multi-domain, proof-driven.

**Who it hurts:** Casual productivity users.

**Decision:** **Leave alone** for beta — target ambitious inconsistent users, not everyone. Do not genericize yet.

---

## Summary of decisions

| Issue | Decision | Status |
|-------|----------|--------|
| 1 Today closed semantics | Change now | Done `fef997c` |
| 2 Back to Today on Dashboard | Change now | Done `fef997c` |
| 3 Proof form ordering | Change now | Done `fef997c` |
| 4 Mode language | Change now | Proof done; Coach partial → this pass |
| 5 Raw enums | Change now primary | Done `fef997c`; advanced panels deferred |
| 6 Coach machinery | Change now mobile | Partial → this pass |
| 7 GameForge hierarchy | Change now | Done `fef997c` |
| 8 Operator | Leave behind More | Done |
| 9 Modes copy | Change now mobile | Partial → More label this pass |
| 10 Containment | Change now + user test | Code fixes; viewport NOT RUN |
| 11 Harsh language | Leave doctrine | No change |
| 12 Tristan-shaped | Leave for beta target | No change |

---

## Verification note

Viewport testing was **not completed** in this environment. Build/test pass only.