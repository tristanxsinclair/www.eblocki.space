# Personal Evidence Twin execution roadmap

This roadmap is gated. A later work package cannot begin until every earlier gate is recorded as `PASS` with an evidence receipt.

| Work package | Scope | State | Evidence |
| --- | --- | --- | --- |
| WP0 | Production Truth Gate | **BLOCKED** | [WP0 production truth receipt](./wp0-production-truth-receipt.md) |
| WP1 | Product Compression | NOT STARTED | Blocked by WP0 |
| WP2 | Evidence Inbox / Provenance | NOT STARTED | Blocked by WP0 |
| WP3 | Capability Graph | NOT STARTED | Blocked by WP0 |
| WP4 | Intervention Ledger | NOT STARTED | Blocked by WP0 |
| WP5 | Temporal Calibration | NOT STARTED | Blocked by WP0 |
| WP6 | Human Evidence Twin Beta | NOT STARTED | Blocked by WP0 |

WP0 was reverified after PR #111 merged to main at `93b118ca8e349e83cb17fc8fd1cdf2975fd142d3` and Lovable canonical production was manually republished. Live build identity now matches main. WP0 remains blocked because production Supabase/Edge alignment and the authenticated non-duplicating settlement loop are unobserved.

## Gate rule

WP0 may pass only when repository identity, build identity, canonical production publication, production Supabase/runtime alignment, and one authenticated non-duplicating evidence-settlement loop have all been observed. Local source, tests, CI, or a public page load alone cannot satisfy the gate.
