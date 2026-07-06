import { GoogleGenAI } from "@google/genai";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in environment!");
    process.exit(1);
  }
  
  console.log("Using API Key:", apiKey.substring(0, 10) + "...");
  const ai = new GoogleGenAI({ apiKey });

  try {
    console.log("Calling Gemini gemini-2.5-flash...");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello, say test",
    });
    console.log("Response:", response.text);
  } catch (err: any) {
    console.error("Gemini call failed:", err.message);
  }
  process.exit(0);
}

main().catch(console.error);
