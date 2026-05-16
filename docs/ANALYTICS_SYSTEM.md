# Analytics System

## Goals

1. Measure retention (D1, D7, D30, W4).
2. Measure proof-creation funnel (onboarding → first proof → verdict).
3. Detect churn signals (state drift, missed days).
4. Be provider-portable — never let one vendor own the schema.

## Architecture

```
   UI code  ──▶  track(EVENTS.x, props)  ──▶  PostHog       (cloud dashboards)
                                       │
                                       └▶   analytics_events (Supabase, RLS-owned)
```

Both sinks always fire. The Supabase sink is the source of truth for
in-app dashboards (mode usage, streak history) and a backup if we ever
swap the third-party provider.

## Setup

Add to your environment (workspace settings or `.env` for local dev):

```
VITE_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_POSTHOG_HOST=https://eu.i.posthog.com   # or us.i.posthog.com
```

PostHog "project API key" (the `phc_…` one) is safe to expose in client
code. The private personal API key is NOT used by this app.

## Event taxonomy

See `src/lib/analytics/events.ts` for the authoritative list. Naming
rules:

- `verb_noun`, lower_snake_case.
- Past tense for completed actions (`signup_completed`).
- Present tense for moments (`coach_message_sent`).
- Never rename a shipped event — add `_v2` if the meaning changes.

| Category | Events |
| --- | --- |
| Lifecycle | `app_opened`, `app_resumed`, `app_paused` |
| Auth | `signup_started`, `signup_completed`, `login_completed`, `logout_completed` |
| Onboarding | `onboarding_started`, `onboarding_step_completed`, `onboarding_completed` |
| Coach | `coach_message_sent`, `coach_response_received`, `coach_state_detected` |
| Proof | `proof_artifact_drafted`, `proof_artifact_submitted`, `proof_attachment_uploaded`, `proof_ocr_completed`, `proof_verdict_received` |
| Control sheet | `control_sheet_opened`, `control_sheet_saved` |
| Modes | `mode_activated`, `mode_deactivated` |
| Retention | `streak_continued`, `streak_broken` |
| Account | `account_deletion_requested`, `data_exported` |

## Properties to attach (recommended)

- `coach_message_sent` → `{ mode, state, character_count }`
- `proof_artifact_submitted` → `{ mode, domain, has_attachment, ocr_used }`
- `proof_verdict_received` → `{ score, evidence_strength, mode }`
- `streak_continued` → `{ length, days_since_first }`
- `streak_broken` → `{ length_lost, last_state }`

All events are auto-enriched with `platform` (ios | android | web) and
`session_id` (per browser/app session).

## Dashboards to build in PostHog

1. **Activation** — % of signups that complete onboarding within 24h.
2. **First proof** — time from `signup_completed` → first `proof_verdict_received`.
3. **D7 retention** — `app_opened` cohorted by signup week.
4. **State distribution** — frequency of each `coach_state_detected`.
5. **Mode adoption** — DAU per mode.
6. **Funnel: coach → proof** — `coach_message_sent` → `proof_artifact_submitted` within session.

## Switching providers

The PostHog adapter is contained in `src/lib/analytics/index.ts`. To
swap providers, replace the body of `initAnalytics()`, `identify()`,
`reset()`, and the `posthog.capture` call inside `track()`. The Supabase
sink stays put.

## Privacy

- PostHog `person_profiles: "identified_only"` — anonymous visitors
  do not create profiles.
- We do not capture autocapture, do not capture screen recordings.
- Users can request deletion of analytics rows via the Supabase export +
  delete flow (Settings → Account).