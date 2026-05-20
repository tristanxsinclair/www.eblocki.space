## Eblocki OS — Compound Level Engine

This is a substantial build. Shipping it in one pass would produce shallow surface UI without the underlying engine. I'll execute in three phases. **This plan covers Phase 1 only** — the core XP/Level engine + Court of Evidence + Operator dashboard. Phases 2–3 listed at the end for separate approval.

---

### Phase 1 — Scope (this round)

**1. Database**
- `xp_events` — append-only ledger (proof_id, domain, tier, quality, base_xp, quality_mult, streak_mult, pressure_mult, final_xp, verdict, created_at)
- `domain_levels` — per-user × per-domain: xp, level, rank, current_standard, next_requirement
- `operator_level` — per-user: total_xp, level, rank, title
- `identity_ledger` — permanent entries (kind: compound | escalation | rejection, domain, summary, proof_id)
- `court_verdicts` — proof_id → verdict + reasoning
- Extend `proof_artifacts`: `proof_tier` (1–6), `pressure_flag`, `transfer_flag`
- Postgres trigger on `proof_artifacts` insert → score, judge, write xp_event, update levels, write ledger entry. All math server-side (no client tampering).

**2. Pure engine — `src/lib/eblocki/level-engine.ts`**
- `classifyTier(proof)` → 1–6 from domain markers + flags + content depth
- `scoreQuality(proof)` → 1–5 (wraps existing proof-scoring, normalized)
- `judgeCourt(proof, tier, quality)` → `rejected | min | useful | strong | elite` + reasoning (rules-based; LLM Phase 3)
- `computeXP({tier, quality, streakDays, pressureFlag, transferFlag, verdict})`
- `levelThreshold(level)` — exponential (100, 175, 250, 400, 600, …)
- `rankFor(level)` + `domainRankFor(domain, level)`
- `detectSelfDeception(recentProofs)` — duplicate, vague, planning>evidence
- Mirrored as Postgres function so trigger and client stay deterministic

**3. UI surfaces**
- New page `/operator` — Operator Level ring + XP bar + rank/title + 7-domain grid (each: level ring, XP, rank, current standard, next requirement)
- `LevelRing.tsx` — animated SVG ring with glow stroke
- `LevelUpOverlay.tsx` — restrained tactical animation (glow lines, grid pulse, no confetti), triggered via portal
- `IdentityLedger.tsx` — chronological feed of compound evidence / rejections
- `CourtVerdictBadge.tsx` — shown on proof artifacts
- Extend `ProofCapture.tsx` — show predicted tier + court verdict + final XP after submit
- Extend `Sheet.tsx` header — Operator Level chip next to Momentum

**4. Domain set**
Seven: `law, psychology, sales, soccer, finance, eblocki, life`. Map existing domain strings; add new enums.

**5. Anti-gaming**
- Content-hash duplicate detection within 7d → court rejects
- Quality<3 + no domain markers → rejected, 0 XP
- >5 same-domain proofs/day → diminishing returns (0.5x, then 0.25x)

**6. Tests**
- `level-engine.test.ts` — tier classification, XP math, thresholds, multipliers, self-deception
- `court.test.ts` — verdict rules

---

### Out of scope (later phases, separate approval)

- **Phase 2:** Pressure XP wired to state detection, Prestige unlocks + UI, behavioural heatmaps, compound growth graphs, intervention engine integration with Operator state
- **Phase 3:** LLM Court of Evidence (for ambiguous verdicts), Real Economy Integration (revenue / marks / fitness / sleep ingestion), externally-validated transfer proof flow

---

### Technical notes
- XP math runs in Postgres trigger → tamper-proof
- `xp_events` append-only → levels recomputable from event log
- Animations: existing `motion-calm` + framer-motion. No sound, no confetti.
- Tokens: add `--xp-glow`, `--rank-line` to `index.css`. Dark mode only.

### Files
**New:** 1 migration, `level-engine.ts`, `court.ts`, `Operator.tsx`, `LevelRing.tsx`, `LevelUpOverlay.tsx`, `IdentityLedger.tsx`, `CourtVerdictBadge.tsx`, 2 tests
**Edited:** `ProofCapture.tsx`, `Sheet.tsx`, `App.tsx` (route), `index.css` (tokens)

Approve to start Phase 1.