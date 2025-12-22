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
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      max_tokens: opts.max_tokens || 800
    });
    
    console.log("✅ OpenAI response received");
    return { text: completion.choices[0].message.content, raw: completion };
  } catch (openAIError) {
    // Handle OpenAI API errors specifically
    if (openAIError.status === 429) {
      if (openAIError.code === 'insufficient_quota' || openAIError.type === 'insufficient_quota') {
        console.error("❌ OpenAI quota exceeded:", openAIError.message);
        const error = new Error("OpenAI API quota has been exceeded. Please check your OpenAI account billing.");
        error.status = 503;
        error.code = 'QUOTA_EXCEEDED';
        throw error;
      } else {
        // Rate limit (too many requests)
        console.error("❌ OpenAI rate limit:", openAIError.message);
        const error = new Error("OpenAI API rate limit exceeded. Please try again in a moment.");
        error.status = 429;
        error.code = 'RATE_LIMIT';
        throw error;
      }
    } else if (openAIError.status === 401) {
      console.error("❌ OpenAI authentication error:", openAIError.message);
      const error = new Error("OpenAI API authentication failed. Please check API key configuration.");
      error.status = 500;
      error.code = 'AUTH_ERROR';
      throw error;
    } else {
      // Re-throw other errors
      throw openAIError;
    }
  }
}
