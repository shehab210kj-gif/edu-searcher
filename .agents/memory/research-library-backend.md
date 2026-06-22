---
name: Research Library backend
description: Durable lessons for the academic Research Library backend (rich import/export, admin auth, OpenAPI codegen) on the Arabic research platform.
---

## LayoutMetadata enum ↔ OpenAPI codegen must match the DB union
The Drizzle `LayoutMetadata` union in `lib/db/src/schema/projects.ts` is the source of truth for layout fields (`pageNumberAlign`, `pageSetup.orientation`, `pageSetup.size`, etc.). When extending `lib/api-spec/openapi.yaml`, enum values must match those unions exactly or `pnpm --filter @workspace/api-spec run codegen` produces zod types that fail typecheck against serialize output.
**Why:** mismatched enums (e.g. spec `center` vs union missing it) only surface as cryptic type errors after codegen.
**How to apply:** grep the union types first, mirror them in the spec, then run codegen.

## Layout-preserving rich export
Rich (DOCX-imported) projects export via `artifacts/api-server/src/lib/rich-export.ts`, branched in `routes/documents.ts` on `project.richContent` (legacy structured export path is preserved — additive only).
- DOCX: `@turbodocx/html-to-docx`, `direction:"rtl"`, margins cm→twip ×566.929.
- PDF: puppeteer + bundled Amiri fonts inlined as base64 `@font-face` for Arabic shaping/RTL.
- **Headers/footers must go in Puppeteer `headerTemplate`/`footerTemplate`, NOT in body HTML** — body header/footer renders once, templates repeat per page. Templates render in a separate context with no page CSS/fonts and font-size defaults to 0, so every style must be inline and side padding must mirror page margins. Page number via `<span class="pageNumber">`.

## Admin auth requires SESSION_SECRET
`lib/admin-auth.ts` signs HMAC-SHA256 tokens with `SESSION_SECRET`. `verifyAdminToken` and `adminLogin` must hard-require `SESSION_SECRET` (return false / 503) — never HMAC with an empty key, or tokens become forgeable. `requireAdmin` returns 503 when `ADMIN_PASSWORD` is unset, 401 otherwise; accepts `x-admin-password` or `Authorization: Bearer`.
