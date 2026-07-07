# Mobile Proof Closure Gate

**Last run:** 2026-07-06 (audit + fit pass)  
**Branch:** `grok/mobile-proof-audit-fit-20260706-0100`  
**Audit doc:** `docs/release/mobile-proof-fit-audit.md`  
**Final status:** **READY WITH MINOR RISKS**

---

## Product loop being tested

Open Eblocki → see today is not closed → submit one proof → get verdict → get next command → leave.

Primary mobile question: **What do I do now?**  
Primary mobile answer: **Submit one proof from today.**

**Doctrine enforced:** A day closes only when proof **counts**. Submitting weak or unscored proof does not close the day.

---

## Pass 1 — Proof closure (commit `83160ec`)

| Area | Change |
|------|--------|
| **Mobile dashboard** | `ProofClosureCard` first above the fold; single primary CTA |
| **Advanced containment** | Forecast, stats, Proof Week collapsed on mobile |
| **Plain language** | `user-facing-copy.ts` for verdict trichotomy |
| **Proof form** | First-use fields simplified; 44px tap targets |

---

## Pass 2 — Semantic integrity (this pass)

| Area | Change |
|------|--------|
| **Today status semantics** | `resolveTodayClosure()` — closed only when verdict is **Counted** (`strong`/`elite` or score ≥7). Weak/unscored → **Today still open**. Pending score → **Proof filed**. |
| **Today artifact** | Dashboard passes `todayArtifact` (same-day proof), not latest overall proof |
| **Closure CTAs** | Removed “Back to Today” on dashboard; uses **Improve proof** / **View proof** / **Back tomorrow** (text-only secondary removed when redundant) |
| **Proof page order** | Form → verdict payoff → Definitions/Stats collapsed below |
| **Mode → Domain** | Proof form primary label **Domain** / **Area**; linked contract moved to optional on mobile |
| **Enum cleanup** | `plainCourtVerdict`, `plainTierLabel`, `plainLedgerText` on Operator Progress Record, `CourtVerdictBadge`, completed artifacts, dashboard last verdict |
| **Coach** | Mobile subtitle simplified; GameForge moved below input / “after diagnosis” |
| **Modes** | Mobile copy **Areas**; card containment (`min-w-0`, stacked metrics, bottom padding) |
| **Operator** | Mobile-safe container; stacked stat grid |

---

## Pass 3 — Audit + remaining fit fixes

| Area | Change |
|------|--------|
| **Audit** | Full why/why-not/who/who-not for 12 issues in `mobile-proof-fit-audit.md` |
| **Coach mobile** | Focus chips collapsed; `internalPromptSummary` hidden on mobile; “Response style” not “Mode” |
| **More nav** | “Modes” → **Areas** in mobile More drawer |
| **GameForge** | Mobile-safe container + bottom padding above nav |

**Product target documented:** ambitious inconsistent proof-driven users — not casual habit trackers.

**Advanced systems not removed:** Operator, GameForge, forecast, temporal — behind More or disclosure by design.

---

## Today closure status mapping

| State | Eyebrow | Headline | Primary CTA |
|-------|---------|----------|-------------|
| No proof today | Today open | Today is not closed yet. | Submit proof |
| Proof filed, no verdict yet | Proof filed | You filed proof. Verdict pending. | View proof |
| Proof did not count / needs upgrade | Today still open | You filed proof, but it did not count yet. (or needs upgrade) | Improve proof |
| Proof counted | Today closed | Your proof counted today. | View proof |

---

## Machinery hidden on mobile (not deleted)

Unchanged from pass 1 — all advanced systems remain behind disclosure or desktop layout.

---

## Plain-language mappings

| Internal | User-facing |
|----------|-------------|
| `accepted_strong` | Strong proof |
| `accepted_useful` | Useful proof |
| `elite_evidence` / `elite` | Elite proof |
| `tier 1` | Basic evidence |
| `tier 3` | High-quality evidence |
| identity escalation | standard raised |
| Mode (proof form) | Domain / Area |

Verdict trichotomy: **Counted** / **Needs upgrade** / **Did not count yet**.

---

## Viewport checks

| Viewport | Dashboard | Proof | Coach | Operator | Modes | Method |
|----------|-----------|-------|-------|----------|-------|--------|
| 320px | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | No browser harness |
| 375px | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | No browser harness |
| 390px | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | No browser harness |
| 414px | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | No browser harness |

**Code-level containment:** `mobile-safe-page`, `min-w-0`, `max-w-full`, `break-words`, `pb-[calc(96px+env(safe-area-inset-bottom))]` on Modes/Operator, `AppShell` `pb-24` on main.

**Honest assessment:** Visual viewport QA was **not** performed.

---

## First-proof friction assessment

| Factor | Status |
|--------|--------|
| Form before meta (Definitions/Stats) | Fixed — form first, meta collapsed below |
| Semantic “today closed” | Fixed — weak proof no longer closes day |
| Raw enums in Progress Record | Fixed — plain court/tier mapping |
| Mode jargon in form | Fixed — Domain on primary path |

---

## Build / test / lint results

| Command | Result | Notes |
|---------|--------|-------|
| `npm run build` | **PASS** | ~4s |
| `npm run test -- --run` | **PASS** | **271/271** tests (includes closure semantics + audit pass) |
| `npm run lint` | **FAIL** | 69 pre-existing repo-wide issues |
| `npm run lint:eblocki` | **PASS** | |

---

## Known risks

1. **No manual viewport QA** on device widths.
2. **`Needs upgrade` still leaves day open** — intentional; user must improve proof or submit stronger output.
3. **Repo-wide lint still fails** — pre-existing.
4. **Live auth / production** — not exercised.

---

## Files touched (both passes)

**Created:**
- `src/components/eblocki/ProofClosureCard.tsx`
- `src/lib/eblocki/user-facing-copy.ts`
- `src/lib/eblocki/__tests__/user-facing-copy.test.ts`
- `docs/release/mobile-proof-closure-gate.md`

**Modified:**
- `src/pages/Dashboard.tsx`
- `src/pages/Proof.tsx`
- `src/pages/Coach.tsx`
- `src/pages/Modes.tsx`
- `src/pages/Operator.tsx`
- `src/components/eblocki/IdentityLedger.tsx`
- `src/components/eblocki/CourtVerdictBadge.tsx`