## Plan — Premium E-Block Monogram Logo

Redesign the Eblocki logo as a bespoke geometric "E" monogram in the Graphite & Bone register, with a one-shot reveal animation on first paint.

### Design commitments

- **Mark:** A custom-drawn E constructed from three horizontal bars stacked into a block, with the middle bar shortened and offset (a "notched" cut) to encode the "block" concept. Precise 24×24 grid geometry, sharp corners, no strokes — pure filled forms. Reads at 16px (favicon), 32px (nav), and 512px (app icon / social) without breaking.
- **Wordmark (lockup variant):** `eblocki` set in a tuned display face — **Fraunces** (variable, editorial serif with soft-square terminals) at low optical size, tight tracking (-0.02em), all-lowercase. Weighted 500. Paired only with the mark in the lockup; the mark alone is the primary identity.
- **Palette:** Graphite `#0F1113` base, `#1C1F22` secondary surface, Bone `#F5F1E8` for the mark on dark, `#8A8F98` for muted metadata. **No green accent** in the logo itself — controlled green stays a product signal, not brand.
- **Finish:** Engraved feel via a single 1px inner highlight (Bone at 6% opacity) on the top edge of each bar when rendered on graphite — sells "chiselled metal" without shadow noise. Flat/no highlight on light surfaces.
- **Motion:** One-shot reveal on first paint only. Bars mask-wipe in from left, staggered 80ms each (top → middle → bottom), 420ms total, `cubic-bezier(0.22, 1, 0.36, 1)`. Wordmark fades + slides 4px right, starting at 240ms. Runs once per session (sessionStorage flag); static on every subsequent mount.

### Deliverables

1. **`src/components/brand/EblockiMark.tsx`** — inline SVG React component. Props: `size` (default 32), `variant` (`"mark" | "lockup"`), `tone` (`"bone" | "graphite"` — auto-inverts fill), `animate` (default `true` on first session paint, `false` otherwise). ViewBox `0 0 24 24` for the mark; `0 0 96 24` for the lockup. All geometry as `<rect>` with integer coords — no paths, no external assets.
2. **`src/components/brand/EblockiMark.css`** — keyframes for the mask-wipe and wordmark reveal, `prefers-reduced-motion` disables animation.
3. **`public/favicon.svg`** — static export of the mark (bone on graphite, no animation). Update `index.html` to reference `favicon.svg` with `type="image/svg+xml"`, keep `favicon.png` fallback if present.
4. **`public/og-mark.png`** — 1200×630 social card variant generated from the SVG (mark centered on graphite, wordmark below). Referenced from `index.html` og:image only if a project og image already exists — otherwise skipped per head-metadata rules.
5. **Replace existing logo usage** — audit and swap every current logo/wordmark instance:
   - `src/components/eblocki/AppShell.tsx` header
   - `src/pages/Landing.tsx` hero + nav
   - `src/pages/Pricing.tsx`, `Founder.tsx` headers if they render a logo
   - Auth pages (`Login`, `SignUp` if present)
   - Any `<img src=".../logo...">` references
6. **Font wiring** — install `@fontsource-variable/fraunces` via `bun add`, import in `src/main.tsx`, register as `font-display` in `tailwind.config.ts`. Only the lockup uses it — no site-wide font swap.
7. **Docs** — append a "Brand mark" section to `docs/PRODUCT_SPEC.md` with usage rules (clear-space = 1 bar-height, min size 16px, never recolor, never stretch, never add stroke).

### Geometry (technical detail)

```text
ViewBox 0 0 24 24 — three bars forming an E-block

Top bar:     x=2  y=3   w=20 h=4   rx=0
Middle bar:  x=2  y=10  w=13 h=4   rx=0   ← shortened + left-aligned = the "block cut"
Bottom bar:  x=2  y=17  w=20 h=4   rx=0

Optical adjustment: middle bar shifts left 0 (already anchored); the negative
space to its right (x=15..22, y=10..14) is the signature "notch" that reads as
a removed block. This is what distinguishes the mark from a generic E.
```

Lockup places the 24×24 mark at `x=0` and the wordmark starting at `x=32`, baseline-aligned to the middle of the mark.

### Verification checklist (run after implementation)

1. `bun run build` — clean, no TS errors.
2. Playwright: capture `/` at desktop (1280×1800) and mobile (375×812), screenshot the header mark, verify pixel-crisp rendering at both DPRs.
3. Favicon: fetch `/favicon.svg`, confirm it parses and renders in a browser tab (Playwright `page.title()` + `page.screenshot` of the tab area isn't possible, but the SVG served with correct `Content-Type` is sufficient).
4. Reduced-motion: set `prefers-reduced-motion: reduce` in Playwright context, confirm no keyframe animation triggers.
5. Contrast: mark on graphite ≥ 12:1 (Bone `#F5F1E8` on `#0F1113` = ~14.2:1 ✓).
6. Grep for any remaining old logo imports — remove dead files if fully unreferenced.

### Out of scope

- No product/feature changes.
- No color-system overhaul — only the brand mark and its usages.
- No new brand guidelines PDF, no printed collateral.
- Green accent stays on product UI (state signals, proof states) — untouched.
