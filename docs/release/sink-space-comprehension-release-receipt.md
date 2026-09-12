# Sink Space comprehension upgrade release receipt

Date: 2026-09-05 (Australia/Perth)

Status: **RELEASED — CANONICAL PUBLICATION AND AUTHENTICATED PROOF LOOP VERIFIED**

## Durable source and release identity

- Repository: `tristanxsinclair/www.eblocki.space`
- Product implementation commit: `51461b83cff1b91ffc8d24a30c9b804e65b80a2f`
- Product pull request: [#112](https://github.com/tristanxsinclair/www.eblocki.space/pull/112)
- Product protected-main merge: `ee3481ee38dab05a0dbad2f9bb51d5efc1dd6e22`
- Release compatibility commit: `e6b37e05307679d99df4ba3d3a9211febc90e8b7`
- Release compatibility pull request: [#114](https://github.com/tristanxsinclair/www.eblocki.space/pull/114)
- Published protected-main merge: `a2da9bf1fcf46477b8a19287859665ae713240ff`
- Lovable production build ID: `a2da9bf1fcf4-20260905054929`
- Lovable build timestamp shown in production Settings: `2026-09-05 13:49:29` Australia/Perth
- Lovable environment shown in production Settings: `production`

The release compatibility patch prevents established users with legacy `completed_onboarding` state from being bounced from the dashboard to Welcome. New first-use users still enter the Welcome flow. Dashboard profile lookup failures fail open rather than trapping authenticated users. Regression coverage was added for both states.

## What shipped

- The public and first-use journeys explain the university-work loop as work -> verdict -> gap -> correction.
- Advanced operating-profile setup no longer blocks the first proof submission.
- Verdict copy distinguishes observed evidence, inferred assessment, and recommended correction.
- Privacy-safe activation events cover artifact submission, correction start, and second-attempt submission without artifact or verdict text.
- Existing proof scoring, Court, XP, payments, database schema, and Supabase functions were preserved rather than replaced or duplicated.

## Verification gates

Verification was run on the committed release compatibility branch before protected merge.

| Gate | Result | Evidence |
| --- | --- | --- |
| Tests | PASS | 52 files, 379 tests |
| TypeScript | PASS | `npx tsc -p tsconfig.app.json --noEmit` |
| Eblocki lint ratchet | PASS | no warnings or errors |
| Full lint | PASS WITH DEBT | 0 errors and 12 pre-existing warnings outside this upgrade |
| Production build | PASS | Vite 5.4.21; tracked MCP function unchanged |
| Bundle guard | PASS | within the committed JS and CSS budgets |
| Route smoke | PASS | 17/17 SPA routes returned HTTP 200 |
| Production-high audit gate | PASS | `npm audit --omit=dev --audit-level=high` exited 0 |
| Pull-request checks | PASS | Verify product, Test/build/lint, mobile Playwright, and Datadog build |
| Main CI | PASS | [run 33948176514](https://github.com/tristanxsinclair/www.eblocki.space/actions/runs/33948176514) |
| Main GitHub Pages | PASS | [run 33948176506](https://github.com/tristanxsinclair/www.eblocki.space/actions/runs/33948176506) |
| Main Datadog workflow | PASS | [run 33948176489](https://github.com/tristanxsinclair/www.eblocki.space/actions/runs/33948176489) |

The Windows build mutation remains isolated in `vite.config.ts`. `@lovable.dev/mcp-js` 0.20.x can replace the tracked MCP function when given a Windows drive-letter path. Normal Windows builds retain the reviewed generated function. Linux CI and Lovable builds still run MCP generation; `EBLOCKI_FORCE_MCP_GENERATION=true` is the explicit Windows opt-in for validating an upstream fix.

## Advisory classification

`npm audit fix` was run without `--force`; it applied only non-breaking transitive patches and reduced the report from 9 findings (3 high, 6 moderate) to 4 findings (1 high, 3 moderate).

- Patched: `browserslist` build-tool advisories and the `fast-uri` transitive runtime advisory.
- Remaining high: the Vite/esbuild development-server file-read path. Vite is a development/build dependency and is not included in the deployed browser runtime. Automatic remediation requires the breaking Vite 8 upgrade.
- Remaining moderate: Vite/esbuild development-server request exposure and two React Router advisories. React Router remediation requires a deliberate v7 migration.
- Decision: do not run `npm audit fix --force`; schedule Vite 8 and React Router 7 as compatibility work with Lovable, Capacitor, routing, and browser regression coverage.

## Canonical publication evidence

Lovable was explicitly published after protected main reached `a2da9bf1fcf46477b8a19287859665ae713240ff`.

The cache-bypassed canonical URL `https://eblocki.space/?release=a2da9bf&receipt=final` was inspected after publication:

- Page title: `Eblocki — Improve from the work you actually produce`
- New hero `Improve from the work you actually produce`: present
- Prior hero `Turn your life into a game you can win`: absent
- Production Settings commit: `a2da9bf1fcf4`
- Production Settings build ID: `a2da9bf1fcf4-20260905054929`

Evidence: [canonical-published.png](./screenshots/sink-space-upgrade/canonical-published.png). The earlier [canonical-pre-lovable-publish.png](./screenshots/sink-space-upgrade/canonical-pre-lovable-publish.png) remains as the before-state showing why the Lovable publication step was required.

## Authenticated proof-to-correction loop

The owner-authenticated canonical production application was exercised without creating a test account or extracting credentials, session storage, cookies, or tokens.

1. Submitted `Release QA: canonical publication receipt` in Sink Space as `implementation proof`.
2. Production returned and persisted a moderate `6/10` verdict with a product-system standard gap and the correction `Implement or test the corrected logic before claiming identity-level progress.`
3. Opened the verdict's `Submit corrected attempt` path and observed the correction form prefilled from the first verdict.
4. Submitted `Corrected attempt: Release QA: canonical publication receipt` with the exact protected-main revision, compatibility correction, verification gates, Lovable build identity, reflection, and next upgrade.
5. Production returned an elite `9/10` verdict, `Counted`, and `Strong enough to close today.`
6. Navigated away to `/dashboard`, then re-opened `/proof`. The dashboard showed the corrected attempt as the latest elite proof, and proof history showed exactly one corrected `9/10` record beside the original `6/10` record.

Privacy-safe evidence:

- [04-corrected-verdict.png](./screenshots/sink-space-upgrade/authenticated/04-corrected-verdict.png)
- [05-dashboard-persistence.png](./screenshots/sink-space-upgrade/authenticated/05-dashboard-persistence.png)
- [06-proof-history-persisted.png](./screenshots/sink-space-upgrade/authenticated/06-proof-history-persisted.png)

The production UI does not expose artifact or verdict row IDs. Database identifiers and an explicit parent-child correction foreign key were therefore not claimed. The visible application state proves two distinct persisted artifacts, the score change from 6/10 to 9/10, and a single visible corrected record; it does not substitute for a direct database-integrity query.

## Performance and remaining risks

- The bundle-size guard passes, but local mobile-profile Lighthouse measured performance 38, accessibility 94, best practices 100, and SEO 100. Mobile metrics were FCP 4,175 ms, LCP 7,440 ms, TBT 2,016 ms, CLS 0.0195, and TTI 8,151 ms.
- This is local synthetic evidence, not real-user monitoring. It blocks an unqualified App Store or broad-distribution performance claim, not this controlled web release.
- This upgrade contains no schema migration and no generated Supabase type change. Production schema and Edge Function alignment were not queried through a privileged database channel. Local migration files are not deployment evidence.
- Lovable still reports one reviewed security finding for a public `SECURITY DEFINER` audit-receipt lookup guarded by its share token. It was not changed as part of this release.
- Direct canonical JavaScript asset inspection was blocked by the browser client. The canonical page content plus the production Settings commit/build card provide the deployed build identity used here.

## Final verdict

**SHIPPED — CANONICAL BUILD VERIFIED — AUTHENTICATED PROOF RECEIPT COMPLETE**

The wider-distribution performance gate and privileged Supabase schema/Edge alignment remain explicitly unverified and should be handled as separate release-hardening work, not folded into another redesign.
