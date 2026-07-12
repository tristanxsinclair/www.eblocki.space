# Eblocki Repository Reconciliation + Product Verdict

Date: 2026-07-12  
Repository: `tristanxsinclair/www.eblocki.space`  
Method: repository-truth-first audit (git/GitHub state + source code + release artifacts)

## 1. Evidence scope and limitations

### Evidence inspected
- Branch/PR/CI/deploy state from GitHub APIs and git refs.
- Release ledger/work package docs:
  - `docs/release/elite-master-execution-ledger.md`
  - `docs/release/elite-current-work-package.md`
- Release evidence tree under `docs/release/evidence/` (WP-003, WP-004 artifacts present).
- Product and platform implementation samples:
  - routing/app shell: `src/App.tsx`
  - activation loop: `src/pages/Landing.tsx`, `Auth.tsx`, `Onboarding.tsx`, `StartToday.tsx`, `Proof.tsx`, `Dashboard.tsx`, `ProofWeek.tsx`
  - trust/commercial: `src/pages/Pricing.tsx`, `src/components/eblocki/UpgradeCard.tsx`, `BillingCard.tsx`, `DeleteAccountDialog.tsx`
  - Stripe/Supabase functions: `create-checkout`, `create-portal-session`, `payments-webhook`, `export-data`, `delete-account`
  - workflow files: CI, Pages deploy, Datadog synthetics, E2E, Eblocki Verify
  - migration security patterns (RLS/policies/security definer usage).

### Hard limitations (must remain explicit)
- No direct access to production Supabase dashboard data, Stripe dashboard, PostHog analytics, or Datadog run details.
- No authenticated in-product browser walkthrough executed in this session.
- Therefore retention, conversion, and unit economics are **NEEDS VERIFICATION** unless code/CI artifacts prove otherwise.

---

## 2. Repository reconciliation

