# Proof Week Feedback Plan

For the first 5–10 testers. Capture is intentionally lightweight — paper/CSV is fine. The product also writes `verdict_feedback` rows to `interest_signals` via the Proof page control.

## Per-tester template

- Name / handle:
- Contact (email or DM):
- Day completed (1–7):
- Did they submit at least one proof artifact today? (yes / no)
- Time to first proof (minutes):
- What was confusing in the flow?
- Most useful feature:
- Least useful feature:
- Would they return tomorrow? (yes / no / maybe)
- Would they pay for this? (yes / no / maybe)
- Preferred price (AUD/month) if yes:
- One direct quote / piece of evidence:

## Aggregation

At end of Week 1:

- Day-1 to Day-7 retention curve.
- % of testers who submitted ≥3 artifacts.
- Top 3 confusion points.
- "Would pay" count and median price.
- Decision: continue beta / pivot copy / pivot proof loop / pause.

## Where signals already land in-product

- `interest_signals.signal_type = 'proof_week_join'` — joined Proof Week.
- `interest_signals.signal_type = 'verdict_feedback'` — yes / kind_of / no on a verdict, with optional note.
- `interest_signals.signal_type = 'pro_waitlist' | 'founder_waitlist' | 'would_pay'` — payment intent (existing).

## Anti-self-deception rules

- A vague "I love it" does not count as validation. Look for: retention, repeated proof submissions, willingness to pay, specific confusion fixed in v2.
- A single power-user does not validate the wedge — track the median tester, not the favourite.
- If <50% complete Day 1 within 10 minutes, the onboarding copy is the blocker, not the engine.