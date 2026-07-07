# Phase 8A/8B Mobile Proof Loop

## Phase 8B - Authenticated Mobile Release Proof

Date/time: `2026-07-07 12:43:34 AWST`

Latest authenticated update: `2026-07-07 12:54:00 AWST`

Environment:

- Repo: `/Users/tristansinclair/Desktop/www.eblocki.space`
- Branch: `codex/recover-proof-check-mcp-main`
- Local app: `http://127.0.0.1:8080/`
- Stack observed: React 18, Vite, TypeScript, React Router, Tailwind/shadcn UI, Supabase client, PostHog analytics, Capacitor dependencies
- Browser path: `BLOCKED` for in-app Browser plugin. Localhost navigation timed out twice and reset the browser automation session.
- Fallback browser path: local Playwright Chromium, headless, viewport `390x844`
- Authenticated Codex path after email confirmation: `PASS` via local Playwright Chromium at `390x844`

### Files Inspected

- `package.json`
- `vite.config.ts`
- `vitest.config.ts`
- no `playwright.config.*` file present
- `src/App.tsx`
- `src/main.tsx`
- `src/index.css`
- `src/pages/Dashboard.tsx`
- `src/pages/Proof.tsx`
- `src/pages/Onboarding.tsx`
- `src/pages/Auth.tsx`
- `src/pages/StartToday.tsx`
- `src/components/eblocki/AppShell.tsx`
- `src/components/eblocki/ProofStandardPreviewPanel.tsx`
- `src/components/eblocki/WeeklyRetro.tsx`
- `src/components/eblocki/IdentityLedger.tsx`
- `src/components/eblocki/MobileBottomNav.tsx`
- `src/lib/eblocki/`
- `src/hooks/`
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `supabase/migrations/`
- `docs/release/mobile-beta-readiness-proof.md`

Named files from the brief that are not present in this checkout:

- `src/components/eblocki/ProofClosureCard.tsx`
- `src/components/eblocki/CommandLayerCard.tsx`
- `src/components/eblocki/SentinelPanel.tsx`

### Files Changed

- `docs/release/phase-8a-mobile-proof-loop.md`
- `docs/release/screenshots/phase-8b/root-mobile.png`
- `docs/release/screenshots/phase-8b/auth-mobile.png`
- `docs/release/screenshots/phase-8b/dashboard-mobile-top.png`
- `docs/release/screenshots/phase-8b/dashboard-mobile-lower.png`
- `docs/release/screenshots/phase-8b/proof-mobile.png`
- `docs/release/screenshots/phase-8b/onboarding-mobile.png`
- `docs/release/screenshots/phase-8b/start-today-mobile.png`
- `docs/release/screenshots/phase-8b/user-authenticated/*.jpg`
- `docs/release/screenshots/phase-8b/codex-authenticated/*.png`

No additional mobile layout patch was needed during the Phase 8B authenticated overflow pass because the Codex-observed 390px run did not find horizontal overflow.

### Auth Status

Status: `PASS`

- Existing local/browser auth session: `BLOCKED`. Local Playwright had no Supabase auth keys in localStorage. The in-app Browser plugin could not complete localhost navigation, so no existing in-app authenticated session could be inspected.
- Local Supabase/dev test account: `BLOCKED`. No documented local test account or approved credentials were found. Only publishable Supabase client configuration was present.
- Production/test data write: `NOT RUN`. No proof submission was attempted because there was no approved authenticated test session and no instruction to create or use production test data.
- Update after Tristan confirmed the email: a personal testing account signed in successfully through the app UI. Account email and user id are intentionally redacted from this public release note.

Credential/session status:

- `PASS`: confirmed account was available and used for Codex-observed authenticated QA.

### Routes Tested

Viewport: `390x844`

