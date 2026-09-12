# Eblocki Mobile App

The iOS and Android projects use app ID `space.eblocki.app` and load the bundled
web build. They do not depend on the live website being served by Lovable.
Sign-in, saved plans, proof checks, and other server features still need a network
connection and the existing Supabase configuration.

From the repository root:

```sh
npm ci
npm run mobile:sync
npm run mobile:ios
# Or, with Android Studio installed:
npm run mobile:android
```

`mobile:sync` builds the current web code and copies it and the native plugins to
both projects. Run it after web changes before building in Xcode or Android Studio.
The Vite environment must include `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY`, as it does for the web app.

The local iOS simulator build was verified with Xcode 26.6. Android source and
plugin sync are configured; an Android build requires Java and the Android SDK.

Store submission is separate from a simulator build. Release signing, store
records, production notification credentials, and device testing remain part of
the release process. No signing identities or credentials are committed here.

For the student workflow browser checks, start the Vite server and run:

```sh
E2E_BASE_URL=http://127.0.0.1:5174 npx playwright test tests/e2e/student-app.spec.ts
```

These tests use isolated, mocked account data; they do not write to live accounts.
