# Eblocki Brand Rollout Checklist

**Status:** Partial implementation in repo (circular logo component + AppShell). Full visual consistency requires asset addition + external manual steps.

**Source of Truth:** Approved circular Eblocki logo (neon green on black, premium tech feel).

## 1. Repo Assets (Done / In Progress)
- [x] Created `src/components/eblocki/EblockiLogo.tsx` (variants: mark, full, appIcon, wordmark, compact + sizes + real image support + elegant fallback)
- [x] Updated `src/components/eblocki/AppShell.tsx` (nav uses new logo)
- [ ] Add approved circular logo to `public/brand/eblocki-logo-circular.png`
- [ ] Generate derived sizes: `eblocki-logo-circular-192.png`, `eblocki-logo-circular-512.png`
- [ ] Update `EblockiLogo.tsx` default src if path changes
- [ ] Replace any remaining icon+text logos in pages (Landing, Auth, Dashboard headers, Proof, Coach, Onboarding, etc.)

## 2. Metadata & PWA (Mostly Done)
- [x] `index.html` — theme-color #000000, manifest, apple-touch-icon
- [x] `public/manifest.json` — black theme, icon references
- [ ] Update `og:image` and `twitter:image` in `index.html` once new social preview asset exists
- [ ] Update Organization schema logo reference if needed

## 3. In-App Surfaces (Partial)
- [x] AppShell / Navigation (desktop + mobile)
- [ ] Landing page hero / brand mark
- [ ] Auth pages (login, signup, reset)
- [ ] Onboarding flow
- [ ] Dashboard header / empty states
- [ ] Proof page header + Court of Evidence
- [ ] Coach page
- [ ] GameForge / Operator / Systems pages
- [ ] Loading / 404 / error states

## 4. External Manual Rollout (Cannot be done from this repo)

### Social & Profile Images
- [ ] **X / Twitter** — Profile image + header (use circular mark or full logo)
- [ ] **Instagram** — Profile picture (circular mark recommended)
- [ ] **TikTok** — Profile image
- [ ] **YouTube** — Channel icon + banner
- [ ] **LinkedIn** — Company page logo

### GitHub
- [ ] Repo avatar (Settings → General)
- [ ] Social preview image for the repo

### App Stores & Mobile
- [ ] **Capacitor native icons** — Replace in `android/app/src/main/res/` and iOS `AppIcon.appiconset`
- [ ] Run `npx cap sync` then rebuild native projects
- [ ] Update App Store Connect & Google Play listing assets (screenshots may need refresh if branding changed significantly)
- [ ] Splash screen assets if using Capacitor Splash Screen plugin

### Other Platforms
- [ ] **Supabase** project icon / branding (if exposed)
- [ ] **Lovable** project preview / metadata
- [ ] **Stripe** customer portal / checkout branding (if used later)
- [ ] Domain / social preview cache — after og:image change, use Facebook Sharing Debugger + Twitter Card Validator

## 5. Verification Steps (After Asset Addition)
1. `npm run build` — must succeed cleanly
2. `npm run lint`
3. Manual browser test at 375px / 390px / desktop on key routes: `/`, `/auth`, `/dashboard`, `/proof`, `/coach`, `/onboarding`
4. Confirm no horizontal overflow, good contrast, logo crisp (object-contain)
5. Favicon / PWA icons load correctly

## Notes
- Do **not** claim external platforms updated until checklist items are manually completed.
- Keep glow subtle and used only for proof/command emphasis.
- The new identity should feel like a premium behavioural evidence OS — disciplined, high-trust, not gaming or crypto.

**Last updated:** 2026-07-08 by Eblocki Build OS
