# Coach Vector Store Bridge

Date: 2026-07-06

Status: implemented locally, deployment pending.

## What changed

The `coach` Supabase Edge Function now attempts to retrieve Eblocki context from the existing OpenAI vector store before calling the existing AI gateway.

The client response shape is unchanged. The function still returns the same `success`, `mode`, `hybrid`, `state`, `response`, `proofContract`, `proofQuestion`, `interactionId`, `commitmentId`, and `debug` fields.

## Retrieval method

Function: `supabase/functions/coach/index.ts`

Helper: `getEblockiVectorContext(query: string)`

Server-side environment variables:

- `OPENAI_API_KEY`
- `EBLOCKI_VECTOR_STORE_ID`

Request:

- `POST https://api.openai.com/v1/vector_stores/{vector_store_id}/search`
- `query`: clipped user Coach message
- `max_num_results`: `3`
- `ranking_options.ranker`: `auto`
- `ranking_options.score_threshold`: `0.1`
- `rewrite_query`: `true`

The function converts returned text chunks into a short prompt block headed:

```text
Retrieved Eblocki context:
```

Only concise text excerpts are injected into the Coach system prompt. Raw OpenAI response objects are not returned to the client.

## Failure behavior

Vector retrieval is fail-soft.

If the OpenAI key, vector store ID, search response, or network request fails, the function logs a non-secret warning and continues through the existing Coach path.

The function must not log or return:

- API key values
- vector store ID values
- raw environment values
- raw OpenAI retrieval objects

## Security boundary

Secrets remain server-side in the Supabase Edge Function environment.

No frontend code reads `OPENAI_API_KEY` or `EBLOCKI_VECTOR_STORE_ID`.

No new database table, UI route, or client contract was added.

## Verification

Local code inspection: pass.

Supabase local function serve: blocked in this shell because `supabase` is not available on PATH.

Deno type check: blocked in this shell because `deno` is not available on PATH.

Required post-deploy smoke test:

1. Set Supabase Edge Function secrets without printing values:

```bash
supabase secrets set OPENAI_API_KEY
supabase secrets set EBLOCKI_VECTOR_STORE_ID
```

2. Deploy:

```bash
supabase functions deploy coach
```

3. In a signed-in Coach session, send a query that should match Eblocki doctrine, for example:

```text
I am planning too much and not producing proof. What should I do now?
```

Expected result:

- Coach still returns one classification, one proof standard, and one next action.
- Response remains grounded in Eblocki doctrine.
- No secret values appear in client response, logs, screenshots, or release notes.

## Remaining risks

- Production Supabase secrets must be set before deployment verification.
- A signed-in session is required for end-to-end Coach smoke testing because the function rejects unauthenticated requests before invoking AI.
- The existing Lovable AI Gateway path still controls final answer generation; vector context only grounds the prompt.
