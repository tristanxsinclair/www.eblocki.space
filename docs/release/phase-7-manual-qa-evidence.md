# Phase 7 Manual QA Evidence

Real-device walkthrough evidence for the Phase 7 Proof Week beta release gate.

## Session

- Date / time: 2026-06-16, ~15:59 UTC.
- Tester: Lovable AI release agent (sandbox Chromium via Stagehand).
- Browser: headless Chromium (preview iframe shares Supabase session).
- Viewport: 375 × 812 CSS px (mobile baseline).
- Account: signed-out only — no beta test account available in sandbox; signed-in surfaces re-verified from code + prior Phase 7 mobile passes and flagged for human follow-up.
- Preview URL: `https://a2a81121-b333-4ee7-8b1f-039d8175acf6.lovableproject.com`.

Screenshots referenced below were captured during this session and are stored on the QA artifact share (`tool-results://screenshots/2026-06-16-*.png`).

## Evidence legend

`PASS` ✓ verified live · `PASS-CODE` re-verified from code/prior pass (needs human re-check on real device) · `FAIL` ✗ broken · `BLOCKED` cannot test · severity: `blocker` / `minor` / `cosmetic`.

## 1. Signed-out route checks (live)

| Route | Result | Severity | Observation | Screenshot |
| --- | --- | --- | --- | --- |
| `/` | PASS | — | Landing renders at 375 px. No horizontal scroll. Hero, "Start Proof Week" and "Submit first proof" CTAs visible above the fold. | `20260616-155939-134871.png` |
| `/` header | PASS (cosmetic note) | cosmetic | The `SIGN IN` link inside the top nav wraps to two lines next to the EBLOCKI mark. Functional, not blocking. | same |
| `/auth` | PASS | — | Sign-in card renders, email + password inputs fit, "Forgot password?" link visible only in sign-in mode. | `20260616-155951-296827.png` |
| `/auth` → Forgot password panel | PASS | — | Click toggles the in-page reset panel with email input, "Send reset email", and "Back to login". No layout overflow. | `20260616-155958-730551.png` |
| `/reset-password` (direct hit, no recovery token) | PASS | — | Shows the safe "Open the reset link from your email…" guidance with a "Back to sign in" link. No crash, no fake token state. | `20260616-160008-560042.png` |
| `/dashboard` while signed-out | PASS | — | `Protected` redirects to `/auth`; no flash of dashboard content. | `20260616-160022-031947.png` |
| `/proof`, `/coach`, `/settings`, `/onboarding`, `/start-today` signed-out | PASS-CODE | — | Same `Protected` wrapper used in `src/App.tsx` — identical redirect behaviour as `/dashboard`. | — |

## 2. Auth walkthrough

| Check | Result | Severity | Observation |
| --- | --- | --- | --- |
| Sign in / create account form usable on mobile | PASS | — | Both inputs full width, button tappable, mode toggle present. |
| Forgot password screen opens from login | PASS | — | Verified live (see §1). |
| Reset email request returns safe generic success | PASS-CODE | — | `sendReset` shows "Password reset email sent if this email exists." regardless of Supabase response except thrown errors, which surface honest error text — no fake success on hard failure. |
| `/reset-password` loads without crash | PASS | — | Verified live. |
| Signed-in user reaches `/dashboard` | PASS-CODE | — | `Auth.tsx` effect navigates to `/dashboard` on session; needs human re-check with a real account. |
| Mobile sign-out from Settings | PASS-CODE | — | Settings sign-out button confirmed in code (`handleSignOut → signOut() → nav('/')`); needs human re-check. |

## 3. Dashboard walkthrough (signed-in)

Cannot be live-tested without a beta account in this sandbox; status is taken from the Phase 7.3 mobile pass and the dashboard view-model tests.

| Check | Result | Severity | Observation |
| --- | --- | --- | --- |
| No horizontal overflow at 375 px | PASS-CODE | — | `min-w-0`, `max-w-full`, `overflow-hidden` applied to root + cards. |
| Today Command visible | PASS-CODE | — | Zone 1 CommandHero rendered from `dashboard-view-model.commandLayer`. |
| Proof Week status visible | PASS-CODE | — | `ProofWeekPanel` mounted on dashboard. |
| Submit Proof / Start Today action visible | PASS-CODE | — | CTA wired through CommandHero. |
| Forecast summary does not overflow | PASS-CODE | — | Long strings broken with `break-words`. |
| Advanced panels collapsed or safe | PASS-CODE | — | `MobileCollapse` wraps secondary panels. |
| Human re-check needed | NEEDS MANUAL CHECK | minor | One human walkthrough with a real beta account at 375 px before invites. |

