import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    "OPENAI_API_KEY must be set to use AI features. Add it to your environment secrets.",
  );
}

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";

export async function chatJSON<T>(
  systemPrompt: string,
  userPrompt: string,
): Promise<T> {
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    temperature: 0.3,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("AI returned an empty response.");
  }
  return JSON.parse(raw) as T;
}

export async function chatText(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.4,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("AI returned an empty response.");
  }
  return raw.trim();
}
