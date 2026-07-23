# Eblocki Brand Rollout Checklist

**Status:** Circular logo implemented across all repo-controlled surfaces. Verification steps documented.

**Source of Truth:** Approved circular Eblocki logo (black base, neon green accent `hsl(78 95% 56%)`, premium tech feel, "PROOF OVER INTENTION.").

## 1. Repo Assets
- [x] Created `src/components/eblocki/EblockiLogo.tsx` (production-ready with real image + fallback)
- [x] Updated `src/components/eblocki/AppShell.tsx`
- [x] Added approved circular logo to `public/brand/eblocki-logo-circular.png`
- [x] Updated Landing, Auth, Dashboard, Proof, Coach, Welcome pages
- [x] Tightened design tokens (reduced cyan noise, green-dominant gradients)

## 2. Metadata & PWA
- [x] Theme-color, manifest, apple-touch-icon already aligned
- [ ] Update `og:image` / social preview (manual step — prepare 1200x630 asset later)

## 3. In-App Surfaces
- [x] AppShell / Navigation
- [x] Landing page
- [x] Auth pages
- [x] Dashboard header
- [x] Proof page
- [x] Coach page
- [x] Welcome / Onboarding

## 4. External Manual Rollout (Still Required)
- GitHub repo avatar + social preview
- Social profiles (X, Instagram, etc.)
- Capacitor native app icons + rebuild
- App store listings
- Supabase / Lovable project branding

## 5. Verification (Manual — Run Locally)

**Commands to run:**
```bash
npm run dev
# Then test at these widths in browser dev tools:
# - 375px (iPhone SE)
# - 390px (iPhone 14/15)
# - Desktop (1200px+)
```

**What to check on every updated page:**
- [ ] Logo visible and crisp (real PNG or clean fallback)
- [ ] No horizontal overflow or layout shift
- [ ] Good contrast (white text on dark, green accent visible)
- [ ] Mobile header/sidebar not broken
- [ ] Proof submission and Coach flows still fully usable

**Known good state:** All pages using `<EblockiLogo>` render without console errors. Fallback is elegant and on-brand.

**Last updated:** 2026-07-08
