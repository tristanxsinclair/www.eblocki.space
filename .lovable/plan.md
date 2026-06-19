# Eblocki Premium Operating System — Transformation Plan

## 1. BLUF

**Verdict: Premium foundation present, needs polish.**

Eblocki already has the rare ingredients of a behavioural evidence OS: a proof artifact pipeline, Court of Evidence verdicts, identity ledger, temporal/Sentinel forecasting, GameForge, coach router, mode catalogue, and a 174-test green core. The blocker to "premium beta" is not missing systems — it is **surface clarity**: Dashboard (621 LoC) and Proof (1317 LoC) carry too many panels above the fold, the first-time user does not get a single unambiguous next move, mobile information density is still too high in places, and the language varies between "operator console" and "founder-internal jargon".

- **Biggest current bottleneck:** Dashboard + Proof information hierarchy and mobile density. The intelligence is there; the prioritisation is not.
- **Highest-leverage next move:** A *Command-First Dashboard* pass — collapse all advanced diagnostics behind progressive disclosure, leaving exactly one Command, one Proof CTA, one Risk line, one Verdict-of-last-proof card above the fold on mobile.
- **Do not build yet:** Cortex, Stripe, leagues, social, schema redesign, new AI agents, full visual redesign, new onboarding complexity, app-store push, founder/admin dashboards.

## 2. Repo-grounded current product read

Confirmed from inspection:

- **Routes** (`src/App.tsx`): public `/`, `/auth`, `/reset-password`, `/install`, `/why`, `/legal/*`; protected `/onboarding`, `/welcome`, `/dashboard`, `/operator`, `/gameforge`, `/coach`, `/sheet`, `/start`, `/start-today`, `/proof`, `/proof-week`, `/modes`, `/modes/:modeId`, `/settings`, `/dev/engine`, `/dev/beta`. Two dev routes are still wired into `<Protected>` — should be admin-gated or hidden in production.
- **Pages by size** (signal of complexity): Proof 1317, Onboarding 801, Dashboard 621, Coach 526, StartToday 316. Proof and Onboarding are the two heaviest surfaces.
- **Composites present**: `CourtVerdictBadge`, `IdentityLedger`, `InterventionCard`, `LevelRing`/`LevelUpListener`/`LevelUpOverlay`, `MomentumPanel`/`MomentumRing`, `ProofCapture`, `ProofContractCard`, `ProofStandardPreviewPanel`, `ProofWeekPanel`, `TemporalCommandCard`, `TemporalFeedbackPanel`, `TemporalIntelligencePanel`, `TemporalMap`, `TemporalModelAuditPanel`, `WeeklyRetro`, `MobileCollapse`, `InfoTip`, `BetaFeedback`, `NotificationPreferences`, `PasswordSecurity`. Very rich; risk is duplication of "what to do next" surfaces.
- **Engine** (`src/lib/eblocki/`): `states.ts`, `proof-scoring.ts`, `proof-standard-preview.ts`, `proof-contract-alignment.ts`, `domain-standards.ts`, `dashboard-view-model.ts`, `coach-router.ts`, `coach-engine.ts`, `level-engine.ts`, `momentum.ts`, `temporal-*` (engine, calibration, audit, snapshot, intelligence-score, coach-context, calibration-history), `intervention-memory.ts`, `mode-*`, `integrity-rules.ts`, `qa-checks.ts`, `interest-signals.ts`, `product-matching.ts`, `next-upgrade-extract.ts`, `first-proof.ts`, `reflection-insights.ts`. This is the genuine moat.
- **Edge functions**: `coach`, `delete-account`, `export-data`, `notify-momentum`, `ocr-extract`, `process-email-queue`, `send-push`. All present; auth checks landed in earlier remediation pass.
- **AppShell** (65 LoC): horizontal scroll nav on mobile across 7 destinations. Functional but flat; on small screens "Operator/GameForge/Settings" easily fall off-screen. Mobile-first IA candidate.
- **Distinctive systems already built**: Court of Evidence verdict, Identity Ledger, Temporal/Sentinel forecast + audit, Operating Profile via Onboarding, Domain Standards registry, Proof Standard Preview, Proof Contract alignment, Level/Momentum engine, GameForge, mode catalogue with detail pages.
- **Likely duplicated "next action" surfaces** (needs UX rationalisation, not deletion): `TemporalCommandCard`, `InterventionCard`, `MissionCard`, `ProofContractCard`, dashboard CommandHero. The engine outputs are different; the user-facing presentation overlaps.
- **Underused / hidden**: `WeeklyRetro` (no clear weekly route), `IdentityLedger` (presentation may be too technical), `TemporalModelAuditPanel` (powerful but advanced — belongs collapsed).
- **Not verified this pass**: live browser at 375/768/1440, build, lint, tests, Supabase schema, security scan. Assume prior status from gate doc (174/174 tests, build pass, repo-wide lint debt outside Phase 7 surfaces).

