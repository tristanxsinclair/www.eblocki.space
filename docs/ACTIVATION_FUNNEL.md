# Eblocki activation funnel

The activation measurement follows the product loop, not page views. Events are written through the existing privacy-safe analytics logger and never include artifact content, verdict text, correction text, email addresses, or attachment contents.

| Funnel step | Event | Trigger |
| --- | --- | --- |
| Account accepted | `activation_auth_completed` | Supabase accepts sign-up, or a user signs in successfully. `source` distinguishes the two. |
| Welcome started | `welcome_started` | The authenticated welcome flow renders. |
| Welcome completed | `welcome_completed` | Focus preferences are saved and the user is sent to `/proof?first=1`. |
| Artifact submission started | `activation_artifact_submission_started` | A valid first-proof or corrected-attempt form begins submission. |
| Artifact submitted | `activation_artifact_submitted` | The proof artifact insert succeeds. |
| Verdict viewed | `activation_verdict_shown` | A first-proof verdict is rendered. |
| Correction started | `activation_correction_started` | The user chooses `Submit corrected attempt` from the verdict. |
| Second attempt submitted | `activation_second_attempt_submitted` | A correction attempt creates its proof artifact successfully. |

Allowed properties are limited to stable routing and classification metadata such as `route`, `source`, `destination`, and `verdictStrength`. Free-text work and assessment content are intentionally dropped by the logger whitelist.
