# Proof UI Consistency Checklist

Quick manual + automated pass to confirm every proof-related surface routes through the Monolithic Precision design tokens after the refactor. Run this alongside `bun run test` before shipping any change that touches a proof component.

## Scope

Components in scope (all proof-adjacent surfaces):

- `src/components/eblocki/ProofCapture.tsx`
- `src/components/eblocki/ProofClosureCard.tsx`
- `src/components/eblocki/ProofContractCard.tsx`
- `src/components/eblocki/ProofStandardPreviewPanel.tsx`
- `src/components/eblocki/ProofWeekPanel.tsx`
- `src/components/eblocki/Badges.tsx` (StateBadge, EvidenceStrengthBadge, ModeBadge)
- `src/components/eblocki/CourtVerdictBadge.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Proof.tsx`
- `src/pages/ProofWeek.tsx`

## Token rules (must hold everywhere in scope)

1. **No hardcoded colors.** No `text-white`, `text-black`, `bg-white`, `bg-black`, `bg-slate-*`, `bg-gray-*`, `bg-zinc-*`, `text-slate-*`, `text-gray-*`, `text-zinc-*`, or arbitrary hex like `bg-[#…]` / `text-[#…]`. Use semantic tokens: `bg-background`, `bg-card`, `bg-muted`, `bg-primary`, `text-foreground`, `text-muted-foreground`, `text-primary`, `border-border`, `border-primary/40`, etc.
2. **No purple/indigo/violet.** No `*-purple-*`, `*-indigo-*`, `*-violet-*`, `*-fuchsia-*`. The palette is Terminal Green + neutral surfaces.
3. **Radius rhythm.** Top-level cards use `rounded-2xl`. Nested cells/rows use `rounded-xl`. Pills/badges use `rounded-full`. Small chips may use `rounded-sm` when they intentionally read as terminal tags (e.g. `CourtVerdictBadge`).
4. **Typography.** Eyebrows/labels: `text-[10px] font-semibold uppercase tracking-[0.16em]` (or `0.2em` for hero eyebrows). No `font-mono` on general labels — reserve `font-mono` for terminal-tag chips and code. Numeric stats use `tabular-nums`.
5. **Spacing rhythm.** Card padding `p-5` (or `p-6` on hero). Vertical stacks use the `6 / 5 / 4 / 3` gap ladder (`space-y-6`, `gap-5`, etc.).
6. **Motion.** Hover/press transitions use the shared `motion-hover` utility. Card mounts use 200–300ms ease-out. No sparkle/confetti.
7. **State pills.** Every status/strength/verdict pill renders as `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1` with the semantic tone class from its badge component. Do not inline new pill styles — extend the badge component instead.
8. **Empty/pending states.** Dashed panel: `rounded-2xl border border-dashed border-border bg-card/40 p-5 text-center`. No emoji-heavy placeholder copy.

## Manual checklist (5 min)

On `/dashboard`, `/proof`, and `/proof-week`, mobile 390pt:

- [ ] Background reads near-black (`hsl(220 13% 5%)`), not pure `#000`.
- [ ] Accent green matches `hsl(142 72% 56%)` on primary CTA + live pings.
- [ ] All eyebrows are sans-serif small-caps, not `font-mono`.
- [ ] Every pill is fully rounded and uses tonal border + tint background.
- [ ] Cards align on the same 2xl radius; nested rows on xl.
- [ ] Empty states use the dashed panel treatment (no full-color card).
- [ ] No purple / indigo / white / raw-black artifacts visible anywhere.
- [ ] Tap targets ≥ 44px on primary CTAs.

## Automated checks

- `bun run test` — runs the Vitest suite including `src/lib/eblocki/__tests__/proof-ui-tokens.test.ts`, which scans the components above for forbidden classes.
- `bun run test src/pages/__tests__/Dashboard.test.tsx` — snapshot of the verdict identity hint.
- Playwright visual regression (`tests/e2e/system-forge-visual.spec.ts`) — element-level baselines for verdict + reps list. Update with `bun run test:e2e:update` after an intentional visual change.

## Updating after an intentional design change

1. Update the token in `src/index.css` (never inline the new color in a component).
2. Re-run the checklist above.
3. Refresh Playwright baselines: `bun run test:e2e:update`.
4. Note the change in this file's revision log.

## Revision log

- 2026-07-09: Initial checklist after Monolithic Precision token refactor of proof surfaces.