# Phase 7.2 — Beta QA Checklist

Run before declaring beta-release credibility.

## Mobile (375px)
- [ ] Landing readable, hero CTA visible
- [ ] Proof Week page readable, day cards stack cleanly
- [ ] Proof form readable, all inputs reachable
- [ ] Verdict cards readable (split layout, no overflow)
- [ ] Feedback buttons tappable (>=44px)
- [ ] Dashboard shows one primary CTA above the fold
- [ ] Coach link reachable from verdict action row
- [ ] No horizontal overflow on any route

## Desktop
- [ ] Landing CTA navigates correctly
- [ ] Proof Week CTA navigates to Proof with context
- [ ] Proof submission writes to Supabase and returns verdict
- [ ] Verdict action row links (Coach, Dashboard, Continue) all work
- [ ] Dashboard primary CTA works

## User loop
- [ ] Signed-out user clicking Proof Week → /auth, then returns to /proof-week
- [ ] Onboarded user → Proof Week → Submit Proof (context passes via query)
- [ ] Proof submitted → verdict shown (no fake success on insert failure)
- [ ] Feedback submitted → confirmation, row in `interest_signals.note`
- [ ] Verdict → Coach link opens Coach with relevant context
- [ ] Verdict → Dashboard link returns user safely
- [ ] Dashboard → Continue Proof Week resumes correct day

## Release safety
- [ ] No secrets in client/source
- [ ] No service role key referenced client-side
- [ ] Feedback writes to existing `interest_signals.note` column (not `notes`)
- [ ] No new schema migrations required
- [ ] No new dependencies added
- [ ] No therapy/medical/legal/guaranteed-outcome claims in copy

## Automated checks (verified Phase 7.2)
- `npx vitest run` → 148 passed / 21 files
- coach-engine: 9 passed
- proof-scoring: 4 passed
- proof-week: 7 passed
- proof-standard-preview: 6 passed
- dashboard-view-model: 7 passed