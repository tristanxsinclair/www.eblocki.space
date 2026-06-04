# AI Handoff Template — Eblocki

Every external AI/dev tool finishing a session on Eblocki must paste a filled
copy of this template into its final response. No prose victory laps, no fake
verification.

```
## Handoff — <feature / fix name>

Objective:
- <one sentence>

Branch / source:
- repo: lovable-dev/eblocki (or fork)
- branch: <name>
- base commit: <hash>

Files created:
- path/to/file.ts — purpose

Files modified:
- path/to/file.ts — what changed and why

Files deleted:
- path/to/file.ts — reason it was safe to remove

Database / migration changes:
- supabase/migrations/<timestamp>_<name>.sql — purpose
- new tables: <names>  | new columns: <table.col>  | new policies: <names>
- applied to remote? <yes/no — verify in Supabase>
- rollback note: <if any>

Env / secrets changes required:
- <SECRET_NAME> — purpose, where to set (Supabase Function Secrets)

Commands run:
- npm install            -> ok / fail
- npm run lint           -> <summary>
- npm run test           -> <pass/fail counts>
- npm run build          -> ok / fail
- npm audit              -> <high/critical count>

Route / browser QA:
- /<route>  — <what was checked, signed-in or anon>

Evidence of completion:
- <screenshot, log excerpt, test name>

Known risks / follow-ups:
- <list>

Next recommended action:
- <one sentence>
```

Rules:
- Do not mark "done" unless `npm run build` passes.
- Do not claim a Supabase migration is applied unless you opened the project
  and confirmed the schema.
- Do not fabricate browser QA. If you did not open the route, say so.