import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error(
    "GEMINI_API_KEY must be set to use AI features. Add it to your environment secrets.",
  );
}

export const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return (fenced ? fenced[1] : trimmed).trim();
}

export async function chatJSON<T>(
  systemPrompt: string,
  userPrompt: string,
): Promise<T> {
  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });

  const raw = response.text;
  if (!raw) {
    throw new Error("AI returned an empty response.");
  }
  return JSON.parse(stripCodeFences(raw)) as T;
}

export async function chatText(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.4,
    },
  });

  const raw = response.text;
  if (!raw) {
    throw new Error("AI returned an empty response.");
  }
  return raw.trim();
}