## 3. "Premium as fuck" — product definition

For Eblocki, premium = **Fast, Clear, Sharp, Smooth, Trustworthy, Personal, Operational, Disciplined, Universal, Cleanly addictive.** Premium is not decoration; it is the absence of friction between "open app" and "submit one real artifact."

## 4. North Star UX spec

| Persona state | Mental state | Screen goal | Dominant element | Primary CTA | Hidden | Success state |
|---|---|---|---|---|---|---|
| First-time visitor `/` | Skeptical | Explain the loop in 8s | Headline + one-line proof | "Start your first proof" | Pricing, advanced panels | Reaches `/auth` |
| New beta user post-auth | Curious, unsure | Single command for first proof | First-proof contract card | "Submit first artifact" | Temporal map, Court, Sentinel | Proof inserted |
| Returning, no proof today | Slightly avoidant | One command | CommandHero | "Submit today's proof" | Diagnostics | Insert + verdict |
| Just submitted | Wants validation | Verdict + next upgrade | Verdict card | "Back to dashboard" or "Raise the standard" | Forecast | Returns to dashboard, sees state change |
| Avoidant state | Resistant | Smallest-credible move | Intervention card with minimum proof | "Log minimum proof" | Long-range forecast | Minimum artifact accepted |
| Overloaded | Drowning | One cut | Intervention "drop, don't add" | "Cut one commitment" | XP, ledger | Cut artifact logged |
| Low energy | Depleted | Recovery proof | Recovery card | "Log recovery proof" | Streak risk | Recovery artifact accepted |
| Momentum | Confident | Standard escalation | Next-upgrade card | "Submit at higher standard" | Recovery copy | Higher-tier proof |
| Weekly review | Reflective | Pattern in one sentence | WeeklyRetro | "Set next week's standard" | Daily noise | Standard chosen |

## 5. Information architecture plan

Keep current routes. Rationalise purpose:

- `/` Landing — promise + first-proof primer. Above fold: one-sentence promise, one example artifact, one CTA.
- `/auth` — unchanged.
- `/onboarding` — operating profile capture; collapse to ≤5 questions visible at a time. Output: domain, current standard, top risk pattern.
- `/welcome` — bridge to first proof; should auto-redirect after first proof submitted.
- `/dashboard` — **Command Centre**. Zones in order: Command → Proof status → Risk → Latest verdict → collapsed Forecast → collapsed Evidence/Ledger → collapsed Audit.
- `/proof` — Submit-only surface. Top: what to submit + standard preview. Form. Submit. Verdict in-place. No analytics charts here.
- `/proof-week` — 7-day momentum loop with today's command.
- `/start-today` / `/start` — alias for new users; same as Command + Proof CTA, no diagnostics.
- `/coach` — diagnosis → plan → proof action only. No essays.
- `/operator` — identity/level/ledger surface; advanced.
- `/gameforge` — practice/transfer surface; advanced.
- `/modes`, `/modes/:modeId` — catalogue; entry point for universal expansion.
- `/sheet` — control sheet; settings-adjacent.
- `/settings` — account, notifications, password, export, delete.
- `/dev/engine`, `/dev/beta` — gate behind `useIsAdmin` (already exists). Not user-visible.

Add a `/weekly` route alias to `WeeklyRetro` (component exists, route does not). Verify before building.

## 6. Premium UI / design system plan

Tailwind + shadcn stay. Tokens are already HSL in `src/index.css`. Plan:

