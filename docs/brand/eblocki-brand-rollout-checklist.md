# Eblocki Brand Rollout Checklist

**Status:** Asset added. Component live. Moving to next surfaces.

**Source of Truth:** Approved circular Eblocki logo (neon green on black, premium tech feel, "PROOF OVER INTENTION.").

## 1. Repo Assets
- [x] Created `src/components/eblocki/EblockiLogo.tsx` (production-ready with real image loading + elegant fallback)
- [x] Updated `src/components/eblocki/AppShell.tsx` (nav now uses new logo on desktop + mobile)
- [x] Added approved circular logo to `public/brand/eblocki-logo-circular.png`
- [ ] Generate derived sizes if needed: `eblocki-logo-circular-192.png` and `512.png` (optional for performance)
- [ ] Replace remaining icon+text logos across pages

## 2. Metadata & PWA
- [x] `index.html` theme-color, manifest, apple-touch-icon already aligned (black)
- [ ] Update `og:image` and `twitter:image` once a proper social preview asset is prepared

## 3. In-App Surfaces (Next)
- [x] AppShell / Navigation
- [ ] Landing page hero
- [ ] Auth pages
- [ ] Onboarding
- [ ] Dashboard / Proof / Coach headers

## 4. External Manual Rollout (Still Required)
- Social profiles (X, Instagram, TikTok, YouTube, LinkedIn)
- GitHub repo avatar + social preview
- Capacitor native app icons + rebuild
- App store listings
- Supabase / Lovable project branding
- Cache refresh for og:image

## Verification (After Asset)
- `npm run build` must pass
- Test at 375px / 390px / desktop
- Logo crisp, no overflow, good contrast

**Last updated:** 2026-07-08
