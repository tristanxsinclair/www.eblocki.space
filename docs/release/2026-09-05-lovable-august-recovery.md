# Lovable August Recovery Receipt

**Date:** 2026-09-05
**Author:** Tristan Sinclair
**Snapshot name:** Fixed security findings
**Snapshot timestamp:** 2026-08-18 09:47 AM

## What was recovered

Lovable's historical preview was restored to the saved snapshot titled **"Fixed security findings"** from **August 18, 2026 at 09:47 AM**. That action did not materialise the full historical source tree in Git. The recovery branch therefore contains a bounded, source-reviewed recovery of the coherent product slice that could be extracted and verified independently.

The recovered and verified slice contains:

- **Personalised quest engine** — daily objectives derived from the operator's actual record, including resistance band calibration, correction obligations, next-upgrade execution, neglected-domain revival, and pressure escalation.
- **Hardened quest HUD** — the Game Master panel replaced by the deterministic Quest Director, with quest stages, escalation rules, and self-deception risk annotations.
- **Simplified sales landing copy** — "Stop fake productivity" messaging and clearer newcomer-facing proof loop explanation.

The following historical material is intentionally excluded:

- **Evidence-audit checkpoint UI and helpers** — the available HUD snapshot referenced `EvidenceIntegrityBanner`, `CheckpointDiffModal`, `useAuditCheckpoints`, and evidence-audit utilities that are absent from the current Git lineage. No placeholders or fake audit states were added.
- **Historical security migration** — the extracted migration depends on audit tables and functions from that missing lineage. Applying it alone would create schema drift or fail, so it is quarantined rather than shipped.
- **August 24 onboarding snapshot** — this later snapshot was incomplete and is not part of the recovery.

## Test status

Fresh verification of the bounded recovery on 2026-09-05:

- **398/398 Vitest tests passed** across 53 files.
- **4/4 public mobile Playwright tests passed**, covering overflow and evidence-settlement replay.
- **TypeScript passed** with `tsc --noEmit`.
- **Eblocki lint passed**; full lint reported 0 errors and 12 pre-existing warnings.
- **Production build passed**; the existing large-chunk warning remains.
- **Bundle budget passed** at 1561.5 KB JavaScript and 107.5 KB CSS.
- **17/17 route smoke checks returned HTTP 200**.
- **Desktop and mobile local visual inspection passed** for the landing and demo dashboard, with no observed console errors or horizontal overflow.

These results verify the public/local recovery slice. They do not verify authenticated Supabase persistence, a deployed build, or the complete proof → verdict → correction → second-attempt loop.

## Publication status

**Publication is intentionally withheld.**

Do not publish until:

1. The Git diff against the intended baseline has been reviewed.
2. The recovery branch passes protected-branch checks and is merged through the normal review path.
3. The merged revision is previewed or deployed with an identifiable build revision.
4. The authenticated proof → verdict persistence → correction → second-attempt loop is recorded against that revision.

## Recovery branch

**Lovable receipt branch:** `lovable/recover-august-system`

**Source recovery branch:** `codex/recover-august-system`

This branch exists to preserve and review the restored August system before any merge or publication.

## Purpose of this file

This document is the durable boundary and verification receipt for the recovery. It records what is present, what is deliberately absent, and the conditions under which the branch can be considered safe to publish.

---

*Do not delete this receipt until the post-restore verification is complete and the project has been re-published or explicitly archived.*
