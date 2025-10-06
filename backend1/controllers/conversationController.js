import { pool } from "../db.js";
import { askOpenAI } from "./openaiHelper.js";

export const handleConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId, message, scanId } = req.body;
    let convId = conversationId;

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
      const s = await pool.query(`SELECT raw_text FROM homework_scans WHERE id=$1`, [scanId]);
      if (s.rows[0]) grounding = `Homework context:\n${s.rows[0].raw_text}\n\n`;
    }

    const systemPrompt = `
      You are a patient, grade-appropriate tutoring assistant.
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
