import { GoogleGenAI, type Schema } from "@google/genai";
import type { ZodType } from "zod/v4";
import { logger } from "./logger";

if (!process.env.GEMINI_API_KEY) {
  throw new Error(
    "GEMINI_API_KEY must be set to use AI features. Add it to your environment secrets.",
  );
}

export const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

/** Total attempts = 1 initial call + up to 2 automatic retries on invalid output. */
const MAX_ATTEMPTS = 3;

const JSON_ONLY_INSTRUCTION =
  "أعد الإجابة بصيغة JSON صالحة فقط مطابقة للمخطط المطلوب، دون أي نص إضافي أو علامات markdown أو شروحات أو أسطر برمجية.";

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return (fenced ? fenced[1] : trimmed).trim();
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
 */
export async function chatStructured<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: ZodType<T>,
  options: StructuredOptions = {},
): Promise<T> {
  const systemInstruction = `${systemPrompt}\n\n${JSON_ONLY_INSTRUCTION}`;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await gemini.models.generateContent({
        model: GEMINI_MODEL,
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

      return result.data;
    } catch (err) {
      lastError = err;
      logger.warn(
        { err, attempt, maxAttempts: MAX_ATTEMPTS, model: GEMINI_MODEL },
        "Gemini structured output attempt failed",
      );
    }
  }

  throw new Error(
    `AI failed to return valid structured output after ${MAX_ATTEMPTS} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}
