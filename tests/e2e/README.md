# System Forge E2E

Playwright end-to-end tests for the System Forge flow at `/systems`.

## Run locally

```bash
bun run test:e2e:install   # first time only – downloads Chromium
bun run dev                # in another shell, start Vite on :8080
bun run test:e2e
```

## Auth

Tests require a Supabase session and self-skip when one is not present.
In the Lovable sandbox the session is injected via env vars
(`LOVABLE_BROWSER_SUPABASE_*`) once the user signs in through the preview.
For local runs you can export the same vars, or run the tests through the
Lovable AI Playwright runner after signing in.

## What is covered

`system-forge.spec.ts`:
- Loads `/systems` for a signed-in user.
- Empty-state renders without crashing.
- Creates a Law system (domain=law, goal, outcome, bottleneck, minutes=20).
- Confirms the active system panel + `Start first rep` CTA.
- Submits a proof artifact and asserts verdict / weakness / next-upgrade render.
- Refreshes the page and asserts the active system + past-rep state persist.
- Fails if unexpected console errors fire during the flow.

`system-forge-visual.spec.ts`:
- Element-level visual regression snapshots for the hero, forge form,
  active-system panel, verdict block, and recent-reps list.
- Uses stable `data-testid` selectors; masks the timestamp in each rep row.
- Baselines are committed under `tests/e2e/__snapshots__/` and are pinned to
  the `mobile-chromium` project (Pixel 7 device profile).

## Updating visual baselines

When an intentional UI change lands, regenerate baselines locally:

```bash
bun run test:e2e:update
```

Commit the updated PNGs alongside the code change. Never update baselines to
silence an unexpected diff — inspect the failure artifact from the Playwright
HTML report first.