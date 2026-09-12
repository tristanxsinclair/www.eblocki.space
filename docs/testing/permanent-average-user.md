# Permanent Average-User Test Account

## Purpose

A reusable, environment-guarded, idempotent test account representing an average Eblocki user for:

- Manual product testing
- Playwright authenticated browser testing
- Mobile and desktop screenshot capture
- Proof submission and verdict rendering QA
- Coach, dashboard, settings, and billing UI testing
- Repeatable regression tests

## Persona

| Field | Value |
|-------|-------|
| Name | Alex Morgan |
| Age range | 18–22 |
| Context | First-year Australian university student |
| Plan | Free |
| Role | `user` (no admin) |
| Areas | University Study, Psychology |
| Proof count | 3 artifacts |
| Verdict distribution | 1 weak, 1 moderate, 1 strong |
| Commitments | 0 |
| Progression | Early-stage, no XP, no levels |
| Subscription | None (Free plan) |
| Founder access | No |
| Internal AI config | None |

## Required Environment Variables

| Variable | Purpose | Where to set |
|----------|---------|--------------|
| `SUPABASE_URL` | Project URL | `.env` or CI secrets |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin operations (seed only) | `.env` or CI secrets |
| `E2E_TEST_USER_EMAIL` | Test account email | `.env` or CI secrets |
| `E2E_TEST_USER_PASSWORD` | Test account password | `.env` or CI secrets |
| `E2E_ALLOW_TEST_USER_SEED` | Safety guard (must be `"true"`) | `.env` or CI secrets |
| `VITE_SUPABASE_URL` | Client URL (for Playwright auth) | `.env` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key (for Playwright auth) | `.env` |

### Security rules

- **Never** use `VITE_` prefix for `SUPABASE_SERVICE_ROLE_KEY`
- **Never** commit real values to source control
- **Never** seed in production (`NODE_ENV !== "production"` is enforced)
- Service-role key is used only by the seed script, never by client code

## Safe Setup

1. Copy `.env.example` to `.env`
2. Fill in your development/staging Supabase credentials
3. Choose a strong random password for the test account
4. Set `E2E_ALLOW_TEST_USER_SEED=true`

The seed script and authenticated Playwright fixture load `.env` automatically.
Do not export secrets manually unless you are running in CI.

## Commands

### Seed the test user

```bash
npm run test:user:seed
```

This creates or updates the Alex Morgan account idempotently. Safe to run multiple times — no duplicates.

### Run authenticated E2E tests (WP-003 QA)

```bash
npm run test:e2e:auth
```

### Reset the test user (re-seed from scratch)

```bash
npm run test:e2e:reset-user
```

### Run all E2E tests

```bash
npm run test:e2e
```

## Playwright Usage

### Fixture

Import the `averageUserPage` fixture in your test:

```typescript
import { test, expect } from "./fixtures/average-user-auth";

test("proof page renders verdict", async ({ averageUserPage: page }) => {
  await page.goto("/proof");
  // ...assertions
});
```

### How authentication works

1. The fixture signs in via `supabase.auth.signInWithPassword()` using the anon key
2. The session is injected into browser localStorage
3. Storage state is cached to `playwright/.auth/average-user.json` (gitignored)
4. Subsequent tests reuse the cached state if fresh (<30 minutes)
5. No UI navigation is required — but real Supabase Auth is used

### Storage state

- Path: `playwright/.auth/average-user.json`
- Gitignored: ✅
- Auto-refreshes after 30 minutes
- Contains session tokens — never commit

## Security Boundaries

| Boundary | Implementation |
|----------|---------------|
| No production seeding | `NODE_ENV` check + URL pattern detection |
| Explicit opt-in | `E2E_ALLOW_TEST_USER_SEED === "true"` required |
| No service-role in client | Key never prefixed with `VITE_` |
| No admin role | Script verifies and refuses if admin exists |
| No paid entitlement | Script removes any subscriptions |
| RLS respected | Auth uses real sign-in, not service-role bypass |
| Tokens not committed | `playwright/.auth/` is gitignored |

## Staging/Development Requirement

The seed script refuses to run if:

- `NODE_ENV === "production"`
- `E2E_ALLOW_TEST_USER_SEED !== "true"`
- The Supabase URL contains `prod` or `live.`

Only run against development or staging Supabase projects.

## Troubleshooting

### "SEED ABORT: E2E_ALLOW_TEST_USER_SEED is not 'true'"

Set `E2E_ALLOW_TEST_USER_SEED=true` in your environment or `.env` file.

### "E2E auth failed: Invalid login credentials"

The test user hasn't been seeded yet. Run `npm run test:user:seed` first.

### "No session returned"

Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env` match the project where the user was seeded.

### Tests skip with "E2E test credentials not configured"

Set `E2E_TEST_USER_EMAIL` and `E2E_TEST_USER_PASSWORD` in your environment.

### Stale auth state

Delete `playwright/.auth/average-user.json` to force re-authentication.

## How to Rotate Credentials

1. Update `E2E_TEST_USER_PASSWORD` in your `.env` / CI secrets
2. Run `npm run test:user:seed` — the script updates the password in Supabase
3. Delete `playwright/.auth/average-user.json`
4. Run tests to verify the new credentials work

## How to Disable the Account

1. Delete the user from Supabase Auth dashboard
2. Or use Supabase Admin API: `supabase.auth.admin.deleteUser(userId)`
3. The seed script will recreate it on next run unless credentials are removed

## How to Inspect Seeded Data

Using Supabase Dashboard:

1. Go to Authentication → Users → find the test email
2. Go to Table Editor → `profiles` → filter by user ID
3. Go to Table Editor → `proof_artifacts` → filter by user ID
4. Go to Table Editor → `user_onboarding_profiles` → filter by user ID
5. Go to Table Editor → `user_modes` → filter by user ID

Using the seed script output:

The script prints the user ID and summary on completion.