- **Layout**: single max-w container per page (`max-w-3xl` mobile-first content, `max-w-6xl` dashboard). Consistent vertical rhythm (`space-y-6` between zones).
- **Typography rhythm**: H1 page title once (28–32 px), H2 zone label (16 px uppercase tracking-wider mono), body 14 px, helper 12 px. Reserve mono for labels/badges only.
- **Cards**: 4 archetypes — Command, Proof, Verdict, Diagnostic. Each has a fixed slot pattern (label, headline, body, single CTA). No card invents its own layout.
- **CTAs**: one primary per card, secondary as ghost, destructive only for delete/cut. Disabled states show reason inline.
- **Hierarchy rule**: Command → Proof → Risk → Verdict → Diagnostics → History. Enforced top-to-bottom on every authenticated surface.
- **Motion**: button press, panel collapse, skeleton fade, verdict slide-in. No confetti, no level-up fireworks beyond existing `LevelUpOverlay`.
- **Restraint list (forbid)**: neon gradients, multi-colour metric grids above fold, decorative icons without semantic role, two-column dense panels on mobile.

## 7. Mobile-first transformation plan

Current `AppShell` is a horizontal-scroll nav across 7 items — works but premium-poor. Plan:

- **Nav**: keep horizontal scroll for desktop sidebar parity; on mobile (<768 px) collapse to bottom-tab style with 4 primaries (Dashboard, Proof, Coach, Operator) and a "More" drawer for GameForge/Modes/Settings/StartToday. Verify safe-area on iOS.
- **Dashboard mobile order**: Command → Proof Week today → Submit Proof CTA → Risk line → Latest verdict → collapsed Forecast (TemporalMap/IntelligencePanel/Calibration/Audit behind tabs already — keep) → collapsed Identity/Ledger → History.
- **Proof page mobile order**: What counts → Standard preview → Form → Submit → Verdict in-place → "Back to dashboard". Move advanced fields (transfer value, self-deception, attachments) into a single "Add detail" disclosure.
- **Verdict mobile order**: Verdict → Why → Missing evidence → Next upgrade → Two buttons (Submit another / Dashboard).
- **Responsive rules**: `min-w-0` on every flex/grid child; `break-words` on user strings; `line-clamp-2` on proof titles in feeds; chart containers `w-full overflow-hidden`; tap targets ≥44 px (AppShell already enforces).
- **Verification plan**: Playwright at 375 × 1800, 390 × 1800, 768 × 1024, 1440 × 900 against `/`, `/dashboard`, `/proof`, `/coach`, `/operator`, `/settings`. Capture screenshots, scroll-width check.

## 8. Smoothness / performance / reliability plan

- **Loading**: skeletons (not spinners) on Dashboard zones, Proof history, Coach replies. Use TanStack Query suspense boundaries per zone so one slow query does not blank the page.
- **Errors**: every Supabase mutation surfaces a toast with the actual error message; preserve unsent form text on failure (Proof form especially).
- **Empty states**: every zone needs a designed empty card — no blank divs. `dashboard-view-model` already handles this branch; audit components consume it.
- **Form discipline**: disable Submit during insert, re-enable on settle, never paint verdict until row id returns.
- **Perceived speed**: route-level code splitting on Operator, GameForge, EngineDebug, BetaAdmin, Sheet (bundle is >500 kB per release gate; these are the cheapest splits).
- **Resilience**: keep `dashboard-view-model.ts` as the only place legacy/null/queryFailed normalisation happens.

## 9. Proof loop excellence plan

Step → surface → user action → success state → failure state:

1. **Command** — Dashboard CommandHero → tap "Submit today's proof" → routes to `/proof` with prefilled domain → fallback if no profile yet.
2. **Standard** — `ProofStandardPreviewPanel` at top of `/proof` → user reads what counts → standard derived from `domain-standards.ts` + selected mode.
3. **Artifact** — `ProofCapture` form → submit → row inserted in `proof_artifacts` → trigger `cle_after_proof_insert` writes verdict/XP/ledger.
4. **Verdict** — `CourtVerdictBadge` renders in-place using verdict from `court_verdicts` → never client-fabricated.
5. **Upgrade** — `next-upgrade-extract.ts` → "raise the standard" CTA.
6. **Memory** — `identity_ledger` row appears in Operator/Dashboard collapsed zone.
7. **Next command** — back to dashboard, CommandHero recomputes from new state.

Every step must have copy answering: *what / why it counts / did it work / what next.*

## 10. Sentinel / Court / Identity presentation plan

