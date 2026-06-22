---
name: DOCX TEMPLATE mode (template-fidelity export)
description: Why TEMPLATE projects clone the original DOCX and do regex text-node surgery instead of regenerating, and how the two export engines stay separate.
---

Projects carry a `documentMode`: `AI_GENERATED` (Gemini + html-to-docx + Puppeteer PDF, the original pipeline) or `TEMPLATE` (preserve an uploaded DOCX 100%). The two engines must NEVER mix.

**Rule:** A TEMPLATE project export always exits in the template branch — even when its `templateFileUrl` is missing it returns an error, never falling through to the AI/rich path. `/library/:id/use` creates a TEMPLATE project (cloning the original DOCX into the project's own storage object) only when the source library doc has an `originalFileUrl`; if that original exists but cloning fails it returns an error rather than silently producing an AI-mode project.

**Why:** The user requires byte-identical template fidelity (fonts, margins, RTL/sectPr, headers/footers, images, tables) and explicitly forbade mixing export engines or touching the Gemini/`ai.ts` flow.

**How template edits are applied:** clone the DOCX zip, and in `word/document.xml` rewrite ONLY `<w:t>` text nodes of paragraphs the user changed — the full new text goes into the first `<w:t>` (with `xml:space="preserve"`), other `<w:t>` in that paragraph are emptied. Never touch `<w:pPr>`/`<w:rPr>`/`<w:sectPr>`/`<w:drawing>`.

**Why regex over an XML parser:** `String.replace` leaves every unedited paragraph match and all non-paragraph bytes untouched, guaranteeing unedited content is never altered (even nested `<w:p>` in textboxes). A reserializing XML parser would normalize attribute order/namespaces across the whole package and REDUCE fidelity. Index alignment between extract and apply is exact because both walk the identical paragraph regex over the same immutable clone bytes.

**PDF / preview:** TEMPLATE PDFs and the live preview render the real DOCX via headless LibreOffice (`soffice --headless --convert-to pdf` with a per-call isolated `-env:UserInstallation` profile dir). LibreOffice is a system dep. AI mode keeps using Puppeteer — do not route TEMPLATE through Puppeteer or AI through LibreOffice.

Engine code: `artifacts/api-server/src/lib/docx-template.ts`. Export branch: `routes/documents.ts` (`/projects/:id/export`, `/projects/:id/preview.pdf`). `templateFileUrl` is internal (never serialized); `documentMode` + `templateContent` are serialized.