## 2.1 Current main-branch state
- `origin/main` SHA: `2002a4ac...`
- Latest merged PR sequence is merge-commit heavy and branch ping-pong between `main` and `codex/first-proof-post-merge-cleanup-20260629` (PRs #85–#98).
- `main` is currently green in CI and deployment workflows.

## 2.2 Working-tree state
- Current branch: `tristanxsinclair-sync-update-branches`
- Working tree clean (no local file modifications during reconciliation stage).

## 2.3 Branch/PR classification table

| Branch | Purpose | Ahead/Behind vs `main` | Files Changed vs `main` | PR | CI | Conflicts | Overlap Risk | Last Activity | Classification | Required Action |
|---|---|---:|---:|---|---|---|---|---|---|---|
| `main` | Production/default branch | 0/0 | n/a | n/a | Success (CI, Eblocki Verify, E2E, Datadog, Pages) | n/a | n/a | 2026-07-12 | KEEP OPEN | Continue as release branch |
| `codex/first-proof-post-merge-cleanup-20260629` | Historical integration branch used for repeated merge ping-pong | 0 ahead / 1 behind | 0 | No open PR | Recent runs successful | No current conflict (empty diff) | High process overlap (already merged repeatedly) | 2026-07-12 | SUPERSEDED | Delete branch after approval |
| `tristanxsinclair-sync-update-branches` | Sync branch created for update sweep | 0/0 | 0 | No open PR | No dedicated branch checks needed (identical to main) | No | None | 2026-07-12 | ABANDON | Delete branch after approval |

### Open/draft/closed PR status
- Open PRs: **0**
- Draft PRs: **0**
- Closed-unmerged PRs (recent sample): **0**
- Recently merged PRs: #98, #97, #96, #95, #94, #93… (#85+ all merged).

### Branch protection
- `main` branch protection: **not enabled** (`protected=false`, no required checks configured at branch-rule level).
- Risk: merge policy currently relies on team discipline, not enforced guardrails.

### CI and checks
- Recent workflow runs are green for:
  - `CI`
  - `Eblocki Verify`
  - `E2E - System Forge`
  - `Deploy GitHub Pages`
  - `Run Datadog Synthetic tests`
- Datadog workflow explicitly skips when `DD_API_KEY`/`DD_APP_KEY` secrets are absent.

### Deployment state
- Latest GitHub Pages deployment: success for SHA `2002a4ac`.
- Previous deployments marked `inactive` as expected.
- Pages API reports `https_enforced: false`, but edge response currently redirects `http -> https` (likely Cloudflare layer).

## 2.4 Safe merge candidates (stage 1 recommendation only)
- No merge candidates remain; both non-main branches are zero-diff/superseded.
- Recommended merge order: **none**.

## 2.5 Branches recommended for deletion (after explicit approval)
1. `codex/first-proof-post-merge-cleanup-20260629` (superseded, behind main, zero diff).
2. `tristanxsinclair-sync-update-branches` (operational temp branch, zero diff).

## 2.6 Documentation/repository drift found

### Drift confirmed
1. `src/components/eblocki/UpgradeCard.tsx` and `src/pages/Pricing.tsx` disagree on pricing numbers (Pro/Founder values differ) -> pricing source-of-truth drift is real.
2. `src/pages/legal/AIDisclosure.tsx` states model can be chosen in Settings, but Settings strips `model`/`vector_store_id` and no model selector is present -> legal/product copy drift.
3. `supabase/functions/export-data/index.ts` comment says “every row owned by caller” but exports only a subset of user tables -> data-export completeness claim drift.

### Ledger alignment checks
- `elite-master-execution-ledger.md` and `elite-current-work-package.md` are largely aligned with repo state:
  - WP-004 code changes are present.
  - external gates remain explicitly blocked (not falsely closed).

---

## 3. Branch and PR classification (decision summary)

### MERGE NOW
- None.

### MERGE AFTER FIX
- None (no open PRs).

### KEEP OPEN
- `main` only.

### SUPERSEDED
- `codex/first-proof-post-merge-cleanup-20260629`.

### ABANDON
- `tristanxsinclair-sync-update-branches` (cleanup branch).

### NEEDS OWNER DECISION
- Deleting superseded branches (safe, but owner approval required).
- Enabling branch protection and required status checks.

---

## 4. CI and deployment state

### CI
- Current status: green on latest `main`.
- Gap: branch protection does not enforce CI; merges can still happen without required checks.
- E2E caveat: workflow comments note authenticated specs self-skip unless Supabase auth env is configured.

### Deployment
- Pages deploy pipeline green on latest SHA.
- Site reachable over HTTPS and redirects from HTTP.
- Environment-level “https_enforced” is false in Pages API; runtime HTTPS still works via edge layer.

---

## 5. Ledger/document drift

### Controls marked complete without hard external proof
- No clear false-complete finding in release ledger; blocked controls remain marked blocked.

### Claims needing correction
- AI Disclosure model-selection claim (not true in current Settings UI).
- Export-data “every row” wording (overstates current implementation).
- Pricing numbers not unified across surfaces (commercial truth drift).

---

## 6. Product audit (implementation)

### Surface health snapshot
- Activation path exists end-to-end: Landing -> Auth -> Onboarding -> Start Today -> Proof -> Dashboard.
- Proof loop and verdict loop are implemented with deterministic scoring helpers and evidence strength taxonomy.
- Weekly and temporal surfaces exist, but complexity density is high in core pages (`Proof.tsx` ~1930 lines, `Onboarding.tsx` ~801, `Coach.tsx` ~744, `Dashboard.tsx` ~736).
- Account controls include export/delete/billing portal pathways.

---

## 7. UX audit

### Key strengths
- Clear copy in Landing and Proof Week around evidence-first behavior.
- Strong mobile-oriented primitives (`mobile-safe-*`, `MobileCollapse`, responsive routes).
- Destructive flow improved via typed confirmation dialog for delete.

### Key UX risks
- Information density and cognitive load are high in `Proof`, `Dashboard`, and `Coach`.
- Duplicate conceptual pathways (`/start` and `/start-today`) increase navigation ambiguity.
- Multiple high-concept systems (Court, Sentinel, temporal intelligence, GameForge, System Forge) can dilute first-week clarity.

---

## 8. Trust audit

### Positive
- Explicit “proof not plans” positioning in key public screens.
- Account deletion flow now includes subscription cancellation attempt and attachment pagination.
- RLS is broadly enabled on public tables; migrations include policy work and SECURITY DEFINER hardening updates.

### Risks
- `export-data` appears incomplete vs “all owned rows” expectation (trust/legal risk).
- Some migrations still use `auth.role()` checks for service-role policy paths (deprecated Supabase guidance).
- E2E authenticated QA remains partly dependent on manual credentials/session injection.

---

## 9. Commercial audit

### Positive
- Checkout, portal, subscription tracking, and founder pathway are implemented.
- Billing card and return page communicate status and renewal/cancel behavior.

### Risks
- Pricing inconsistency across UI surfaces (critical conversion/trust issue).
- Founder experience is partly manual email flow; no clear in-app evidence of SLA tracking.
- No verifiable conversion/retention analytics evidence in this audit context.

---

## 10. Technical audit

### Current technical profile
- Frontend codebase substantial; several oversized components suggest maintainability risk.
- Tests present across unit/integration/e2e (42 test/spec files discovered).
- CI includes tests/build/lint/bundle guardrail/smoke routes/audit.
- Branch governance weak due absent protection rules.

### Supabase/security notes
- Broad RLS coverage present.
- SECURITY DEFINER function execution revocation migration exists.
- Deprecated `auth.role()` usage still present in email/subscription migration policies; should be modernized to role-targeted policy `TO ...` with predicates.

---

## 11. Executive scorecard

| Dimension | Score | Reason (evidence) | Weakest point | Evidence needed to raise score |
|---|---:|---|---|---|
| Overall product | 62/100 | Core loop exists; CI/deploy green; still blocked by trust/commercial inconsistencies | Pricing + export truth drift | Real usage outcomes + corrected pricing/export alignment |
| Activation | 7/10 | Strong explicit landing and onboarding/start flow | Complexity after first proof | Funnel analytics by step |
| Product clarity | 6/10 | Evidence-first messaging is clear on key pages | System sprawl and term density | User task-completion interviews |
| Proof-loop quality | 7/10 | Proof submit + verdict + next action implemented | Large `Proof.tsx` complexity risk | Fresh authenticated multi-device QA |
| Verdict credibility | 6/10 | Deterministic scoring and standards present | Trust depends on anti-gaming evidence not observed | Ground-truth verdict calibration study |
| Mobile quality | 6/10 | Mobile patterns and evidence assets exist | Some mobile flows historically blocked/auth-dependent | Fresh signed-in 390px/430px QA pass |
| Accessibility | 5/10 | Basic labels/alerts/dialog semantics visible | No audited a11y test evidence in this pass | axe/keyboard/screen-reader audit artifacts |
| Trust/privacy | 6/10 | Delete flow hardened, legal pages exist | AI disclosure and export completeness drift | Legal-copy update + export completeness test |
| Technical reliability | 7/10 | Green CI/deploy + tests + guardrails | Oversized core files, branch governance | Regression trend + refactor outcomes |
| Retention evidence | 3/10 | Instrumentation exists | No retention metrics available here | Cohort D1/D7/D30 data |
| Monetisation readiness | 5/10 | Stripe flow exists | Pricing inconsistency + manual founder path | Verified checkout/portal conversion metrics |
| Unit economics evidence | 2/10 | None directly available | No cost/revenue telemetry evidence | CAC/LTV/gross margin model with real data |
| Operational maturity | 6/10 | Multiple workflows and deploy cadence active | No branch protection; merge discipline fragile | Protected branch + required checks policy |

---

## 12. Top 25 strengths

1. Clear core thesis: proof over planning.  
2. End-to-end authenticated app routing and protected surfaces.  
3. Strong Landing -> Proof Week activation narrative.  
4. Onboarding captures identity/goals/modes in structured schema.  
5. Start Today enforces concrete artifact planning.  
6. Proof submission includes attachments and OCR flow.  
7. Verdict pipeline with explicit weak/moderate/strong/elite model.  
8. Dashboard integrates commitments/proofs/verdict context.  
9. Coach plus proof-contract linkage is implemented.  
10. GameForge/System Forge present as reusable modules.  
11. Billing portal integration exists.  
12. Checkout return polling handles webhook delay.  
13. Subscription state model handles recurring and founder cases.  
14. Account delete now uses typed confirmation dialog.  
15. Delete-account function cancels active subscriptions before delete attempt.  
16. Storage purge pagination added for large attachment sets.  
17. Cascade-delete contract reduces manual-table drift risk.  
18. Release ledger is detailed and generally honest about blocked vs verified.  
19. CI includes build/test/lint/guardrail/smoke checks.  
20. Pages deployments are frequent and currently green.  
21. Datadog synthetic workflow integrated.  
22. E2E harness and average-user fixture infrastructure exists.  
23. Many domain-specific unit tests in `src/lib/eblocki/__tests__`.  
24. Legal surfaces (privacy/terms/data-handling/AI disclosure) are present.  
25. Evidence artifacts are archived in-repo for multiple work packages.

---

## 13. Top 50 blockers (ranked)

| Rank | Blocker | Sev | Evidence state | Notes |
|---:|---|---|---|---|
| 1 | Pricing values inconsistent across UI (`Pricing` vs `UpgradeCard`) | P0 | VERIFIED | Conversion + trust risk |
| 2 | Export endpoint claims all user rows but exports subset only | P0 | VERIFIED | Data-rights/trust risk |
| 3 | Main branch unprotected; no required checks enforcement | P0 | VERIFIED | Governance/release risk |
| 4 | No open PR queue but repeated merge ping-pong history | P1 | VERIFIED | Process instability |
| 5 | AI disclosure says model selectable in Settings; UI does not expose it | P1 | VERIFIED | Legal/copy drift |
| 6 | Retention evidence unavailable in audit context | P1 | NEEDS VERIFICATION | PMF claims blocked |
| 7 | Conversion evidence unavailable in audit context | P1 | NEEDS VERIFICATION | Monetisation claims blocked |
| 8 | Unit economics evidence unavailable | P1 | NEEDS VERIFICATION | Profitability claims blocked |
| 9 | `Proof.tsx` oversized (~1930 LOC) | P1 | VERIFIED | Change-risk hotspot |
| 10 | `Onboarding.tsx` oversized | P2 | VERIFIED | Complexity risk |
| 11 | `Coach.tsx` oversized | P2 | VERIFIED | Complexity risk |
| 12 | `Dashboard.tsx` oversized | P2 | VERIFIED | Complexity risk |
| 13 | Authenticated E2E still environment-dependent/self-skip pattern | P1 | VERIFIED | Blind spot in CI |
| 14 | Datadog checks can silently skip if secrets absent | P2 | VERIFIED | Monitoring confidence risk |
| 15 | `/start` and `/start-today` duplicate route concept | P2 | VERIFIED | UX ambiguity |
| 16 | High concept surface count for first-week user | P1 | INFERRED | Cognitive load |
| 17 | Founder flow is manual email workflow | P2 | VERIFIED | Operational friction |
| 18 | No explicit branch policy doc enforced by automation | P2 | VERIFIED | Process fragility |
| 19 | Migrations include deprecated `auth.role()` usage | P1 | VERIFIED | Supabase policy hygiene risk |
| 20 | Export-data table list hardcoded and likely to drift | P1 | VERIFIED | Ongoing trust risk |
| 21 | No evidence of automated accessibility audits in CI | P2 | NEEDS VERIFICATION | A11y release risk |
| 22 | No verified anti-gaming efficacy evidence | P1 | NEEDS VERIFICATION | Verdict credibility risk |
| 23 | No verified false-positive/false-negative verdict calibration | P1 | NEEDS VERIFICATION | Trust risk |
| 24 | No explicit required-check gating for PR merges | P1 | VERIFIED | Release discipline risk |
| 25 | Repeated merged PR titles low-signal/noise | P3 | VERIFIED | Auditability friction |
| 26 | No observed unresolved-thread policy enforcement | P3 | NEEDS VERIFICATION | Review quality risk |
| 27 | Pricing/Founder policy depends on manual decisions still open | P1 | VERIFIED | Revenue risk |
| 28 | WP-004 external Stripe cancellation verification still blocked | P1 | VERIFIED | Billing trust closure pending |
| 29 | WP-001 external export verification still blocked | P1 | VERIFIED | Confinement closure pending |
| 30 | No direct production analytics validation in this pass | P2 | BLOCKED | Access required |
| 31 | No direct production Stripe reconciliation check in this pass | P2 | BLOCKED | Access required |
| 32 | No direct Supabase advisor run evidence in this pass | P2 | BLOCKED | Access required |
| 33 | Potential mismatch between legal retention text and immediate delete behavior semantics | P3 | INFERRED | Needs legal review |
| 34 | Core pages couple UI + business logic tightly | P2 | VERIFIED | Refactorability risk |
| 35 | High number of concurrent systems increases support burden | P2 | INFERRED | Ops risk |
| 36 | No observed feature-flag kill switches for complex modules | P2 | NEEDS VERIFICATION | Rollback risk |
| 37 | No explicit conversion funnel report linked in release docs | P2 | NEEDS VERIFICATION | GTM blind spot |
| 38 | No churn reason evidence linked in release docs | P2 | NEEDS VERIFICATION | Retention blind spot |
| 39 | Manual founder granting path can cause entitlement latency/errors | P2 | INFERRED | Revenue/support risk |
| 40 | Customer support burden not instrumented in repo evidence | P3 | NEEDS VERIFICATION | Ops blind spot |
| 41 | Mobile QA evidence still partially auth-gated | P2 | VERIFIED | UX confidence gap |
| 42 | Some monitoring relies on external secret configuration uncertainty | P3 | VERIFIED | Alerting gap |
| 43 | No explicit SLO/SLA definitions in release docs | P3 | NEEDS VERIFICATION | Reliability management gap |
| 44 | No branch cleanup automation for superseded branches | P4 | VERIFIED | Repo hygiene |
| 45 | No observed dependency update governance policy | P3 | NEEDS VERIFICATION | Supply-chain risk |
| 46 | No observed incident runbook linkage in release artifacts | P3 | NEEDS VERIFICATION | Response risk |
| 47 | No single-source pricing constants used across all pricing UI surfaces | P1 | VERIFIED | Repeat drift risk |
| 48 | Legal/product copy ownership not gate-checked in CI | P2 | INFERRED | Trust drift recurrence |
| 49 | Heavy release-doc volume can hide stale claims over time | P3 | VERIFIED | Documentation entropy |
| 50 | PMF stage claims remain evidence-light without cohort/payment telemetry | P1 | NEEDS VERIFICATION | Strategic risk |

---

## 14. False assumptions

1. “Pricing is consistent across product” -> **contradicted by evidence**.  
2. “Export contains all user-owned data” -> **contradicted by evidence**.  
3. “Users can choose preferred model in Settings” -> **contradicted by evidence**.  
4. “Branch checks are enforced by policy” -> **contradicted by evidence**.  
5. “Datadog tests always run” -> **plausible but unproven** (can skip).  
6. “Verdict quality is calibrated enough for paid trust” -> **currently unknowable**.  
7. “Retention trajectory supports PMF” -> **currently unknowable**.  
8. “Founder offer is operationally scalable” -> **plausible but unproven**.  
9. “Complex multi-system surface helps activation” -> **unsafe product claim** without funnel proof.  
10. “Unit economics are healthy” -> **currently unknowable**.

---

## 15. PMF analysis

- Strongest likely segment: motivated students/professionals who accept strict evidence-based feedback loops.
- Weakest likely segment: users seeking lightweight habit tracking or motivational UX without friction.
- Likely first paying users: users with repeated proof submissions who value explicit next-command feedback.
- Likely D7 churn reasons:
  1. cognitive load after initial activation,
  2. unclear value differential between free and paid if verdict trust not established quickly.
- Likely D30 churn reasons:
  1. perceived verdict inconsistency,
  2. pricing/value mismatch confusion.
- Strongest proposition: “submit real work -> get an honest verdict + next action”.
- Weakest proposition: high-concept system breadth before proven simple recurring habit.
- PMF status: **pre-product-market-fit** (implementation depth exists; retention/payment evidence in this pass is insufficient).

---

## 16. Next 30 days (25 ranked actions)

Scoring: P0 controls override formula where needed.

| Rank | Action | Impact | Effort | Confidence | Risk |
|---:|---|---:|---:|---:|---:|
| 1 | Unify pricing constants across `Pricing`, `UpgradeCard`, checkout copy | 5 | 1 | 5 | 1 |
| 2 | Fix `export-data` completeness or relabel scope explicitly | 5 | 2 | 5 | 2 |
| 3 | Enable branch protection + required checks on `main` | 5 | 1 | 5 | 1 |
| 4 | Resolve AI disclosure vs Settings model-selection mismatch | 4 | 1 | 5 | 1 |
| 5 | Execute WP-004 external Stripe cancellation verification | 5 | 2 | 4 | 2 |
| 6 | Execute WP-001 external export verification on deployed function | 5 | 2 | 4 | 2 |
| 7 | Replace deprecated `auth.role()` migration policy patterns | 4 | 2 | 4 | 2 |
| 8 | Add CI check to fail if pricing constants diverge from source-of-truth file | 4 | 2 | 4 | 2 |
| 9 | Refactor `Proof.tsx` into bounded modules | 4 | 4 | 4 | 3 |
| 10 | Refactor `Coach.tsx` into bounded modules | 3 | 4 | 4 | 3 |
| 11 | Refactor `Dashboard.tsx` into bounded modules | 3 | 4 | 4 | 3 |
| 12 | Add deterministic export contract test for required tables/fields | 4 | 2 | 4 | 2 |
| 13 | Add authenticated E2E secrets in CI for non-skipped critical specs | 4 | 3 | 3 | 3 |
| 14 | Gate release on non-skipped critical auth E2E set | 4 | 2 | 3 | 3 |
| 15 | Consolidate `/start` and `/start-today` navigation contract | 3 | 2 | 4 | 2 |
| 16 | Publish explicit paid entitlement source-of-truth matrix | 4 | 2 | 4 | 2 |
| 17 | Add legal-content regression checks for trust-critical copy claims | 3 | 2 | 3 | 2 |
| 18 | Add retention dashboard snapshot artifact to release evidence | 4 | 2 | 3 | 2 |
| 19 | Add conversion dashboard snapshot artifact to release evidence | 4 | 2 | 3 | 2 |
| 20 | Define minimum verdict-calibration benchmark and test set | 4 | 3 | 3 | 3 |
| 21 | Add branch cleanup policy for superseded zero-diff branches | 2 | 1 | 5 | 1 |
| 22 | Add runbook for Stripe/Supabase incident handling | 3 | 2 | 3 | 2 |
| 23 | Add a11y audit checklist with artifact requirement per release gate | 3 | 2 | 3 | 2 |
| 24 | Tighten founder path operational SLA and status tracking | 3 | 2 | 3 | 2 |
| 25 | Establish monthly architecture debt burn-down targets | 3 | 3 | 3 | 2 |

---

## 17. Next 100 days (phase roadmap)

### Phase 0 — Remaining containment
- Objective: close confidentiality/truth drift controls.
- Dependencies: access to Supabase/Stripe test verification.
- Acceptance: WP-001 + WP-004 external gates closed.
- Release gate: no blocked P0/P1 trust controls.
- Proof required: export sample, Stripe cancellation audit artifact.

### Phase 1 — Trust and release closure
- Objective: lock commercial/trust source-of-truth.
- Dependencies: pricing decisions from owner.
- Acceptance: single pricing SOT used across all product surfaces.
- Release gate: legal/product copy consistency checks passing.
- Proof required: screenshot + test assertions for all pricing surfaces.

### Phase 2 — Core-loop compression
- Objective: reduce cognitive load in first-week path.
- Dependencies: Phase 1 complete.
- Acceptance: fewer steps/terms between auth and first validated proof.
- Release gate: activation funnel improvement evidence.
- Proof required: funnel deltas and session recordings summary.

### Phase 3 — Judgment and mobile quality
- Objective: improve verdict credibility and mobile reliability.
- Dependencies: authenticated E2E in CI.
- Acceptance: stable cross-device authenticated proof/verdict QA.
- Release gate: no blocker defects in 390/430/1280 viewports.
- Proof required: Playwright and manual artifacts.

### Phase 4 — Retention validation
- Objective: validate D7/D30 retention mechanics.
- Dependencies: instrumentation + data access.
- Acceptance: cohort evidence tied to product changes.
- Release gate: retention report with hypothesis outcomes.
- Proof required: PostHog cohort snapshots and interpretation log.

### Phase 5 — Monetisation validation
- Objective: verify conversion and churn drivers.
- Dependencies: stable pricing SOT and retention baseline.
- Acceptance: conversion funnel and cancellation reason evidence.
- Release gate: monetisation dashboard trend with confidence bounds.
- Proof required: Stripe + analytics reconciliation artifact.

### Phase 6 — Scale after gates
- Objective: expand advanced systems only if core loop holds.
- Dependencies: phase 0-5 gates passed.
- Acceptance: no regression in trust/activation/retention metrics.
- Release gate: release review board sign-off.
- Proof required: full gate packet.

---

## 18. Kill list

- Remove conflicting pricing labels from any non-SOT component.
- Remove “model selectable in settings” claim unless reimplemented.
- Hide advanced/diagnostic surfaces from normal activation path where not essential.
- Merge duplicate start-route semantics.
- Remove low-signal merge PR title practices.
- Remove any product copy that implies complete export if incomplete.
- Delay additional intelligence layers until retention/commercial gates are evidenced.
- Collapse overlapping “forecast/intelligence/audit” diagnostics where user value is unproven.

---

## 19. Next strict work package (single executable package)

### WP-005A — P1-PAY-ENV VERIFICATION

- Status: READY / EXECUTABLE.
- Objective: verify that development, test, and production payment environments cannot be confused and that checkout, webhooks, billing portal, and entitlement handling use the intended environment.
- Files likely affected:
  - `src/lib/stripe.ts`
  - `src/components/PaymentTestModeBanner.tsx`
  - `supabase/functions/create-checkout/index.ts`
  - `supabase/functions/payments-webhook/index.ts`
  - `supabase/functions/create-portal-session/index.ts`
  - `src/hooks/useSubscription.ts`
  - related tests (`src/lib/...` or page/component tests)
  - release docs (`elite-current-work-package.md`, ledger update after verification only)
- Dependencies:
  1. Access to sandbox/live verification evidence for environment routing.
- Tests:
  1. unit tests for environment guard and environment-selection behavior,
  2. environment guard tests for banner and checkout path,
  3. full build/test/lint CI run,
  4. viewport QA 390/1280 screenshots.
- Acceptance criteria:
  1. Test-mode banner never appears when env resolves to live.
  2. Checkout rejects env/price mismatches deterministically.
  3. Webhook and portal logic write/read the intended environment partition.
  4. No regression in billing portal/open flows.
- Release gate:
  - P1-PAY-ENV marked verified with artifacts.

### WP-005B — P1-PRICING-SOT CONSISTENCY LOCK

- Status: BLOCKED — MANUAL COMMERCIAL DECISION REQUIRED.
- Objective: lock all public pricing/terms surfaces to a single approved source of truth after owner decisions.
- Required Tristan decisions:
  1. Pro monthly public price.
  2. Pro annual public price.
  3. Annual saving/discount.
  4. Founder price.
  5. Founder direct-purchase vs application model.
  6. Lifetime/founder-stage wording.
  7. Refund wording.
- Non-scope until decisions are supplied:
  - no price changes,
  - no Founder-term changes,
  - no refund wording changes,
  - no PRICE_ID invention,
  - no entitlement redesign.

---

## 20. Reconciliation closeout actions (executed)

1. Deleted superseded remote branches after zero-diff / no-open-PR re-verification:
   - `codex/first-proof-post-merge-cleanup-20260629`
   - `tristanxsinclair-sync-update-branches`
2. Deleted local `tristanxsinclair-sync-update-branches` after confirming no unique work.
3. Enabled `main` branch protection with:
   - pull requests required before merge,
   - up-to-date branch required (`strict=true`),
   - required successful checks:
     - `Verify product` (CI workflow check run),
     - `Test, build, and lint` (Eblocki Verify workflow check run),
     - `Playwright (mobile-chromium)` (E2E - System Forge workflow check run),
   - required conversation resolution,
   - force pushes blocked,
   - branch deletion blocked,
   - admins enforced.
4. Deployment gate policy recorded:
   - GitHub Pages deploy remains post-merge deployment confirmation.
   - Datadog synthetic remains post-deploy release signal (not a required pre-merge gate).
