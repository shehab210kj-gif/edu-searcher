---
name: rich content rendering
description: How rich HTML document content is rendered and exported in the academic research platform.
---

# Rendering library/project rich HTML content

Projects store rich (TipTap) HTML in `richContent`, rendered with
`dangerouslySetInnerHTML`. Note: the reader-facing **library** detail view is
now file-first (it shows the real document via a PDF iframe, not rich HTML), so
that specific surface no longer renders `richContent` — but any surface that
does (project views, future ones) still must sanitize.

**Rule:** Always sanitize `richContent` (e.g. DOMPurify) before rendering it to
readers.
**Why:** Content is authored through the admin pipeline, but it is still a
stored-XSS sink for every reader if any malicious HTML/event handler enters the
library. Defense at render time is the last line; consider server-side
sanitization on write as defense-in-depth.
**How to apply:** Any new surface that displays `richContent` must run it
through a sanitizer first, not render it raw.

# Exporting rich content

DOCX/PDF export of rich content goes through a shared pipeline that accepts a
structural input (title + richContent + layoutMetadata + formatting), so both
full projects and library documents reuse the same exporters. Export endpoints
return binary and are hit via a direct URL (`${BASE_URL}api/.../export?format=`),
not a generated query hook — they are intentionally not in the OpenAPI spec.
