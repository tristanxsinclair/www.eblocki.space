## Goal

Make `npm run lint:eblocki` (the lint step in `.github/workflows/ci.yml` → "Verify product") pass cleanly. Confirmed via local run: **4 errors, 1 warning** (the user-quoted "5 errors" is off-by-one; the warning is an unused `eslint-disable` directive in `integrity-rules.ts`, which does not fail the workflow and is out of scope).

No app logic changes beyond the smallest type/regex edits. No `eslint-disable`. No `any`.

## Edits

### 1. `src/lib/eblocki/next-upgrade-extract.ts` (line 35)
- Regex char class `[:\-]` → `[:-]`. The dash is in trailing position, so it's already literal; removing the unnecessary escape preserves behaviour exactly.

### 2. `src/lib/eblocki/coach-response.ts` (line 64)
Replace `(raw as any)` with safe narrowing using `Record<string, unknown>`:

- `const data = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};`
- Narrow `proofContract` the same way from `data.proofContract`.
- For the handful of downstream reads where the inferred `unknown` can't satisfy the declared return type, add minimally scoped casts (not `any`):
  - `state: (data.state as EblockiState) ?? null`
  - `dueDate: (proofContract.dueDate as string | null) || (proofContract.due_date as string | null) || null`
  - `interactionId` / `commitmentId`: cast to `string | null` the same way
  - `usedFallback`: restructure to `typeof data.debug === "object" && data.debug !== null && !!(data.debug as Record<string, unknown>).usedFallback`
- All other reads (`String(...)`, `Number(...)`, `typeof === "boolean"` guards, truthy `||` chains) already accept `unknown` without casts.

Runtime behaviour is identical; only the static type surface changes.

### 3. `src/lib/eblocki/__tests__/temporal-calibration.test.ts` (lines 110, 115)
Add a tiny local test helper above the `legacy rows do not crash` test and replace both `as any` casts:

```ts
const legacy = (createdAt: string): ProofArtifactLike =>
  ({ created_at: createdAt }) as unknown as ProofArtifactLike;
```

- Line 110: `artifacts: [{ created_at: daysAgo(1) }] as any` → `artifacts: [legacy(daysAgo(1))]`
- Line 115: `artifactsAfter: [{ created_at: daysAgo(0) } as any]` → `artifactsAfter: [legacy(daysAgo(0))]`

Single, scoped `as unknown as` cast inside a named test helper — the pattern the instructions explicitly allow.

## Out of scope (intentionally untouched)

- `integrity-rules.ts` line 54 unused-eslint-disable **warning** — does not fail CI; touching it risks scope creep.
- 87 lint errors outside `lint:eblocki`'s scope (Proof.tsx, Settings.tsx, supabase functions, etc.) — not run by Verify product.

## Verification (in build mode)

1. `npm ci`
2. `npm run lint:eblocki` — expect 0 errors
3. `npm run test` — confirm no regression (esp. `temporal-calibration.test.ts`)
4. `npm run build`

## Final report will include

files changed, exact errors fixed, command run by Verify product (`npm run lint:eblocki`), `npm ci`/lint/test/build results, remaining warnings (the one untouched warning), and confirmation no Dashboard/Temporal UI/Proof/Supabase/workflow/package files were modified.
