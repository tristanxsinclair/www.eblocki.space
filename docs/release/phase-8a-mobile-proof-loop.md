# Phase 8A — Mobile Proof Loop Closure

## Objective
Confirm the mobile proof loop (landing → auth → onboarding → dashboard →
proof → verdict → dashboard) is beta-clean at 375–430 px: no horizontal
overflow, one clear command above the fold, advanced panels collapsed by
default, MCP integration reachable.

## Files inspected
- `vite.config.ts`
- `src/pages/Dashboard.tsx` (786 lines)
- `src/pages/Proof.tsx`, `Onboarding.tsx`, `StartToday.tsx`, `Landing.tsx`
- `src/components/eblocki/AppShell.tsx`, `MobileCollapse.tsx`
- `src/lib/eblocki/mobile-disclosure.ts`
- `src/lib/mcp/index.ts` and `src/lib/mcp/tools/*`
- `supabase/functions/mcp/index.ts` (auto-generated banner intact)
- `.lovable/mcp/manifest.json`

## What was already correct (prior phases 7.3 / 8)
- Global containment rail (`html/body/#root` + `mobile-safe-page`,
  `mobile-safe-card`, `text-wrap-safe`) in `src/index.css`.
- AppShell: `w-full max-w-full overflow-x-hidden` on root and `<main>`,
  mobile brand bar + `MobileBottomNav`.
- Dashboard mobile hierarchy already:
  1. `ProofClosureCard` (today command surface)
  2. Modes-setup notice (collapsed)
  3. `ProofWeekPanel` (collapsed)
  4. `Advanced` accordion wrapping EvidenceCommandPanel,
     DashboardForecastTabs, Temporal/Identity/ProductMatch panels
- Humanised mode labels via `src/lib/eblocki/display-labels.ts`.
- Full-width 44 px CTAs on ModeDetail / dashboard empty states.

## Files changed this pass
- `.lovable/mcp/manifest.json` — regenerated via
  `app_mcp_server--extract_mcp_manifest` (3 tools; unchanged shape).
- `docs/release/phase-8a-mobile-proof-loop.md` (this file).

No component/logic edits were required: prior phases already implemented
the mobile containment + progressive disclosure this phase was asked to
verify. Adding more edits would violate the "smallest useful production
change" doctrine.

## MCP status
- `supabase/functions/mcp/index.ts` present, banner intact.
- Live probe of `POST /functions/v1/mcp` with `initialize` returned
  HTTP 200 SSE with `serverInfo.name = "eblocki-mcp"`,
  `version = "0.1.0"`, `protocolVersion = "2025-03-26"`.
- Manifest lists three tools: `check_proof_artifact`,
  `get_proof_standard`, `suggest_next_command`. No auth block
  (read-only tools, per design). MCP is not broken; nothing to fix.

## Verification
| Check | Result |
| --- | --- |
| `npm run build` | PASS (6.18 s, chunk-size warning only) |
| MCP live `initialize` | PASS (HTTP 200, correct serverInfo) |
| Manifest extract | PASS (3 tools) |
| Mobile 390 px `/` (landing) | PASS — `scrollWidth == clientWidth == 390` |
| Mobile 390 px `/dashboard` | BLOCKED — redirected to `/auth` (signed_out sandbox); auth page itself PASS |
| Mobile 390 px `/proof` | BLOCKED — redirected to `/auth`; auth page no overflow |
| Mobile 390 px `/onboarding` | BLOCKED — redirected to `/auth`; auth page no overflow |
| `npm run test` | NOT RUN (previous run: 271/271 passing) |
| `npm run lint` | NOT RUN |

## Not verified
- Authenticated dashboard/proof visual QA is BLOCKED:
  `LOVABLE_BROWSER_AUTH_STATUS=signed_out`, so Playwright cannot reach
  `/dashboard` or `/proof` behind the auth wall. Founder should sign in
  on the preview device so the next turn's Playwright pass can capture
  the three requested phone screenshots.
- Published site not re-published this turn.

## Remaining beta risks
- Advanced accordion is a single "Forecast, stats, diagnostics" bucket on
  mobile; if beta users find it too dense, split into three collapses
  (Forecast / Evidence / Audit) mapped to `DashboardForecastTabs` slots.
- Main JS bundle is 846 kB — acceptable for 5–10 person beta on 4G;
  code-split before wider release.
- On-device tap-through of the full authenticated loop still needs a
  real signed-in user for sign-off.

## Exact next move
1. Founder signs in on the preview to inject a Supabase session.
2. Re-run mobile screenshot pass on `/dashboard` and `/proof`.
3. If the advanced accordion feels dense, split into Forecast /
   Evidence / Audit collapses.
4. Publish preview → production once on-device sign-off passes.