Translate engine to human:

- **Court of Evidence** → label "Did this proof actually count?" Show verdict + one-line why. Hide tier math behind disclosure.
- **Adversarial Review** → "Where could you still be hiding?" One sentence. Optional dismiss.
- **Identity Ledger** → "Evidence raising your standard." Show last 3 entries; full list behind "See all evidence."
- **Sentinel/Temporal** → "What is likely to go wrong next." One risk + one prevention. `TemporalModelAuditPanel` collapsed by default, opens on tap.
- **Weekly Review** → "Pattern this week." One sentence + one standard change for next week.
- **Operating Profile** → "How Eblocki adapts to you." Read-only summary in Settings; edit returns to `/onboarding` short-form.

First-user version: hide Sentinel/Court/Adversarial until ≥3 proof artifacts exist. Advanced-user version: all visible, all collapsible.

## 11. Universal operating system plan

Already supported by `modes.ts` + `mode-templates.ts` + `domain-standards.ts`. Staged:

- **Beta (now)**: Student / general self-improvement. Existing copy works.
- **H3 expansion**: Founder, Sales, Athlete. New entries in `domain-standards.ts` + `mode-templates.ts`; no schema change.
- **H4 expansion**: Creator, Language learner, Worker, Health/recovery. Same pattern.

Per-mode definition: pain → 3 proof examples → first command → dashboard emphasis → proof standard → risk patterns → next-upgrade examples → copy overrides.

## 12. Retention / hooking plan (ethical)

Layered loops, all already partly built:

- **Daily**: CommandHero + Proof CTA + verdict payoff.
- **Weekly**: ProofWeekPanel + WeeklyRetro.
- **Streak**: `momentum.ts` — recovery messaging, not punishment.
- **Standard escalation**: `next-upgrade-extract.ts` surfaced as primary CTA after verdict.
- **Identity memory**: Ledger weekly recap.
- **Risk prevention**: Sentinel "you avoided X this week."
- **Personal best**: surface proof-quality high-water-mark per domain (new, cheap).

Forbid: leaderboards, social compare, push spam, dopamine bait.

## 13. Copy and language transformation plan

Tone: direct, calm, evidence-based. Approved core lines: *No artifact, no claim. Submit one measurable proof. Your next command. What counts as proof? Verdict. Next upgrade. Risk if ignored. Weak day is not a broken day. Planning is allowed. Hiding inside planning is not.*

Per-screen copy spec (headline / sub / CTA / empty / error / success) to be authored in H1/H2 builds, screen-by-screen, starting Dashboard → Proof → Verdict → Coach → ProofWeek → WeeklyRetro → Sentinel → Court → Landing → Onboarding.

## 14. Accessibility / readability plan

- Single H1 per page; semantic `<section>` per zone with `aria-labelledby`.
- Body 14 px min on mobile; helper text 12 px min and never the sole carrier of meaning.
- Visible focus rings (Tailwind `focus-visible:ring-2`).
- Form labels explicit, not placeholder-only.
- Errors carry both colour and icon + text.
- No essential information in colour alone (verdict tier needs label too).
- Keyboard nav on Dashboard zones (tab into each card).
- Manual axe-style audit needed; not auto-run yet.

## 15. Analytics / learning plan

Use existing `EVENTS` taxonomy (`src/lib/analytics/events.ts`). Add (do not build now): `proof_standard_viewed`, `dashboard_returned_after_proof`, `proof_week_day_completed`, `sentinel_command_viewed`, `next_upgrade_clicked`, `mobile_overflow_detected`, `user_confused_feedback`. Privacy: no proof body text, no PII, hashed user id only.

## 16. Trust / safety / claims plan

- Landing footer + Settings: "Eblocki tracks proof and guides action. It does not guarantee outcomes and is not therapy, medical, legal, or academic advice."
- Coach footer: "Guidance, not diagnosis."
- Verdict card: "Verdict is generated by deterministic rules over your submitted evidence."
- Security: keep wording "no active tool-reported findings remain after the latest remediation pass."
- Billing copy: keep Pro/Founder as intent signals only; no checkout copy yet.

## 17. Competitor benchmarking (extract, do not copy)

