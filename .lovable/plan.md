# Mobile Containment Plan — Eblocki

Narrow, shell-first fix. No proof, auth, billing, schema, or product logic changes. Desktop untouched.

## 1. Shared shell root causes

Reading `AppShell.tsx`, `MobileBottomNav.tsx`, `PaymentTestModeBanner.tsx`, `index.css`, and the routes:

- Root wrapper uses `min-h-screen-safe` built on `100vh`. iOS Safari + Capacitor mis-report `100vh` under the URL bar, producing top clipping.
- Mobile brand header is **static**, not sticky. It scrolls away, and any page that renders its own header (Pricing, Coach) has no safe-area offset and collides with the status bar.
- `PaymentTestModeBanner` is imported only inside `Pricing.tsx`. When it appears it is added *below* an already-drawn page header, so the header shifts and vertical rhythm breaks per route.
- `main` has hard `pb-24` (96 px). `MobileBottomNav` height is ~56 px + `env(safe-area-inset-bottom)` (up to ~34 px) = ~90 px. On tall-notch devices, real content is only ~6 px above nav — visually "under" it.
- Several pages (`Modes`, `Operator`, `Coach`, `GameForgeShell`) *also* set `pb-[calc(96px+env(safe-area-inset-bottom))]`, stacking with the shell's `pb-24` → wasted space and the "excessive length" symptom.
- Global `overflow-x: hidden` on `body` hides symptoms but does not fix the *cause*: wide children (long titles without `min-w-0`, wide cards, big rings, wide `<input>` counters).
- Progression rings and hero cards use fixed pixel sizes that exceed 360 px viewport minus padding.

## 2. Components / files affected

Shared:
- `src/components/eblocki/AppShell.tsx` (header, main padding, root height unit)
- `src/components/eblocki/MobileBottomNav.tsx` (height contract + CSS var export)
- `src/components/PaymentTestModeBanner.tsx` (slot into shell, not per page)
- `src/index.css` (`.min-h-screen-safe`, safe-area utilities, add `.pb-nav-safe`, `.pt-header-safe`)

Route-level trims (remove now-redundant paddings, add `min-w-0` / `break-words` where needed):
- `src/pages/Dashboard.tsx`
- `src/pages/Proof.tsx` (verdict/result state lives here)
- `src/pages/Coach.tsx`
- `src/pages/Settings.tsx`
- `src/pages/Pricing.tsx`
- `src/pages/Modes.tsx`, `src/pages/Operator.tsx`, `src/components/gameforge/GameForgeShell.tsx`

## 3. Safe-area strategy

- Replace `min-h-screen-safe` with `min-h-[100dvh]` fallback → `100vh`. Keep `env(safe-area-inset-*)` on inner containers, not on the outer height.
- Introduce two utilities in `index.css`:
  - `.pt-header-safe { padding-top: calc(var(--app-header-h, 56px) + env(safe-area-inset-top)); }`
  - `.pb-nav-safe { padding-bottom: calc(var(--app-nav-h, 64px) + env(safe-area-inset-bottom) + 8px); }`
- Expose `--app-header-h` and `--app-nav-h` from the shell so pages don't hard-code magic numbers.

## 4. Header and banner offset

- Make the mobile brand header **sticky** (`sticky top-0 z-30`) with `safe-top` padding it already has, plus a solid `bg-card` (drop the translucent 40% variant on mobile — it lets status-bar bleed through).
- Move `PaymentTestModeBanner` out of `Pricing.tsx` and mount it once inside `AppShell` **above** the sticky header. The banner then contributes to `--app-header-h` via `ResizeObserver` (one small effect, no new deps).
- Any page rendering its own inline header keeps its content but drops `pt-*`; the shell owns the top offset.

## 5. Bottom-nav clearance

- Bottom nav sets `--app-nav-h: 64px` on mount and applies `safe-bottom` (already correct).
- `<main>` uses `pb-nav-safe md:pb-0`. Remove `pb-24` and remove the per-page `pb-[calc(96px+env(safe-area-inset-bottom))]` in the four listed pages — they double-count.
- Rule: pages never add bottom padding for the nav; the shell owns it.

## 6. Width containment

Codify one rule in `index.css` and apply per file:

```text
outer container: w-full max-w-full min-w-0
row/flex parent: min-w-0
grid cell:       min-w-0
long text:       break-words (and `.line-clamp-2` on titles)
inputs/search:   w-full max-w-full
media/rings:     max-w-[min(100%,theme(width.72))] on mobile
```

Keep `overflow-x-hidden` on `body` as a belt-and-braces guard, but stop relying on it — fix at the child.

## 7. Long text / attachments

- Proof titles/descriptions: `break-words` + `line-clamp-2` on cards, full text in detail view.
- Attachment filenames: `truncate` + tooltip; keep the mime/size chip separately so the file row never expands.
- Counters ("3/5", "12 XP"): render as a `shrink-0` chip so the text sibling gets `min-w-0`.

## 8. Forms with the mobile keyboard

