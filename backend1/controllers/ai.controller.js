const OpenAI = require("openai");
const db = require("../models");
const User = db.user;
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


exports.chatWithAgent  = async (req, res) => {
  try {
    const { question, context } = req.body;
const role = req.user.id;
       const prompt = `
  You are an AI assistant for an education system.
  Role: ${role}.
  Context: ${context}
  
  Question: ${question}
  Answer in a helpful and clear way.
  `;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: prompt }],
  });

  res.status(200).json(response.choices[0].message.content);
  } catch (err) {
    console.error("Error chatgpt:", err);
    res.status(500).json({ message: "Failed to get chatgpt" });
  }
};