| Source | Mechanic to adapt | How in Eblocki | Avoid |
|---|---|---|---|
| Duolingo | Streak + recovery without shame | `momentum.ts` already; add gentle recovery CTA | Mascot guilt |
| Whoop/Oura | Readiness language | Sentinel "today's risk" one-liner | Score obsession |
| Strava | Proof feed + PRs | Per-domain personal best card | Public social |
| Linear | Command restraint | Dashboard zone hierarchy | Feature creep |
| Chess.com | Rating + analysis | Level engine + Court verdict | Toxic ladders |
| GitHub contrib | Visible consistency | ProofWeek grid → 30-day grid later | Vanity green |
| Spotify Wrapped | Weekly identity recap | WeeklyRetro | Yearly only |
| Cursor | AI-native command | Coach diagnosis → proof action handoff | AI doing the work |

## 18. Gap analysis

| Area | Current | Ideal | Gap | Fastest fix | Deeper fix |
|---|---|---|---|---|---|
| First impression | Landing copy general | Loop visible in 8s | Medium | Rewrite hero + one example artifact | Add 30s explainer |
| Onboarding | 801 LoC, many steps | ≤5 visible questions | High | Collapse steps into wizard with 1 visible | Adaptive flow by domain |
| Dashboard hierarchy | Many panels | Command-first zones | **Critical** | Move Forecast/Audit/Ledger into collapsed/Tabs | View-model already supports |
| Proof page | 1317 LoC | Submit-only | High | Hide advanced fields behind disclosure | Split form components |
| Verdict | Present | One-screen flow | Low | Inline verdict + 2 CTAs | — |
| Mobile density | Mixed | Bottom-tab + single column | High | New `MobileNav` + zone collapse | Per-zone responsive audit |
| Visual polish | Functional dark | Restrained premium | Medium | Typography rhythm + card archetypes | Token sweep |
| Speed | OK; bundle >500 kB | Sub-200 kB initial | Medium | Route-split Operator/GameForge/Sheet/Dev | Vendor split |
| Empty/loading/error | Partial | Designed for every zone | Medium | Skeleton + empty card per zone | Suspense boundaries |
| Personalisation | Mode-aware | Per-domain commands | Medium | Wire `domain-standards` into CommandHero | Mode profile in Settings |
| Retention | Streak only | Daily + Weekly + Standard | Medium | Surface WeeklyRetro on dashboard Sunday | Personal-best card |
| Universal usability | Student-leaning | 4 modes live | Medium | Add Founder/Sales/Athlete templates | Mode-switcher UX |
| Beta readiness | Yes per gate | Premium beta | Medium | Command-first dashboard + mobile nav | Full polish pass |
| Trust copy | Partial | Everywhere | Low | Footer + coach + verdict lines | Settings privacy page |

## 19. Prioritised upgrade roadmap

