# Eblocki OpenAI Vector Store Retrieval Proof

Date: 2026-07-06

Status: PASS

Known:
- OPENAI_API_KEY loads locally.
- EBLOCKI_VECTOR_STORE_ID loads locally.
- Direct file attachment to OpenAI vector store works.
- Vector store audit lists attached files.
- Canary retrieval returned Eblocki doctrine content.
- Real Eblocki repo-file ingestion completed through direct attach path.

Failed path:
- Batch ingestion/search path initially returned 0 files / 0 results.
- Direct attach path replaced it as the working ingestion method.

Security:
- No API key exposed.
- No .env file intentionally uploaded.
- No service role key exposed.
- Vector store ID is treated as server-side configuration.

Next:
- Connect retrieval to Supabase coach function.
- Set OPENAI_API_KEY and EBLOCKI_VECTOR_STORE_ID as Supabase Edge Function secrets.
- Coach must fail soft if vector retrieval fails.
