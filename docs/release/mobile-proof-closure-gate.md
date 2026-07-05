# Mobile Proof Closure Gate

**Last run:** 2026-07-06  
**Branch:** `grok/mobile-proof-closure-20260706-0037`  
**Final status:** **READY WITH MINOR RISKS**

---

## Product loop being tested

Open Eblocki → see today is not closed → submit one proof → get verdict → get next command → leave.

Primary mobile question: **What do I do now?**  
Primary mobile answer: **Submit one proof from today.**

---

## What was changed

| Area | Change |
|------|--------|
| **Mobile dashboard** | New `ProofClosureCard` is the first above-the-fold surface on `< md`. Single primary CTA (Submit proof). Open/closed today state with plain verdict + next command when proof exists. |
| **Dashboard header** | Competing header CTAs hidden on mobile (Submit proof / Coach / Plan / Modes). |
| **Modes setup** | On mobile, collapsed behind `MobileCollapse` below closure card — no longer competes with primary CTA. |
| **Proof Week** | Collapsed on mobile behind disclosure toggle. |
| **Advanced dashboard** | `EvidenceCommandPanel`, `DashboardForecastTabs` (forecast, evidence, audit), identity ledger, momentum, temporal panels — collapsed on mobile under “Forecast, stats, diagnostics”. Desktop unchanged. |
| **Proof form (first-use)** | Domain + proof type visible on first proof; title → “What did you produce?”; optional fields behind existing disclosures; 44px submit tap target. |
| **Proof payoff** | Verdict card uses plain labels on mobile (`Counted` / `Needs upgrade` / `Did not count yet`); full court mechanics behind “Full verdict details”; `id="feedback"` anchor for Proof Week link. |
| **Plain language** | New `user-facing-copy.ts` maps internal tokens (`accepted_strong`, `elite_evidence`, etc.) for primary surfaces. |
| **Forecast on Proof** | Temporal proof brief collapsed on mobile via `MobileCollapse`; always visible on desktop. |

---

## Machinery hidden on mobile (not deleted)

Collapsed or moved below fold on `< md`:

- CommandHero (desktop only)
- Dashboard header action row (Coach, Plan, Modes)
- Zero-state “Start here” card (desktop only; mobile uses closure card)
- Modes-not-set-up banner (collapsed disclosure)
- Proof Week panel
- Recent proof list + week stats (`EvidenceCommandPanel`)
- Forecast tabs: Temporal Command Card, Temporal Feedback, Intervention
- Identity ledger, momentum, weekly retro, quick check-in, setup metrics
- Temporal Intelligence + Model Audit panels
- Product match + interest signals
- Proof: contract vs artifact definitions, strength tally, pending contracts, completed artifact wall, advanced scoring fields, temporal brief (collapsed)
- Proof verdict: full court rows, identity escalation label → “Standard raised” in disclosure

**Still available:** All systems remain reachable via disclosure toggles or desktop layout. Intelligence and scoring logic unchanged.

---

## Plain-language mappings (primary mobile copy)

| Internal | User-facing |
|----------|-------------|
| `accepted_strong` | strong proof |
| `elite_evidence` | elite proof |
| identity escalation | standard raised |
| Court of Evidence | verdict |
| Temporal Engine | forecast |
| artifact | visible output (defined once in closure card) |

Verdict trichotomy: **Counted** / **Needs upgrade** / **Did not count yet**.

---

## Viewport checks

| Viewport | Dashboard | Proof | Method |
|----------|-----------|-------|--------|
| 320px | NOT RUN | NOT RUN | No browser/viewport harness in this pass |
| 375px | NOT RUN | NOT RUN | No browser/viewport harness in this pass |
| 390px | NOT RUN | NOT RUN | No browser/viewport harness in this pass |
| 414px | NOT RUN | NOT RUN | No browser/viewport harness in this pass |

**Code-level containment (inherited Phase 7.3):** `AppShell` `overflow-x-hidden`, `mobile-safe-card`, `min-w-0`, `break-words`, `min-h-[44px]` on primary CTAs, `MobileCollapse` for progressive disclosure, bottom safe-area patterns in existing shell.

**Honest assessment:** Visual viewport QA was **not** performed. Status reflects build/test pass + code inspection only.

---

## First-proof friction assessment

| Factor | Before | After |
|--------|--------|-------|
| Dashboard first screen | CommandHero + forecast tabs + stats competing | One closure card: status + definition + Submit proof |
| First proof fields | Mixed with advanced proof machinery | Domain, type, title, content, preview, submit |
| Post-submit | Raw strength badges / court jargon | Plain verdict + next command + back to Today |
| Time-to-understand | User studies system | User sees “today not closed” in ~5s (intended; not user-tested) |

Estimated friction reduction: meaningful for mobile first-use; **not validated with live users in this pass**.

---

## Build / test / lint results

| Command | Result | Notes |
|---------|--------|-------|
| `npm run build` | **PASS** | Vite production build OK (~5s). Bundle >500 kB warning (pre-existing). |
| `npm run test -- --run` | **PASS** | **267/267** tests, 35 files. Includes new `user-facing-copy.test.ts`. |
| `npm run lint` | **FAIL** | **69 problems** (56 errors, 13 warnings). Pre-existing repo-wide debt; not introduced by this pass. |
| `npm run lint:eblocki` | **PASS** | Eblocki-scoped surfaces clean. |

---

## Known risks

1. **No manual mobile viewport QA** — horizontal scroll, CTA clipping, and bottom-nav overlap not verified on device.
2. **Closure card uses `allArtifacts` for today check** — limited to fetched artifact set (5 recent + full set for temporal); edge case if proof exists but not in loaded window is unlikely for same-day submit.
3. **`npm run lint` repo-wide still fails** — CI may flag if full lint is required (historically `lint:eblocki` is the gate).
4. **Desktop dashboard unchanged in spirit** — CommandHero and full forecast remain; beta focus is mobile first-use.
5. **Live auth / Supabase / production** — not exercised in this pass.

---

## Files touched

**Created:**
- `src/components/eblocki/ProofClosureCard.tsx`
- `src/lib/eblocki/user-facing-copy.ts`
- `src/lib/eblocki/__tests__/user-facing-copy.test.ts`
- `docs/release/mobile-proof-closure-gate.md`

**Modified:**
- `src/pages/Dashboard.tsx`
- `src/pages/Proof.tsx`

**Not committed:** `terminals/`, `mcps/`, accidental `supabase/functions/mcp/index.ts` (restored).