| Route requested | Final route | Accessible target route | Signed-in required | scrollWidth | clientWidth | Horizontal overflow | Status | Screenshot | Notes |
| --- | --- | --- | --- | ---: | ---: | --- | --- | --- | --- |
| `/` | `/` | yes | no | 390 | 390 | no | `PASS` | `docs/release/screenshots/phase-8b/root-mobile.png` | Public landing rendered. |
| `/auth` | `/auth` | yes | no | 390 | 390 | no | `PASS` | `docs/release/screenshots/phase-8b/auth-mobile.png` | Auth screen rendered. |
| `/dashboard` | `/auth` | no | yes | 390 | 390 | no | `BLOCKED` | `docs/release/screenshots/phase-8b/dashboard-mobile-top.png` | Protected route redirected to auth. |
| `/proof` | `/auth` | no | yes | 390 | 390 | no | `BLOCKED` | `docs/release/screenshots/phase-8b/proof-mobile.png` | Protected route redirected to auth. |
| `/onboarding` | `/auth` | no | yes | 390 | 390 | no | `BLOCKED` | `docs/release/screenshots/phase-8b/onboarding-mobile.png` | Protected route redirected to auth. |
| `/start-today` | `/auth` | no | yes | 390 | 390 | no | `BLOCKED` | `docs/release/screenshots/phase-8b/start-today-mobile.png` | Protected route redirected to auth. |

Console status:

- `PASS` for no app runtime errors during the 390px route sweep.
- `WARN` only for React Router v7 future flag warnings.

### Layout Findings

Status: `BLOCKED` for authenticated mobile release proof.

Known from code inspection:

- `Protected` in `src/App.tsx` redirects signed-out users to `/auth` and preserves the requested path in `state.from`.
- `AppShell` uses `max-w-full`, `overflow-x-hidden`, `min-w-0`, a mobile brand bar, and a fixed mobile bottom nav.
- `src/index.css` has a body/root horizontal overflow safety rail and utility classes for mobile-safe pages/cards and breakable text.
- `Dashboard` keeps the proof/command gate above diagnostics and exposes `Submit Proof` before secondary panels.
- `Proof` keeps the submission form reachable, uses responsive grids, and wraps proof standard/verdict content.
- `Onboarding` uses a single-column mobile flow with sticky bottom actions.

Not proven:

- Authenticated `/dashboard` visual layout at 390px.
- Authenticated `/proof` form layout and proof standard preview at 390px.
- Authenticated `/onboarding` profile flow at 390px.
- Dashboard lower/advanced authenticated diagnostics at 390px.

### Proof Submission Smoke Test

Status: `PASS`

- Codex submitted one marked proof artifact through the app UI: `Phase 8B mobile QA test proof artifact`.
- Supabase readback using the authenticated test user confirmed the inserted proof row.
- Inserted proof id: `241e6f28-bee4-4a5d-902e-b7a9f4fdd7eb`.
- Result: `evidence_strength=strong`, `quality_score=8`, `artifact_type=product system review`.
- Verdict rendered on `/proof`.
- Dashboard loaded after submission and showed the next proof command.
- `/start-today` loaded after proof and showed planning unlocked.

### Codex-Observed Authenticated Mobile QA

Status: `PASS` with residual console risk.

Date/time: `2026-07-07 12:54:00 AWST`

Account:

- Personal test account confirmed by Tristan.
- Account email and user id are intentionally redacted from this public release note.

Viewport: `390x844`

