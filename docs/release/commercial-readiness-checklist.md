# Commercial Readiness Checklist

Used before any phase that touches monetisation, recommendations, or paid access.

## Trust gates
- [ ] No recommendation is shown without a detected `UserNeedSignal`.
- [ ] Affiliate / sponsored / partner matches show a disclosure line.
- [ ] `recommendationsAllowed === false` fully suppresses recommendations.
- [ ] No-go categories from the operating profile are respected.
- [ ] Maximum one primary recommendation card per surface.

## Access model
- [ ] `AccessLevel` is read from a trusted source (Stripe webhook / profile flag).
- [ ] The client never grants Pro/Founder access on its own.
- [ ] Pro/Founder features are gated server-side as well, not just in UI.

## Analytics
- [ ] Only event names + whitelisted properties are sent.
- [ ] No free-text proof content, emails, or names are sent to analytics.
- [ ] Outcome events (`recommendation_outcome_logged`) exist before claiming
      a recommendation loop is "closed".

## Secrets
- [ ] No API keys committed to the repo.
- [ ] No service-role key referenced from client code.
- [ ] All third-party credentials live in Supabase Edge Function secrets.

## Build
- [ ] `npm run test` (or `bunx vitest run`) is green for new files.
- [ ] Touched files lint clean even when full repo lint has legacy debt.