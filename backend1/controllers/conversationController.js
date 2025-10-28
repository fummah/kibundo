import { pool } from "../config/db.js";
import { askOpenAI } from "./openaiHelper.js";

export const handleConversation = async (req, res) => {
  try {
    const { conversationId } = req.params || {};
    const { userId, message, scanId, agentName } = req.body;
    console.log("🎯 Backend received agentName:", agentName);
    let convId = conversationId;

    console.log("🔍 Conversation request:", { conversationId, userId, message: message?.substring(0, 50), scanId });

    if (!convId) {
      const title = `Conversation for ${userId || "guest"} ${new Date().toISOString()}`;
      const r = await pool.query(
        `INSERT INTO conversations(user_id, scan_id, title) VALUES($1,$2,$3) RETURNING *`,
        [userId || null, scanId || null, title]
      );
      convId = r.rows[0].id;
      console.log("✅ Created new conversation:", convId);
    }

    // Store the current user message
    await pool.query(
      `INSERT INTO messages(conversation_id, sender, content) VALUES($1,$2,$3)`,
      [convId, "student", message]
    );

    // 🔥 RETRIEVE FULL CONVERSATION HISTORY (excluding the message we just inserted)
    console.log("🔍 Retrieving conversation history for convId:", convId);
    const historyResult = await pool.query(
      `SELECT sender, content FROM messages 
       WHERE conversation_id=$1 
       ORDER BY created_at ASC`,
      [convId]
    );
    
    const conversationHistory = historyResult.rows || [];
    console.log(`✅ Retrieved ${conversationHistory.length} messages from history`);

    // Fetch homework context if scanId is provided
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
      
      ${grounding}
      
      CRITICAL: You must ALWAYS respond based on the homework context provided above. 
      - If homework context is provided, answer questions specifically about that homework
      - Never say "I don't have homework context" or "no specific homework provided"
      - Always relate your answers to the scanned homework content
      - Provide step-by-step help for the specific problems shown in the homework
      - Use simple, encouraging language appropriate for a 6-year-old
      - Remember previous questions and answers in this conversation to provide contextual help
      
      If the student asks about something not in the homework, guide them back to the homework tasks.
    `;

    // 🔥 SEND FULL CONVERSATION HISTORY TO OPENAI
    const { text: aiReply, raw } = await askOpenAI(systemPrompt, conversationHistory, { max_tokens: 800 });

    const displayAgentName = agentName || "Homework Assistant";
    console.log("🎯 Backend storing agentName:", displayAgentName);
    
    await pool.query(
      `INSERT INTO messages(conversation_id, sender, content, meta) VALUES($1,$2,$3,$4)`,
      [convId, "bot", aiReply, JSON.stringify({ ...raw, agentName: displayAgentName })]
    );

    res.json({ 
      conversationId: convId, 
      reply: aiReply,
      agentName: displayAgentName
    });
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
    
    // Extract agent_name from meta field for each message
    const messagesWithAgentName = r.rows.map(msg => {
      try {
        // 🔥 Check if meta is already an object or needs parsing
        let meta = msg.meta;
        if (typeof meta === 'string') {
          meta = JSON.parse(meta);
        } else if (!meta || typeof meta !== 'object') {
          meta = {};
        }
        
        const agentName = meta.agentName || "ChildAgent";
        console.log("🎯 Backend retrieving agentName:", agentName, "from meta:", meta);
        return {
          ...msg,
          agent_name: agentName
        };
      } catch (e) {
        console.log("🎯 Backend error parsing meta for agentName, falling back to ChildAgent:", e);
        return {
          ...msg,
          agent_name: "ChildAgent"
        };
      }
    });
    
    res.json(messagesWithAgentName);
  } catch (err) {
    console.error("❌ History error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 🔥 NEW: Search/filter conversations
export const searchConversations = async (req, res) => {
  try {
    const { scan_id, user_id } = req.query;
    console.log("🔍 Searching conversations with filters:", { scan_id, user_id });
    
    let query = `SELECT * FROM conversations WHERE 1=1`;
    const params = [];
    let paramIndex = 1;
    
    if (scan_id) {
      query += ` AND scan_id = $${paramIndex}`;
      params.push(scan_id);
      paramIndex++;
    }
    
    if (user_id) {
      query += ` AND user_id = $${paramIndex}`;
      params.push(user_id);
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC`;
    
    console.log("🔍 Executing query:", query, "with params:", params);
    const result = await pool.query(query, params);
    
    console.log(`✅ Found ${result.rows.length} conversations`);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Search conversations error:", err);
    res.status(500).json({ error: err.message });
  }
};