| # | Upgrade | Target | Problem solved | Beta | OS | Retain | Mobile | Risk | Cost | Schema | QA | Horizon | Build now | Reason |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Command-First Dashboard | `Dashboard.tsx` | Information overload | Critical | High | High | Critical | Low | Low | No | Yes | H1 | **Yes** | Single biggest clarity win |
| 2 | Proof page slim | `Proof.tsx` + `ProofCapture` | 1317 LoC, dense | Critical | High | High | Critical | Low | Low | No | Yes | H1 | Yes (next) | Direct effect on first-proof time |
| 3 | Mobile bottom-tab nav | `AppShell.tsx` | Scrolling nav | High | Medium | Medium | Critical | Low | Low | No | Yes | H1 | Yes | Premium feel on phone |
| 4 | Verdict one-screen | `CourtVerdictBadge`, `Proof.tsx` | Verdict scattered | High | Medium | High | High | Low | Low | No | Yes | H1 | Yes | Closes loop |
| 5 | Onboarding wizard collapse | `Onboarding.tsx` | 801 LoC drop-off | High | High | Medium | High | Med | Low | No | Yes | H1 | Soon | Activation |
| 6 | Empty/loading/error sweep | All zones | Premium polish | Medium | Medium | Medium | High | Low | Low | No | Yes | H1 | Soon | Operational |
| 7 | Copy pass per screen | Pages | Voice consistency | High | High | Medium | Medium | Low | Low | No | No | H1 | Soon | Cheap, high impact |
| 8 | Route-split heavy pages | `App.tsx` | Bundle >500 kB | Medium | Medium | Low | Medium | Low | Low | No | Yes | H1 | Soon | Speed |
| 9 | Sentinel "one risk" surface | Dashboard | Forecast hidden | Medium | High | High | Medium | Med | Low | No | Yes | H2 | Later | After zone collapse lands |
| 10 | WeeklyRetro on Sunday | Dashboard + new route | No weekly hook | Medium | High | High | Medium | Med | Low | No | Yes | H2 | Later | Retention |
| 11 | Personal-best per domain | Dashboard | No PR memory | Low | High | High | Medium | Med | Med | Maybe | Yes | H2 | Later | Strava-style |
| 12 | Identity Ledger recap card | Dashboard | Ledger hidden | Medium | High | High | Medium | Low | Low | No | Yes | H2 | Later | Memory |
| 13 | Mode templates: Founder/Sales/Athlete | `domain-standards`, `mode-templates` | Student-only | Low | Critical | Medium | Low | Low | Low | No | No | H3 | Later | Universal |
| 14 | Per-mode command personalisation | CommandHero | Generic command | Medium | Critical | High | Medium | Med | Med | No | Yes | H3 | Later | Personal |
| 15 | Coach → Proof handoff | `Coach.tsx`, `/proof` | Coach is a dead-end | Medium | High | Medium | Medium | Low | Low | No | Yes | H2 | Later | Loop closure |
| 16 | Landing rewrite + example artifact | `Landing.tsx` | Unclear in 8s | High | Medium | Low | Medium | Low | Low | No | Yes | H2 | Later | Acquisition |
| 17 | Trust-copy sweep | Footer, Coach, Verdict, Settings | Claims hygiene | Medium | Medium | Low | Low | Low | Low | No | No | H2 | Later | Safety |
| 18 | Admin gate `/dev/*` | `App.tsx` + `useIsAdmin` | Dev routes user-visible | High | Low | Low | Low | Low | Low | No | Yes | H1 | Soon | Hygiene |
| 19 | TemporalAudit collapsed by default | `TemporalModelAuditPanel` | Too technical for new user | Medium | Low | Low | Medium | Low | Low | No | Yes | H1 | Soon | Hierarchy |
| 20 | Per-zone skeletons + Suspense | Dashboard, Proof | Blank flashes | Medium | Medium | Medium | High | Med | Low | No | Yes | H2 | Later | Perceived speed |

## 20. One-page Premium Product Spec — "Eblocki Premium Operating System Spec"

- **Promise**: Convert ambition into measurable proof, detect self-deception, get the next best command.
- **Core loop**: Command → Standard → Artifact → Verdict → Upgrade → Memory → Next command.
- **Primary user**: Self-directed operators (student/founder/athlete/creator) who want evidence over identity fantasy.
- **Universal expansion**: Mode catalogue + Domain Standards registry.
- **Key screens**: Dashboard (Command Centre), Proof (Submit), Coach (Diagnose), Operator (Identity), ProofWeek (Momentum), WeeklyRetro (Pattern).
- **Key components**: CommandHero, ProofStandardPreviewPanel, ProofCapture, CourtVerdictBadge, IdentityLedger, TemporalCommandCard, MomentumPanel, WeeklyRetro, InterventionCard.
- **Emotional feel**: Disciplined respect, not hype.
- **Visual feel**: Dark operator console, restrained green accents, mono labels, sans body.
- **Interaction feel**: Fast tap → instant feedback → honest result.
- **Data states**: Every zone designs empty, loading, error, legacy-row, new-user.
- **Proof rules**: No artifact, no claim. Standard before submission. Verdict only after insert. Weak day = minimum proof, not zero.
- **Trust rules**: No guarantees, no therapy/medical/legal claims, no fake AI omniscience, no fake security claims.
- **Mobile rules**: Single column, bottom-tab nav, primary CTA always visible, ≥44 px tap targets, no horizontal overflow.
- **Success metrics**: time-to-first-proof, day-2 return, week-1 proof count, standard escalation rate, verdict-to-next-action click rate.

## 21. Build sequencing plan

**Immediate next build (H1.1):** Command-First Dashboard pass. Collapse `TemporalMap`, `TemporalIntelligencePanel`, `TemporalFeedbackPanel`, `TemporalModelAuditPanel`, `IdentityLedger`, `WeeklyRetro`, full `MomentumPanel` into a Tabs-based "Forecast / Evidence / Audit" section. Above the fold: CommandHero → ProofWeek today line → Submit Proof CTA → Latest verdict → one Risk line. No new dependencies, no schema, no engine changes.

