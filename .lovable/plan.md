## Goal

Adopt the user's exact wording correction — never claim "Eblocki has no security issues"; only claim "no active tool-reported findings remain after the latest remediation pass" — and produce artifact evidence to back the claim.

## Steps

### 1. Replace `@security-memory` with the user-supplied text
Call `security--update_memory` with the markdown block the user pasted (verbatim, including the "Important wording" caveat, resolved findings list, accepted-posture items, doctrine, and the "Next verification checkpoint" section).

### 2. Rerun the security scan and persist the artifact
- Call `security--run_security_scan` to get a fresh result.
- Call `security--get_scan_results` (force=true) to fetch the persisted list.
- Save both outputs to `.lovable/security-scan-result.md` next to `.lovable/plan.md`, timestamped, with:
  - Date of scan
  - Findings list (active, resolved, accepted)
  - 174/174 test pass reference
  - Explicit statement: "No active tool-reported findings remain after this remediation pass. This is not a claim of total security."

### 3. Mark any still-listed-as-open findings appropriately
For each finding in the fresh scan that maps to work already completed in the prior migration / edge-function pass, call `security--manage_security_finding` with `mark_as_fixed` and a one-line explanation pointing at the migration file or function. For `pg_net`-in-public and `has_role`-callable-by-authenticated, use `ignore` with the accepted-posture rationale from the memory.

### 4. Update `.lovable/plan.md`
Append a short "Security remediation pass — closed" footer pointing to `.lovable/security-scan-result.md` and the security memory. Do not restate findings inline.

### 5. Verification
- `npm run test` — expect 174/174.
- Re-read `.lovable/security-scan-result.md` and confirm the wording matches the doctrine (no "fully secure" / "no issues" phrasing).
- Final report lists: files changed, scan result counts (active / resolved / accepted), tests run with exact result, and explicit "next verification checkpoint" reminder for Proof Week beta gate.

## Out of scope
- New migrations or edge-function changes (the previous pass already shipped these).
- GDPR self-service for `suppressed_emails`.
- Moving `pg_net` out of `public`.
- Repo-wide lint cleanup.

## Technical notes
- Artifact path: `.lovable/security-scan-result.md` (chosen because `.lovable/` is already the release-gate folder containing `plan.md`).
- Wording rule enforced everywhere: "no active tool-reported findings remain after the latest remediation pass" — never "Eblocki is secure" or "no security issues".
- If the fresh scan surfaces a NEW finding not covered by the prior pass, stop and report it instead of marking fixed.
