# Eblocki Behavioural Engine — Manual QA Checklist

Run this before any beta push. Each item should pass on the latest deployed build.

## 1. Objective completion
- [ ] Open Dashboard → tap an open mission → swipe right.
- [ ] Reflection dialog opens; submitting under 12 chars is rejected.
- [ ] After valid reflection, mission flips to completed; momentum score increases on refresh.
- [ ] Double-tap completion does NOT create a duplicate row (check Engine Debug → no DUPLICATE_OBJECTIVE warning).

## 2. Reflection validation
- [ ] Submit a 6-char "did it" reflection → blocked.
- [ ] Submit two identical 200-char reflections → second one still saves but EngineDebug flags `REFLECTION_DUPLICATE`.

## 3. Momentum scoring
- [ ] With zero proofs: score = 0, state = cold, streak = 0.
- [ ] With 7 strong-evidence proofs over 7 days: state in {momentum, elite}, score >= 60.
- [ ] With 7 low-quality proofs: score noticeably lower than the strong case.
- [ ] LAW_MAX mode + an IRAC paragraph proof increases avg quality vs no mode.

## 4. Coach escalation
- [ ] Send "I keep avoiding law" twice in Coach → second response is NOT verbatim.
- [ ] Third send of similar text → response prescribes a smaller physical action (e.g. "open the document and write only the issue section").
- [ ] EngineDebug → coach escalation reads `active` then `stuck (repeat detected)`.

## 5. Notification dedupe
- [ ] Manually invoke `notify-momentum` twice within 30 min for the same at-risk user → only one `notification_log` row inserted.
- [ ] After 2 notifications in 24h → EngineDebug shows `notif eligible: no — daily cap reached`.
- [ ] Before 09:00 / after 22:00 local: scanner emits zero notifications.

## 6. Weekly retro
- [ ] Fresh user: retro shows "No momentum data yet" sparkline message, NO fake "identity earned" copy.
- [ ] After 3+ completed reflections: strategic recommendation appears and references real signals.
- [ ] Pattern grid only renders when at least one cell has data.

## 7. No-data state
- [ ] Fresh user dashboard shows "Start here" intro card, no streak urgency, no fake analytics.
- [ ] MomentumPanel ring shows score 0 without crash.

## 8. Mobile touch behaviour (390×620 viewport)
- [ ] Mission swipe gesture works without scrolling the page.
- [ ] Hold-to-confirm timer fires after ~1.4s and is cancellable on pointer-up.
- [ ] Tooltips dismiss on tap-outside.

## 9. Admin debug panel
- [ ] Non-admin user navigating to `/dev/engine` is redirected to /dashboard.
- [ ] Admin sees populated stat grid + QA warnings list + recent notifications + recent coach outputs.

## 10. Privacy
- [ ] `analytics_events` rows for `objective_completed` contain ONLY whitelisted keys — no reflection text.
- [ ] `notification_log` payload contains the rendered notification text but NO user-typed content.