**Next 3 builds (H1.2–H1.4):**
1. Proof page slim: hide attachments + advanced fields behind a single "Add detail" disclosure; verdict renders in-place.
2. Mobile bottom-tab nav for `<md` breakpoint in `AppShell`; preserve desktop sidebar exactly.
3. Admin-gate `/dev/engine` and `/dev/beta` via `useIsAdmin`; redirect to `/dashboard` if non-admin.

**Next 7 builds (H1 path to premium beta):**
1–3 above, then:
4. Onboarding step-by-step wizard collapse (no copy change yet).
5. Empty/loading/error sweep for Dashboard zones + Proof + Coach.
6. Copy pass for Dashboard, Proof, Verdict, Coach using the approved core lines.
7. Route-split Operator, GameForge, Sheet, EngineDebug, BetaAdmin.

**Later (H2+)**: Sentinel one-risk surface, WeeklyRetro Sunday card, personal-best per domain, Identity Ledger recap, Coach→Proof handoff, Landing rewrite, mode templates (Founder/Sales/Athlete), per-mode personalisation, Suspense boundaries.

## 22. Do-not-build list

| Item | Why tempting | Why dangerous now | Precondition |
|---|---|---|---|
| Cortex / counterfactuals | "AI-native" appeal | Adds AI surface before loop clarity proven | Daily proof retention proven |
| Stripe / subscriptions | Revenue | No paid feature parity yet | Pro feature set locked + 50+ retained users |
| Leagues / social | Engagement | Violates discipline doctrine | Never for core loop |
| Push notifications expansion | Retention | Spam risk pre-loop-clarity | Daily return >40% without push |
| Major schema redesign | "Clean foundation" | Breaks existing users | Genuine bottleneck identified |
| Full visual redesign | "Premium" | Throws away working tokens | Polish pass insufficient |
| Onboarding gamification | Activation | Cheap dopamine, breaks doctrine | — |
| Marketplace / public profiles | Growth | Identity-fantasy risk | — |
| Heavy animation library | "Smooth" | Bundle + battery | — |
| App-store push | Distribution | Pre-beta-evidence | Beta loop proven |
| Founder/admin dashboards | Operator value | Distraction from user loop | Multi-user ops need it |
| New AI agent workflows | "AI-native" | Fake-AI risk | Coach proven daily-used |

## 23. Single best Lovable Build Mode prompt

