---
name: PDF library handling
description: How uploaded PDFs are stored/previewed and why pdf-parse must be esbuild-external in the api-server.
---

# PDF library handling

PDF library docs are file-first: the original PDF bytes are stored unchanged, previewed directly (no HTML conversion), and only metadata (pageCount/title) is derived. PDF docs cannot become editable TEMPLATE projects (the `/use` route blocks them) — only DOCX can.

## pdf-parse / pdfjs-dist must stay esbuild-external

`pdf-parse` (v2) bundles pdf.js, which at runtime dynamically imports its worker (`pdf.worker.mjs`) and optional native canvas. When esbuild bundles it into `dist/index.mjs`, that relative resolution breaks: pdf.js throws `Setting up fake worker failed: Cannot find module '.../dist/pdf.worker.mjs'`, the error is swallowed by the metadata catch, and `pageCount` silently comes back `null`.

**Why:** the worker file only exists beside pdfjs-dist inside `node_modules`; the bundle has no sibling worker.

**How to apply:** keep `pdf-parse` (and `pdfjs-dist`) in the `external` array in `artifacts/api-server/build.mjs` so they're required from `node_modules` at runtime. If pageCount regresses to null, check this first. Also note pdf.js needs DOMMatrix/ImageData/Path2D globals stubbed before import in Node, and use the render-free info path (not text extraction, which needs canvas).
