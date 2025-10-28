import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function askOpenAI(systemPrompt, userInputOrHistory, opts = {}) {
  // Build messages array
  let messages = [{ role: "system", content: systemPrompt }];
  
  // Check if userInputOrHistory is an array (conversation history) or a string (single message)
  if (Array.isArray(userInputOrHistory)) {
    // Convert conversation history to OpenAI message format
    console.log(`🔥 Processing ${userInputOrHistory.length} messages from conversation history`);
    userInputOrHistory.forEach(msg => {
      // Map database sender types to OpenAI roles
      const role = msg.sender === "student" ? "user" : 
                   msg.sender === "bot" || msg.sender === "agent" ? "assistant" : 
                   "user";
      messages.push({ role, content: msg.content });
    });
    console.log(`✅ Formatted ${messages.length - 1} messages for OpenAI (excluding system prompt)`);
  } else {
    // Single message (backward compatibility)
    messages.push({ role: "user", content: userInputOrHistory });
  }
  
  console.log("📤 Sending to OpenAI:", {
    model: "gpt-4o-mini",
    messageCount: messages.length,
    systemPromptLength: systemPrompt.length,
    maxTokens: opts.max_tokens || 800
  });
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages,
    max_tokens: opts.max_tokens || 800
  });
  
  console.log("✅ OpenAI response received");
  return { text: completion.choices[0].message.content, raw: completion };
}
