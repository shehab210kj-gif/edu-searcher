# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- AI provider: Google Gemini (`@google/genai`). Requires `GEMINI_API_KEY`. Default model `gemini-2.5-flash` (override with `GEMINI_MODEL`). Client + `chatJSON`/`chatText` helpers live in `artifacts/api-server/src/lib/gemini.ts`.
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- DB schema (source of truth): `lib/db/src/schema/` (`projects.ts`, `templates.ts`)
- API contract: `lib/api-spec/openapi.yaml` (codegen → `@workspace/api-zod`, React Query hooks)
- AI service: `artifacts/api-server/src/lib/gemini.ts` (client) + `ai.ts` (prompts)
- DOCX export engine: `artifacts/api-server/src/lib/format-pipeline.ts` (normalize/clean AI JSON → typed blocks) + `export.ts` (render blocks with Word named styles)

## Architecture decisions

- DOCX export is a two-stage pipeline: `buildFormattedDocument()` turns raw AI section/reference JSON into cleaned, typed blocks (strips markdown fences/markers, splits paragraphs, detects sub-headings, builds APA 7 references with hanging indent), then `buildDocx()` renders those blocks using real Word named paragraph styles (Title, Heading 1/2, Body, Reference). Raw AI text is never written directly to the document.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