| Checkpoint | Final route | scrollWidth | clientWidth | Horizontal overflow | Status | Screenshot |
| --- | --- | ---: | ---: | --- | --- | --- |
| After sign-in | `/dashboard` | 390 | 390 | no | `PASS` | `docs/release/screenshots/phase-8b/codex-authenticated/after-sign-in.png` |
| Onboarding initial | `/onboarding` | 390 | 390 | no | `PASS` | `docs/release/screenshots/phase-8b/codex-authenticated/onboarding-initial-authenticated.png` |
| Onboarding confirmation | `/onboarding` | 390 | 390 | no | `PASS` | `docs/release/screenshots/phase-8b/codex-authenticated/onboarding-confirm-authenticated.png` |
| After onboarding save | `/welcome` | 390 | 390 | no | `PASS` | `docs/release/screenshots/phase-8b/codex-authenticated/after-onboarding-save.png` |
| After welcome skip | `/proof?first=1` | 390 | 390 | no | `PASS` | `docs/release/screenshots/phase-8b/codex-authenticated/after-welcome-skip.png` |
| Dashboard before proof | `/dashboard` | 390 | 390 | no | `PASS` | `docs/release/screenshots/phase-8b/codex-authenticated/dashboard-before-proof-authenticated.png` |
| Proof form and standard preview | `/proof` | 390 | 390 | no | `PASS` | `docs/release/screenshots/phase-8b/codex-authenticated/proof-form-filled-standard-preview.png` |
| Proof verdict after submit | `/proof` | 390 | 390 | no | `PASS` | `docs/release/screenshots/phase-8b/codex-authenticated/proof-verdict-after-submit.png` |
| Dashboard after proof | `/dashboard` | 390 | 390 | no | `PASS` | `docs/release/screenshots/phase-8b/codex-authenticated/dashboard-after-proof-authenticated.png` |
| Start Today after proof | `/start-today` | 390 | 390 | no | `PASS` | `docs/release/screenshots/phase-8b/codex-authenticated/start-today-after-proof-authenticated.png` |
| Onboarding reachable after auth | `/onboarding` | 390 | 390 | no | `PASS` | `docs/release/screenshots/phase-8b/codex-authenticated/onboarding-reachable-after-auth.png` |

Additional full-page screenshots:

- `docs/release/screenshots/phase-8b/codex-authenticated/proof-verdict-after-submit-full.png`
- `docs/release/screenshots/phase-8b/codex-authenticated/dashboard-after-proof-authenticated-full.png`

Observed flow:

- Auth sign-in succeeded after email confirmation.
- `/onboarding` was reachable and completed a minimal profile/mode setup.
- `/welcome` wrote `seen_welcome=true` and moved into first-proof flow.
- `/dashboard` before proof showed anti-avoidance command state and clear `Submit Proof` action.
- `/proof` normal route showed the proof form and selected standard preview.
- Proof submission succeeded and rendered `Proof Verdict`.
- `/dashboard` after proof showed the submitted proof, latest verdict, and a clear next action.
- `/start-today` after proof showed command layer active and planning unlocked.

Console status:

- `WARN`: React Router v7 future flag warnings.
- `ERROR`: two transient Supabase auth `TypeError: Failed to fetch` console errors were captured during the run. The flow continued, the proof insert was verified, and protected routes rendered, but this remains a residual network/auth-console risk to watch in production QA.

### User-Supplied Authenticated Screenshot Evidence

Status: `PASS` for manual visual evidence, `BLOCKED` for Codex-observed authenticated browser QA.

On `2026-07-07`, Tristan supplied ten authenticated mobile screenshots. These images are stored under:

- `docs/release/screenshots/phase-8b/user-authenticated/proof-verdict-counted-top.jpg`
- `docs/release/screenshots/phase-8b/user-authenticated/proof-verdict-details-mid-1.jpg`
- `docs/release/screenshots/phase-8b/user-authenticated/proof-verdict-details-bottom.jpg`
- `docs/release/screenshots/phase-8b/user-authenticated/dashboard-counted.jpg`
- `docs/release/screenshots/phase-8b/user-authenticated/dashboard-needs-upgrade-source-bank.jpg`
- `docs/release/screenshots/phase-8b/user-authenticated/dashboard-needs-upgrade-concrete.jpg`
- `docs/release/screenshots/phase-8b/user-authenticated/proof-submitted-toast.jpg`
- `docs/release/screenshots/phase-8b/user-authenticated/dashboard-counted-after-toast.jpg`
- `docs/release/screenshots/phase-8b/user-authenticated/proof-verdict-expanded-top.jpg`
- `docs/release/screenshots/phase-8b/user-authenticated/proof-verdict-expanded-mid.jpg`

