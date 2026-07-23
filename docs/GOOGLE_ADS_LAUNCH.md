# Eblocki — Google Ads Launch Playbook

## Objective
Drive qualified signups from Google Search → `/pricing` and `/` → Pro conversion.

## Conversion events (wire in Google Ads via gtag + PostHog)
- `sign_up` — user completes email verification
- `proof_submitted` — first proof artifact
- `pricing_view` — visits `/pricing`
- `checkout_started` — opens Stripe embedded checkout
- `checkout_completed` — subscription row `active` for user
- `founder_application_started` — visits `/founder`

Primary conversion for bidding: `checkout_completed`.
Secondary (micro): `sign_up`, `proof_submitted`.

## Landing page mapping
| Ad group | Landing page |
|---|---|
| Brand — "eblocki" | `/` |
| Proof / evidence-based study | `/` |
| Alternatives to Notion/Todoist/Habitica for students | `/pricing` |
| Anti-procrastination / stop fake productivity | `/` |
| Founder / early-adopter | `/founder` |

## Keyword themes
- proof based productivity app
- evidence based habit tracker
- study accountability system
- law student productivity app
- stop fake productivity
- daily proof of work app
- adaptive coaching student
- identity based habits app

## Negative keywords (baseline)
free, crack, torrent, download, jobs, careers, review reddit only, template, notion template, meme, tiktok

## Ad copy — variants
**Headlines (30 char max, mix and match)**
1. Stop Fake Productivity
2. Log Proof. Not Streaks.
3. Evidence-Based Study OS
4. The Anti-Todo-List App
5. Get Your Next Best Command
6. Verdict-Based Progress
7. Court of Evidence for Study
8. AUD $11.99/mo · Cancel Anytime

**Descriptions (90 char max)**
1. Submit one measurable proof. Get a verdict. Get the next command. Cancel anytime.
2. No streaks that lie. Just proof, verdict, and the next action that compounds.
3. Built for operators who want output, not aesthetic to-do lists. AUD $11.99/mo.

## UTM convention
`utm_source=google&utm_medium=cpc&utm_campaign=<campaign>&utm_content=<ad>&utm_term=<keyword>`

## Budget starter
- Week 1: $50 AUD/day cap, manual CPC, target Pro-only.
- Bid optimisation only after 30 `checkout_completed` events land.

## Compliance
- No guaranteed grades, income, therapy, or medical claims.
- All claims are behavioural / evidence-based, not outcome-guaranteed.
- Privacy + Terms linked from every landing page footer.

## Reality check
At AUD $11.99/mo, $1,000/week ≈ 84 net-new Pro subscribers. At an optimistic 3% landing→paid conversion rate, that requires ~2,800 relevant clicks/week — likely $500–$1,500 AUD ad spend depending on CPC. Product is ready; volume is a paid acquisition question.