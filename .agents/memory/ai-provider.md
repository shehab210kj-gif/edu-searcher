---
name: AI provider key formats
description: How AI provider keys behave in this environment and which provider the project uses.
---

# AI provider in this project

This project uses **Google Gemini directly** via `@google/genai` with `GEMINI_API_KEY`. The client + `chatJSON`/`chatText` helpers live in `artifacts/api-server/src/lib/gemini.ts`. Default model `gemini-2.5-flash`, overridable via `GEMINI_MODEL`.

## Key-format gotcha (cost real debugging time)
An `OPENAI_API_KEY` whose value starts with `AQ.` is **NOT** a direct OpenAI `sk-` key — it is a Replit AI Gateway / integration token. Calling `api.openai.com` with it returns `401 Incorrect API key`. Such a token only works through the Replit proxy base URL (set up via `setupReplitAIIntegrations`), never against the vendor's public endpoint.

**Why:** the 401 looks like a bad key but is actually a wrong-base-URL problem.
**How to apply:** if a vendor key starts with `AQ.` and a direct SDK call 401s, either run `setupReplitAIIntegrations` to get the proxy base URL, or use a real vendor key. In this project the user chose to bypass all of that and use Gemini directly.

## Gemini JSON responses
`gemini.models.generateContent` with `config.responseMimeType: "application/json"` usually returns clean JSON, but can still wrap it in ```json fences. `chatJSON` strips code fences before `JSON.parse` — keep that guard.
