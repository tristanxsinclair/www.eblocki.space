# Mobile Deployment — EBLOCKI

EBLOCKI ships as both a web app (eblocki.space) and a native iOS / Android app
via [Capacitor](https://capacitorjs.com/). The same React codebase compiles to
both. This document covers the native build pipeline end-to-end.

## Prerequisites

| Target | Tooling |
| --- | --- |
| iOS | macOS 13+, Xcode 15+, Apple Developer account ($99/yr), CocoaPods |
| Android | Android Studio Hedgehog+, JDK 17, Google Play Console account ($25 one-time) |
| Both | Node 20+, Bun, Git |

## One-time setup (per machine)

```bash
# 1. Pull the repo (after Export to GitHub from Lovable)
git clone <your-fork>.git eblocki && cd eblocki
bun install

# 2. Generate the native projects
bunx cap add ios
bunx cap add android

# 3. Build the web bundle and sync to both shells
bun run build
bunx cap sync
```

After this, you have `ios/` and `android/` folders with native Xcode / Gradle
projects. Treat them like normal native projects — commit them.

## Every-build loop

```bash
bun run build      # build the React bundle
bunx cap sync      # copy /dist + plugin native deps into ios/ and android/
bunx cap open ios  # or `bunx cap open android` — opens the IDE
```

Then build/run from Xcode or Android Studio (no command-line shortcut is
robust enough for App Store / Play Store signing).

## Capacitor config

See `capacitor.config.ts`. Key decisions:

- `server.url` points at the Lovable preview URL in dev for hot reload.
  **Remove `server.url` before submitting to either store** — production
  builds must serve from `dist/`.
- Splash, status bar, keyboard, and push notifications are configured
  per-plugin in `capacitor.config.ts`.
- `backgroundColor: '#0a0e14'` matches the EBLOCKI dark canvas so the
  splash, gutters, and status bar don't flash white.

## Plugins installed

- `@capacitor/app` — lifecycle (resume/pause, back button, deep links).
- `@capacitor/splash-screen` — splash control (hidden after 600ms by JS).
- `@capacitor/status-bar` — colour / style.
- `@capacitor/keyboard` — native keyboard resize behaviour.
- `@capacitor/haptics` — taptic / vibration.
- `@capacitor/push-notifications` — APNs + FCM token registration.
- `@capacitor/device` — device id for token dedup.
- `@capacitor/network` — online/offline awareness.

## Splash + icons

Use `cordova-res` or `@capacitor/assets` to generate the per-density
assets from a single 1024x1024 source:

```bash
bunx @capacitor/assets generate \
  --iconBackgroundColor '#0a0e14' \
  --splashBackgroundColor '#0a0e14' \
  --assetPath ./public/icon-512.png
```

This populates `ios/App/App/Assets.xcassets/` and
`android/app/src/main/res/mipmap-*/`.

## Safe areas

Handled in `src/index.css` via `env(safe-area-inset-*)` utilities
(`safe-top`, `safe-bottom`, `safe-x`). `AppShell` already applies these.
`<meta viewport-fit=cover>` is set in `index.html` so iOS exposes the
insets.

## Hot reload during native dev

`capacitor.config.ts` already points `server.url` at the Lovable preview
so changes appear in the simulator on reload. Disable this before
production:

```ts
// production
const config: CapacitorConfig = {
  appId: 'app.lovable.…',
  appName: 'eblocki',
  webDir: 'dist',
  // server: { url: '...' },  // REMOVE
};
```

## Deep links

`appUrlOpen` is wired in `src/lib/mobile/native.ts`. To activate:

1. iOS: add Associated Domains capability + `applinks:eblocki.space`.
2. Android: add `<intent-filter>` for `https://eblocki.space` in
   `AndroidManifest.xml`.
3. Host an `apple-app-site-association` and `assetlinks.json` at
   `https://eblocki.space/.well-known/`.

## Production build commands

```bash
# iOS — produces an .ipa
xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App -configuration Release \
  -destination 'generic/platform=iOS' archive \
  -archivePath build/EBLOCKI.xcarchive

# Android — produces an .aab
cd android && ./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab
```

## CI/CD (optional)

Recommended: EAS Build is React-Native only — use Codemagic, Bitrise, or
GitHub Actions with `macos-latest` for iOS. None of this is wired yet.