# App Store + Play Store Submission Guide

## App identity

| Field | Value |
| --- | --- |
| Bundle id / package | `app.lovable.a2a81121b3334ee78b1f039d8175acf6` (rename to `space.eblocki.app` before public launch) |
| App name | EBLOCKI |
| Subtitle (iOS, 30 char) | Behavioural performance OS |
| Short description (Play, 80) | Convert ambition into proof. The behavioural OS for serious operators. |
| Category | Productivity (primary), Health & Fitness (secondary) |
| Age rating | 13+ |

## Long description (both stores)

> EBLOCKI is a behavioural performance operating system. Stop being told you're
> doing well — start producing proof you are. EBLOCKI scores your daily proof
> artifacts, tracks momentum across the modes that matter to you, detects when
> you're drifting (avoidance, hype, academic displacement, scattered focus) and
> intervenes before you collapse the streak.
>
> • Daily Control Sheet — prime objective, proof targets, friction tasks.
> • Court of Evidence — submit artifacts, get a verdict, attach PDFs / images
>   with OCR.
> • Coach — an LLM that knows your modes, your strictness level, and your
>   onboarding identity claims.
> • Modes — personalise the engine to law, exams, business, training, build.
> • State engine — detects ten behavioural states and adapts.

## Keywords (iOS, 100 chars total)

`productivity,focus,habit,discipline,study,founder,athlete,exam,proof,operator`

## Screenshots checklist

Required sizes:

- **iPhone 6.7"** (1290×2796) — at least 3
- **iPhone 6.5"** (1242×2688) — at least 3
- **iPad 12.9"** (2048×2732) — only if shipping iPad
- **Android phone** (1080×1920+) — at least 2
- **Android tablet** (only if shipping tablet)

Recommended screen flow to capture:

1. Dashboard with active streak + state badge.
2. Court of Evidence — proof artifact with verdict score.
3. Coach chat with a state detection.
4. Daily Control Sheet filled in.
5. Modes selector.
6. Onboarding identity screen.

Tool: capture from a real device via Xcode > Devices, or `xcrun simctl io
booted screenshot`. Do not use the Lovable web preview — Apple rejects
screenshots that show browser chrome.

## App preview video (optional, recommended)

15–30s, portrait. Show: streak, proof submission, verdict, coach reply.

## Privacy questionnaire — App Store (Apple)

| Data | Linked to user | Used for tracking |
| --- | --- | --- |
| Email | Yes | No |
| Name | Yes | No |
| User content (proof, sheets) | Yes | No |
| Usage data (events) | Yes | No |
| Device ID (push) | Yes | No |
| Diagnostics | No | No |

Privacy policy URL: `https://eblocki.space/legal/privacy`

## Data Safety form — Play Store

- Collected: Email, name, photos (proof attachments), files & docs, user-generated
  content, app interactions, device or other ids.
- Shared: none with third parties for advertising.
- Encrypted in transit: yes.
- Users can request deletion: yes (in-app, Settings → Account).

## Permissions strings (iOS — `Info.plist`)

Add inside `ios/App/App/Info.plist`:

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>Attach screenshots and images as proof evidence.</string>
<key>NSCameraUsageDescription</key>
<string>Capture proof of work in real time.</string>
<key>NSUserNotificationUsageDescription</key>
<string>Send streak reminders and verdict updates.</string>
```

## Permissions (Android — `AndroidManifest.xml`)

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

## Review-bait checklist (avoid common rejections)

- ✅ Account deletion in-app (Settings → Account → Delete my account).
- ✅ Privacy policy URL live.
- ✅ Terms of Service URL live.
- ✅ AI disclosure live (Apple is increasingly scrutinising this).
- ✅ Sign-in with Apple offered if any social auth is offered (Apple req).
  **TODO: add Apple sign-in to /auth before iOS submission.**
- ✅ App does not crash on first launch with no network.
- ✅ All third-party trademarks (Supabase, PostHog) only used in legal
  docs, not marketing copy.
- ✅ No `server.url` in `capacitor.config.ts` in the production build.

## Apple-specific gotchas

- Apple expects the published name match the bundle display name. Set
  `CFBundleDisplayName` = `EBLOCKI` in Info.plist.
- Apple rejects apps that are "just a website". The native shell here is
  fine — but make sure at least one feature uses a native capability
  (we use push + haptics + status bar = good).
- TestFlight build is required before live release.

## Play-specific gotchas

- Closed testing track of at least 12 testers for 14 days is now
  mandatory for new accounts.
- AAB (not APK) is required.
- Target SDK must be the current API level (34 at time of writing).

## Submission order recommended

1. Internal testing build → 1–3 colleagues.
2. TestFlight (Apple) / Closed testing (Google) → 12+ external testers.
3. Production submission.