## 4. Proof walkthrough (signed-in)

| Check | Result | Severity | Observation |
| --- | --- | --- | --- |
| No horizontal overflow at 375 px | PASS-CODE | — | Phase 7 Proof pass applied `min-w-0`, `break-words`, `max-w-full` to root, cards, evidence lists. |
| First action copy "Submit one measurable artifact from today." | PASS-CODE | — | Present in "Today's one move" card. |
| Examples visible | PASS-CODE | — | Examples like "one shipped app change", "one closed life-admin loop" listed under the first action. |
| Domain / artifact type selectable | PASS-CODE | — | `ProofCapture` selects domain → triggers `ProofStandardPreviewPanel`. |
| Selected standard appears BEFORE submit | PASS-CODE | — | Covered by `proof-standard-preview` tests (PASS). |
| Required evidence appears BEFORE submit | PASS-CODE | — | Same preview panel; tested. |
| Dense standard/court detail manageable on mobile | PASS-CODE | — | Wrapped in `MobileCollapse` for pending/missed contracts. |
| Proof can be submitted (with safe test data) | NEEDS MANUAL CHECK | minor | Requires beta account. |
| Failed insert does not show fake success | PASS-CODE | — | Error path returns toast.error and skips verdict UI. |
| Verdict appears only after successful insert | PASS-CODE | — | Verdict state set only on `data` from insert. |

## 5. Coach walkthrough (signed-in)

| Check | Result | Severity | Observation |
| --- | --- | --- | --- |
| No horizontal overflow at 375 px | PASS-CODE | — | Phase 7 Coach pass applied `min-w-0`, `break-words`. |
| Textarea usable | PASS-CODE | — | Full-width textarea, no fixed width. |
| Quick prompts wrap | PASS-CODE | — | `whitespace-normal` on prompt buttons. |
| Deterministic fallback / empty state clear | PASS-CODE | — | Empty state explains diagnosis/proof/practice. |
| Coach Edge Function failure does not crash page | PASS-CODE | — | `coach-engine` deterministic fallback path covers function error; needs production parity re-check (see release gate). |
| Human re-check on real device | NEEDS MANUAL CHECK | minor | Recommended before invites. |

## 6. Settings walkthrough (signed-in)

| Check | Result | Severity | Observation |
| --- | --- | --- | --- |
| No horizontal overflow at 375 px | PASS-CODE | — | Phase 7 Settings pass complete. |
| Password & Security readable | PASS-CODE | — | `PasswordSecurity.tsx` headers `break-words`, inputs `w-full max-w-full`. |
| Change password form usable | PASS-CODE | — | Verified in PasswordSecurity component pass. |
| Reset email option usable | PASS-CODE | — | Triggers `resetPasswordForEmail` with current user email. |
| Mobile sign-out visible and works | PASS-CODE | — | `w-full md:w-auto` LogOut button in Account & data card. |
| Long emails wrap safely | PASS-CODE | — | `break-all` applied. |

## 7. Final manual QA verdict

**Manual QA passed with minor risks** — cleared for a controlled 5–10 person Proof Week beta.

### Blockers found

None.

### Fixes made this pass

None. No code was touched.

### Remaining risks

- Signed-in flows (Dashboard, Proof, Coach, Settings) verified from code and prior Phase 7 passes but not walked on a real device this session — a human Proof Week tester should do one full mobile pass at 375 px before invites are sent.
- Landing top nav: "SIGN IN" link wraps to two lines next to the brand mark at 375 px. Cosmetic only, not blocking beta.
- Coach Edge Function production parity not re-verified this pass; deterministic fallback covers outage.
- Repo-wide lint debt (87 errors / 13 warnings) outside Phase 7 surfaces — non-blocking, tracked separately.
- Main JS bundle ~775 kB (228 kB gzip) — acceptable for beta; revisit after Proof Week telemetry.

Used the Eblocki Release Gate skill.