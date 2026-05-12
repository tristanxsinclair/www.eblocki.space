# EBLOCKI — Behavioural Performance OS (MVP)

## Stack mapping (platform reality)

Lovable runs **React 18 + Vite + TypeScript + Tailwind**, not Next.js App Router. I'll build the closest working equivalent:

| Spec | Built as |
|---|---|
| Next.js App Router pages | React Router routes (`/`, `/dashboard`, `/coach`, `/sheet`, `/proof`, `/modes`, `/settings`, `/auth`) |
| Next.js API routes | Supabase **Edge Functions** (`coach`, `score-proof`) |
| Supabase DB + Auth + RLS | **Lovable Cloud** (Supabase under the hood) |
| OpenAI Responses API | **Lovable AI Gateway** (`google/gemini-3-flash-preview` default; configurable in Settings). OpenAI key noted as optional integration point. |
| Vercel deploy | Lovable Publish |

All AI calls happen server-side in edge functions. No keys on client.

## Build phases

### 1. Foundation
- Enable Lovable Cloud (Supabase + Auth + Edge Functions)
- Design system: dark operator/command-center aesthetic — JetBrains Mono for data, Inter for body, deep slate background, electric lime accent for proof/evidence, amber for avoidance, red for missed. Semantic tokens in `index.css` + `tailwind.config.ts`. Evidence/state/mode badge variants.

### 2. Database (migration)
Tables exactly as specified: `profiles`, `daily_control_sheets`, `proof_artifacts`, `proof_commitments`, `coach_interactions`, `performance_os_config`. RLS on all (user owns rows). `handle_new_user` trigger creates profile + default config on signup. `app_role` enum + `user_roles` + `has_role` (security pattern).

### 3. Auth
Email/password + Google sign-in. `/auth` page. `useAuth` hook with `onAuthStateChange` set BEFORE `getSession`. Protected routes redirect to `/auth`.

### 4. Core libraries (`src/lib/eblocki/`)
- `modes.ts` — keyword router (LAW_MAX / PSYCH_HD / SALES_CLOSE / EBLOCKI / SPORT / BRAND / CAREER_MONEY / GENERAL_EXECUTION) with hybrid labels
- `states.ts` — behavioural state heuristic detector (locked_in, avoidant, overloaded, low_energy, hype_drift, recovery, momentum, scattered, academic_displacement, strategic_build)
- `proof-scoring.ts` — deterministic 1–10 scorer with per-domain heuristics → evidence strength (weak/moderate/strong/elite)
- `proof-contract.ts` — detects "serious action" verbs, builds Proof Contract object
- `system-prompt.ts` — exact Core Performance Architect prompt + per-mode framing

### 5. Edge functions
- `supabase/functions/coach` — accepts `{ message, recentContext, sheet, settings }`, calls Lovable AI with mode-specific system prompt + BLUF/Analysis/System/Upgrade structure, returns `{ mode, state, response, proofContract, proofQuestion }`. Auto-creates `proof_commitments` row when `auto_create_proof_contracts` is on AND seriousness ≥ threshold.
- `supabase/functions/score-proof` — runs deterministic scorer, optionally enriches feedback via AI, writes `quality_score`, `evidence_strength`, `feedback`, `next_upgrade`.
- Both: CORS, Zod validation, JWT verified in code, never trust client user_id.

### 6. Pages
- **Landing** (`/`) — hero "Convert ambition into measurable proof" + loop diagram + modes grid + Proof Contract explainer + CTA. SEO meta/H1/JSON-LD.
- **Dashboard** (`/dashboard`) — today's state, prime objective, pending Proof Contracts, week's completed proof, evidence-strength summary cards, quick check-in box, Next Controllable Action panel.
- **Coach** (`/coach`) — input → mode badge + state badge → structured response panel → Proof Contract card with "Commit" CTA → proof submission shortcut. Persists to `coach_interactions`.
- **Daily Control Sheet** (`/sheet`) — full form with all specified fields, end-of-day audit section, state selector, "Generate next action", "Create proof contract from prime objective".
- **Proof Dashboard** (`/proof`) — pending / completed / missed tabs, domain filters, evidence-strength chart, submit-proof modal, Court of Evidence section.
- **Modes** (`/modes`) — card per mode: purpose, what proof looks like, artifact types, sample prompt.
- **Settings** (`/settings`) — model picker, vector store ID, auto-create toggle, seriousness threshold slider, response structure toggle, strict verification toggle. Writes `performance_os_config`.

### 7. Components (`src/components/eblocki/`)
ModeBadge, StateBadge, EvidenceStrengthBadge, ProofContractCard, ProofArtifactForm, DailyControlSheetForm, CoachResponsePanel, PendingProofList, CompletedProofList, DashboardMetricCard, DomainFilter, EmptyState, LoadingState.

### 8. QA
- Verify mode router on sample inputs
- Verify scorer on weak/strong/elite samples
- Verify RLS via two-user mental check
- Mobile viewport check on dashboard + coach + sheet
- Build passes

## Out of scope for v1 (clearly marked as integration points)
- OpenAI Responses API direct (using Lovable AI Gateway instead — same pattern, swap in `coach` function when key supplied)
- Vector store / file_search (column kept, UI input kept, function reads but only used when ID present)
- Rich charting (using cards + simple bars; can upgrade to Recharts later)
- AGLC4 citation auto-formatting beyond prompt instruction

## Deliverable
A working, deployable, mobile-friendly Eblocki MVP meeting all 15 acceptance criteria, with the AI/auth/DB layers actually wired through Lovable Cloud — not stubbed.