- Wrap primary CTA inside forms with `sticky bottom-[calc(var(--app-nav-h)+env(safe-area-inset-bottom))]` when the form is long (Coach input, Proof submit).
- Add `scroll-margin-bottom: 96px` on inputs via a `.input-anchored` utility, so `scrollIntoView` on focus doesn't hide the field behind the on-screen keyboard.
- Use `enterkeyhint`, `inputmode`, and `autocomplete` on existing inputs (attribute-only, no behavior change).
- Do **not** switch to `visualViewport` listeners — not needed for this fix and adds risk.

## 9. Minimum supported viewport matrix

| Width | Rationale |
|---|---|
| 320 px | Older iPhone SE / narrow Android |
| 360 px | Success gate (per brief) |
| 375 px | iPhone 13 mini class |
| 390 px | iPhone 15/16 baseline |
| 414–430 px | iPhone Pro Max class |
| 768 px | Tablet — verify layout switch |
| 1024/1280 px | Desktop no-regression |

## 10. Accessibility checks

- Tap targets ≥ 44×44 (bottom nav already 56, verify More sheet items).
- Contrast on `bg-card/95` header stays AA on dark; the sticky header switch to `bg-card` (no alpha) fixes borderline cases.
- Focus ring visible under sticky header (add `scroll-margin-top: calc(var(--app-header-h) + 12px)` on `:focus-visible` interactive elements).
- Single `<main>` remains in `AppShell`; do not add another in pages.
- `aria-label` on icon-only bottom-nav items already present — re-verify after edits.

## 11. Browser-testing sequence

Run Playwright (already in repo) headless Chromium:

1. Boot dev server (already running).
2. For each route (`/dashboard`, `/proof`, `/proof` verdict state via seeded query, `/coach`, `/settings`, `/pricing`) capture screenshots at 320, 360, 390, 430, 768, 1280 px.
3. Assertion: `document.documentElement.scrollWidth <= innerWidth + 1` at every mobile width.
4. Simulate keyboard: focus Coach input, assert send button is visible within viewport minus 260 px (approximate keyboard).
5. Toggle test-mode banner on `/pricing`, verify header still meets `safe-area-inset-top` and content starts below combined header height.
6. Diff mobile screenshots against desktop for regressions (visual only, human review).

## 12. Rollback risks

- Sticky header adds z-index; risk: existing modals/toasts with lower z. Mitigation: keep nav `z-40`, header `z-30`, existing Radix overlays already `z-50`.
- Banner moved out of Pricing: risk of not showing on Pricing during test mode. Mitigation: shell mounts it unconditionally; component already self-hides when not in test mode.
- Removing per-page `pb-[calc(96px+…)]`: risk of content under nav if the shell rule isn't applied. Mitigation: change shell first, then trim pages in the same PR.
- `100dvh` on older iOS (< 15.4): falls back to `100vh` via CSS declaration order — no functional loss.
- CSS variables from JS (`--app-header-h`) require a mount effect; SSR/Vite prerender safe because default values are set in CSS.

## 13. Build-mode prompt (narrow)

> BUILD MODE. Implement the mobile containment fixes described in `.lovable/plan.md` under "Mobile Containment Plan". Scope:
> 1. `src/index.css`: swap `.min-h-screen-safe` to a `100dvh`/`100vh` pair; add `.pt-header-safe`, `.pb-nav-safe`, `.input-anchored` utilities; declare `--app-header-h: 56px` and `--app-nav-h: 64px` defaults on `:root`.
> 2. `src/components/eblocki/AppShell.tsx`: make mobile header `sticky top-0 z-30` with solid `bg-card`; mount `<PaymentTestModeBanner />` above it inside the shell only (remove from `Pricing.tsx`); set `<main>` to `pb-nav-safe md:pb-0` (drop `pb-24`); use `min-h-[100dvh]`.
> 3. `src/components/eblocki/MobileBottomNav.tsx`: on mount, write measured height into `--app-nav-h` via a `ResizeObserver`; unchanged visuals.
> 4. Remove now-redundant `pb-[calc(96px+env(safe-area-inset-bottom))]` from `src/pages/Modes.tsx`, `src/pages/Operator.tsx`, `src/pages/Coach.tsx`, and `src/components/gameforge/GameForgeShell.tsx`.
> 5. Long-text pass on proof cards in `src/pages/Dashboard.tsx` and `src/pages/Proof.tsx`: add `min-w-0`, `break-words`, `line-clamp-2` on titles, `truncate` + `shrink-0` chips on counters/filenames. No new components.
> 6. Coach input: add `sticky bottom-[calc(var(--app-nav-h)+env(safe-area-inset-bottom))]` wrapper on the composer only on `md:hidden`.
> 7. Attribute-only: add `enterkeyhint`, `inputmode`, `autocomplete` where missing on existing inputs in Coach, Proof, Settings.
>
> Verify with Playwright at 320/360/390/430/768/1280: no horizontal body scroll, no content under status bar or bottom nav, Coach send button visible with focused textarea. Capture screenshots for each route × width. Do not change proof scoring, auth, billing, or Supabase schema. Do not add dependencies.

## Success gates recap

- 0 body horizontal scroll at 360 px on every audited route.
- 0 content behind status bar or `MobileBottomNav`.
- Coach + Proof primary CTA reachable with keyboard open at 390 px.
- Desktop screenshots unchanged (visual diff).
