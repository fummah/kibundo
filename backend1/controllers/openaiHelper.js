import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function askOpenAI(systemPrompt, userInput, opts = {}) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput }
    ],
    max_tokens: opts.max_tokens || 800
  });
  return { text: completion.choices[0].message.content, raw: completion };
}