Image dimensions:

- All ten supplied screenshots are `591x1280` image pixels.

Observed from the supplied screenshots:

- `/proof` authenticated verdict state is visible after proof submission.
- A submitted proof can show `Proof submitted` and `Counted`.
- Strong proof verdict copy is visible: `Strong evidence accepted - compounds identity.`
- Verdict details are readable across the scrolled proof screen: required evidence, missing standard, selected standard, scoring reason, elite version, proof contract completed, contract alignment, and standard/identity escalation.
- Feedback controls are visible: `Yes`, `Kind of`, `No`, plus optional feedback text area.
- Dashboard return state is visible after proof submission.
- Dashboard can show `Today closed` and `Your proof counted today.`
- Dashboard can also show `Today still open` when proof needs upgrade to count fully.
- Dashboard primary next actions are visible: `View proof` and `Improve proof`.
- Secondary dashboard sections are visible below the command card: `Proof Week` and `Advanced`.

Limits of this evidence:

- These screenshots were supplied by Tristan, not captured by Codex through an authenticated browser session.
- They do not include DOM-level `scrollWidth/clientWidth` measurements.
- Several screenshots include an external floating overlay on the right side that partially covers app text. This appears outside the Eblocki UI, but it reduces screenshot cleanliness.
- Some proof-detail screenshots are mid-scroll captures, so they prove readable content at those scroll positions but not full-page uninterrupted layout.
- No Codex-observed database insert, network response, auth session, or console state accompanies these screenshots.

Authenticated proof submission smoke status after this addendum:

- `PASS` for user-supplied visual evidence that a proof was submitted, received a counted verdict, and returned to dashboard next action.
- `BLOCKED` for Codex-observed proof submission smoke test.

### Command Results

| Command | Result | Notes |
| --- | --- | --- |
| `npm run dev -- --host 127.0.0.1 --port 8080` | `PASS` | Vite served `http://127.0.0.1:8080/`. |
| Local Playwright route sweep | `PASS` for public/auth route measurement, `BLOCKED` for protected targets | Screenshots captured under `docs/release/screenshots/phase-8b/`. |
| Authenticated Playwright proof loop | `PASS` | Account sign-in, onboarding, welcome, dashboard, proof standard preview, proof submission, verdict, dashboard return, and start-today were observed at `390x844`. |
| Supabase authenticated readback | `PASS` | Confirmed proof row `241e6f28-bee4-4a5d-902e-b7a9f4fdd7eb` for `Phase 8B mobile QA test proof artifact`. |
| `npm run build` | `PASS` | Built successfully. Non-blocking warnings: stale Browserslist data and `index-DoPOcEDM.js` chunk `839.27 kB` over 500 kB. |
| `npm run test` | `PASS` | `33` test files passed, `265` tests passed. Non-blocking warnings: Node `punycode` deprecation and React Router future flags. |
| `npm run lint` | `FAIL` | `55` errors and `15` warnings in pre-existing app/source/generated files. Phase 8B changed docs/screenshots only, so no lint cleanup was performed. |

### Remaining Risks

- In-app Browser plugin still could not complete localhost navigation; authenticated Codex proof used local Playwright instead.
- Two transient Supabase auth `Failed to fetch` console errors occurred during the authenticated run.
- Physical iPhone/Android browser QA is still recommended before broader beta invites.
- Existing lint failures remain outside this Phase 8B scope.
- Bundle chunk size remains above the Vite warning threshold.

### Release Verdict

`PASS`

Phase 8B authenticated mobile release proof is now `PASS` for Codex-observed local Playwright QA at `390x844`. The beta loop was observed from authenticated setup through dashboard command, proof standard preview, proof submission, verdict, dashboard return, and start-today next action with `scrollWidth <= clientWidth` at every measured checkpoint.

Release posture: Phase 8 can be marked release-proof strong for a controlled beta, with residual risks noted above.
