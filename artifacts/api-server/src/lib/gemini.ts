import { GoogleGenAI, type Schema } from "@google/genai";
import type { ZodType } from "zod/v4";
import { logger } from "./logger";

if (!process.env.GEMINI_API_KEY) {
  logger.warn("GEMINI_API_KEY is not set. AI-powered features will be disabled.");
}

export const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

/** Fallback models in order when the primary model is overloaded (503). */
const FALLBACK_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];

/** Total attempts = 1 initial call + up to 2 automatic retries on invalid output. */
const MAX_ATTEMPTS = 3;

const JSON_ONLY_INSTRUCTION =
  "أعد الإجابة بصيغة JSON صالحة فقط مطابقة للمخطط المطلوب، دون أي نص إضافي أو علامات markdown أو شروحات أو أسطر برمجية.";

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return (fenced ? fenced[1] : trimmed).trim();
}

function is503Error(err: unknown): boolean {
  if (err instanceof Error) {
    return err.message.includes("503") || err.message.includes("UNAVAILABLE") || err.message.includes("high demand");
  }
  return false;
}

export type StructuredOptions = {
  /** Gemini response schema to constrain generation to valid JSON. */
  responseSchema?: Schema;
  temperature?: number;
};

/**
 * Request strictly-structured JSON from Gemini.
 *
 * Enforcement:
 * - `responseMimeType: application/json` + an explicit JSON-only instruction so
 *   the model never returns markdown, prose, or code fences.
 * - Optional Gemini `responseSchema` constrains the generated structure.
 * - The parsed payload is validated against a Zod schema before it is returned.
 * - On empty output, JSON parse failure, or schema mismatch the request is
 *   automatically retried (up to `MAX_ATTEMPTS` total). If every attempt fails
 *   the call throws — an incomplete or malformed structure is rejected, never
 *   passed downstream.
 * - On 503 (overloaded), automatically falls back to gemini-2.0-flash then gemini-1.5-flash.
 */
export async function chatStructured<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: ZodType<T>,
  options: StructuredOptions = {},
): Promise<T> {
  if (!gemini) {
    throw new Error("GEMINI_API_KEY must be set to use AI features. Add it to your environment secrets.");
  }
  const systemInstruction = `${systemPrompt}\n\n${JSON_ONLY_INSTRUCTION}`;
  let lastError: unknown;

  // Build model list: primary + fallbacks
  const modelsToTry = [GEMINI_MODEL, ...FALLBACK_MODELS.filter(m => m !== GEMINI_MODEL)];

  for (const model of modelsToTry) {
    let modelFailed503 = false;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await gemini.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            temperature: options.temperature ?? 0.3,
            ...(options.responseSchema
              ? { responseSchema: options.responseSchema }
              : {}),
          },
        });

        const raw = response.text;
        if (!raw) {
          throw new Error("AI returned an empty response.");
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(stripCodeFences(raw));
        } catch {
          throw new Error("AI returned malformed JSON.");
        }

        const result = schema.safeParse(parsed);
        if (!result.success) {
          throw new Error(
            `AI output failed schema validation: ${result.error.message}`,
          );
        }

        if (model !== GEMINI_MODEL) {
          logger.info({ model }, "Used fallback Gemini model successfully");
        }

        return result.data;
      } catch (err) {
        lastError = err;

        // If 503, skip remaining attempts for this model and try next model
        if (is503Error(err)) {
          logger.warn(
            { err, model, attempt, nextModel: modelsToTry[modelsToTry.indexOf(model) + 1] },
            "Gemini 503 - switching to fallback model",
          );
          modelFailed503 = true;
          break;
        }

        logger.warn(
          { err, attempt, maxAttempts: MAX_ATTEMPTS, model },
          "Gemini structured output attempt failed",
        );
      }
    }

    // If model failed for non-503 reason, don't try fallbacks
    if (!modelFailed503 && model === GEMINI_MODEL) {
      break;
    }
  }

  throw new Error(
    `AI failed to return valid structured output after trying all models: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}
