import { pool } from "../config/db.js";
import { askOpenAI } from "./openaiHelper.js";

export const handleConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId, message, scanId } = req.body;
    let convId = conversationId;

    console.log("🔍 Conversation request:", { conversationId, userId, message: message?.substring(0, 50), scanId });

    if (!convId) {
      const title = `Conversation for ${userId || "guest"} ${new Date().toISOString()}`;
      const r = await pool.query(
        `INSERT INTO conversations(student_id, scan_id, title) VALUES($1,$2,$3) RETURNING *`,
        [userId || null, scanId || null, title]
      );
      convId = r.rows[0].id;
    }

    await pool.query(
      `INSERT INTO messages(conversation_id, sender, content) VALUES($1,$2,$3)`,
      [convId, "student", message]
    );

    let grounding = "";
    if (scanId) {
      console.log("🔍 Fetching homework context for scanId:", scanId);
      const s = await pool.query(`SELECT raw_text FROM homework_scans WHERE id=$1`, [scanId]);
      if (s.rows[0]) {
        grounding = `HOMEWORK CONTEXT - This is the scanned homework the student is working on:\n\n${s.rows[0].raw_text}\n\nIMPORTANT: Always answer questions based on this homework content. Never say you don't have homework context - you always have the context above.\n\n`;
        console.log("✅ Homework context found:", s.rows[0].raw_text?.substring(0, 100) + "...");
      } else {
        console.log("❌ No homework context found for scanId:", scanId);
      }
    } else {
      console.log("❌ No scanId provided in request");
    }

    const systemPrompt = `
      You are a patient, grade-appropriate tutoring assistant for a Grade 1 student.
      
      CRITICAL: You must ALWAYS respond based on the homework context provided above. 
      - If homework context is provided, answer questions specifically about that homework
      - Never say "I don't have homework context" or "no specific homework provided"
      - Always relate your answers to the scanned homework content
      - Provide step-by-step help for the specific problems shown in the homework
      - Use simple, encouraging language appropriate for a 6-year-old
      
      If the student asks about something not in the homework, guide them back to the homework tasks.
    `;

    const { text: aiReply, raw } = await askOpenAI(systemPrompt, grounding + message, { max_tokens: 800 });

    await pool.query(
      `INSERT INTO messages(conversation_id, sender, content, meta) VALUES($1,$2,$3,$4)`,
      [convId, "bot", aiReply, raw]
    );

    res.json({ conversationId: convId, reply: aiReply });
  } catch (err) {
    console.error("❌ Chat error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const r = await pool.query(
      `SELECT * FROM messages WHERE conversation_id=$1 ORDER BY created_at ASC`,
      [conversationId]
    );
    res.json(r.rows);
  } catch (err) {
    console.error("❌ History error:", err);
    res.status(500).json({ error: err.message });
  }
};