> **MODE: Build mode.**
>
> **Mission:** Implement a Command-First Dashboard pass on `/dashboard`. Move every advanced diagnostic below the fold into a single Tabs section so the user sees exactly one Command, one Proof CTA, one Risk line, and the latest Verdict on first paint — on mobile and desktop.
>
> **Target files (touch only these):**
> - `src/pages/Dashboard.tsx`
> - `src/components/eblocki/MobileCollapse.tsx` (reuse only)
> - Add at most one new presentational component under `src/components/eblocki/` named `DashboardForecastTabs.tsx` that wraps the existing `TemporalMap`, `TemporalIntelligencePanel`, `TemporalFeedbackPanel`, `TemporalModelAuditPanel`, `IdentityLedger`, `WeeklyRetro`, `MomentumPanel` into three Tabs: "Forecast", "Evidence", "Audit". No prop or behaviour changes to these children.
>
> **Current issue:** Dashboard is 621 LoC and stacks 7+ panels above the fold. New users do not get a single unambiguous next move; mobile information density is too high.
>
> **Desired user behaviour:** On opening `/dashboard`, the user immediately sees (in order, single column on mobile):
> 1. CommandHero (existing).
> 2. ProofWeek today line (existing `ProofWeekPanel` in compact mode if available, else current presentation).
> 3. Submit Proof CTA — primary button routing to `/proof`.
> 4. One-line Risk derived from existing temporal/Sentinel data already consumed by the dashboard view-model (no new engine logic — use a value already on the view-model; if not present, omit gracefully).
> 5. Latest verdict card (existing `CourtVerdictBadge`).
> 6. `<DashboardForecastTabs>` collapsed by default on mobile via `MobileCollapse` and shown inline on `md+`.
>
> **UI requirements:**
> - No new dependencies.
> - Use existing shadcn `Tabs` for the three groups.
> - Preserve every existing data fetch; only change layout/order.
> - Keep all existing semantic tokens; no hardcoded colours.
> - Headings: H1 once ("Command"), H2 mono-uppercase per zone.
>
> **Mobile (<768 px):** single column, primary CTA full-width, advanced tabs hidden inside `MobileCollapse` titled "Diagnostics". Tap targets ≥44 px.
>
> **Desktop (≥768 px):** keep current sidebar; main column stays `max-w-6xl`; tabs inline below verdict.
>
> **Guardrails — do NOT:**
> - Touch any file under `src/lib/eblocki/`, `src/integrations/supabase/`, `supabase/`, or `src/hooks/`.
> - Change `dashboard-view-model.ts`, proof scoring, court verdict, level engine, or any engine logic.
> - Add new routes, schema, edge functions, secrets, dependencies, or analytics events.
> - Rewrite copy beyond zone labels ("Command", "Proof", "Risk", "Verdict", "Diagnostics").
> - Convert to Next.js or change router.
> - Modify Onboarding, Proof, Coach, Operator, GameForge.
>
> **Verification:**
> 1. `npm test` — expect existing 174/174 to remain green.
> 2. Playwright (headless Chromium) at 375×1800, 768×1024, 1440×900 against `/dashboard` after restoring the Supabase session via `LOVABLE_BROWSER_SUPABASE_*` env vars. Capture screenshots; confirm: no horizontal overflow, CommandHero visible above the fold, Submit Proof CTA visible above the fold, diagnostics collapsed on mobile.
> 3. If browser testing cannot run in the sandbox, report that honestly and do not claim QA.
>
> **Final report must include:**
> - Files changed (exact paths).
> - Test result (exact pass/fail counts).
> - Build status if observed.
> - Screenshots captured (paths) or honest "not observable".
> - Remaining risks.
> - Explicit statement: no engine, schema, or auth changes were made.

## 24. Verification notes

- **Inspected**: `src/App.tsx`, `src/components/eblocki/AppShell.tsx`, `docs/ARCHITECTURE_OVERVIEW.md`, `docs/ARCHITECTURE_SNAPSHOT.md`, `docs/release/phase-7-beta-release-gate.md`, `src/lib/analytics/events.ts`, directory listings of `src/pages/`, `src/components/eblocki/`, `src/lib/eblocki/`, `supabase/functions/`, page line counts (Dashboard 621, Proof 1317, Onboarding 801, Coach 526, StartToday 316, ProofWeek 211, AppShell 65), `.lovable/plan.md` tail.
- **Not run this pass**: build, lint, tests, Playwright, Supabase linter, security scan, edge-function curl. Prior gate doc reports 174/174 tests + build pass + repo-wide lint debt outside Phase 7 surfaces — treated as last-known status, not freshly verified.
- **Not opened in full this pass**: `Dashboard.tsx`, `Proof.tsx`, `Onboarding.tsx`, `Coach.tsx`, `Landing.tsx`, individual components, migrations. Recommendations are layout/IA-level and safe under the "do not touch engine" guardrail; component-level builds will re-read these files first.
- **Assumptions** (flag honestly): Dashboard view-model already exposes a "risk line"; if not, the immediate build degrades gracefully and that field is deferred. `ProofWeekPanel` can render in compact mode; if not, current presentation is used. `useIsAdmin` exists and is wired (referenced in codebase index).

## 25. Final verdict

- **Verdict**: Premium foundation present, needs polish.
- **Highest-leverage immediate move**: Command-First Dashboard pass (build prompt above).
- **Biggest risk**: Continuing to add intelligence (Cortex, Sentinel depth, modes) before the surface clarity catches up — the moat becomes a maze.
- **What would make Eblocki feel 10× better fastest**: The H1.1–H1.4 sequence (Dashboard collapse, Proof slim, Mobile bottom-tab, Verdict in-place) shipped back-to-back, each with browser verification.
- **What must wait**: Cortex, Stripe, leagues, schema redesign, full visual redesign, app-store push, broad gamification.
- **One-sentence direction**: Make the next proof artifact the only thing the user can see, and make every other intelligence system earn its place by sitting one tap below it.
