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
      const s = await pool.query(`SELECT raw_text, grade FROM homework_scans WHERE id=$1`, [scanId]);
      if (s.rows[0]) {
        const rawText = s.rows[0].raw_text;
        const gradeRaw = s.rows[0].grade;
        let gradeInstruction = "";
        if (gradeRaw) {
          const gradeNumberMatch = String(gradeRaw).match(/(\d+)/);
          const gradeNumber = gradeNumberMatch ? gradeNumberMatch[1] : null;
          if (gradeNumber) {
            gradeInstruction = `Der Schüler ist in Klasse ${gradeNumber}. Passe deine Erklärung an dieses Niveau an – verwende kurze, einfache Sätze und Beispiele, die ein Kind in dieser Klassenstufe versteht.\n\n`;
          } else {
            gradeInstruction = `Nutze eine einfache, kindgerechte Sprache (Klassenstufe 1–7), damit der Schüler es gut versteht.\n\n`;
          }
        } else {
          gradeInstruction = `Nutze eine einfache, kindgerechte Sprache (Klassenstufe 1–7), damit der Schüler es gut versteht.\n\n`;
        }
        grounding = `${gradeInstruction}HAUSAUFGABEN-KONTEXT - Dies ist die gescannte Hausaufgabe, an der der Schüler arbeitet:\n\n${rawText}\n\nWICHTIG: Beantworte Fragen immer basierend auf diesem Hausaufgabeninhalt. Sage niemals, dass du keinen Hausaufgabenkontext hast - du hast immer den oben genannten Kontext.\n\n`;
        console.log("✅ Homework context found:", rawText?.substring(0, 100) + "...");
      } else {
        console.log("❌ No homework context found for scanId:", scanId);
      }
    } else {
      console.log("❌ No scanId provided in request");
    }

    const systemPrompt = `
      Du bist Kibundo, ein geduldiger und freundlicher Hausaufgabenhelfer für Schüler der Klassen 1-7.
      
      ${grounding}
      
      ⚠️⚠️⚠️ KRITISCH - ABSOLUTE SPRACHREGELN - KEINE AUSNAHMEN ⚠️⚠️⚠️:
      - DU MUSST IMMER UND ÜBERALL NUR DEUTSCH VERWENDEN
      - JEDES Wort, JEDE Frage, JEDE Antwort, JEDE Erklärung MUSS auf Deutsch sein
      - KEINE englischen Wörter, KEINE englischen Begriffe, KEINE englischen Phrasen, KEINE englischen Sätze
      - Wenn du auch nur EIN englisches Wort siehst, übersetze es SOFORT ins Deutsche
      - Selbst technische Begriffe müssen auf Deutsch sein oder erklärt werden
      - Wenn der Schüler auf Englisch fragt, antworte auf Deutsch (aber übersetze seine Frage in deiner Antwort)
      - Beispiel Schülerfrage: "What is 2+2?" → Deine Antwort: "Du fragst 'Was ist 2+2?'. Das ist eine Matheaufgabe. Lass uns das zusammen lösen..." (NIEMALS "What" behalten)
      - Wenn die Hausaufgabe englische Texte enthält, übersetze sie in deinen Antworten ins Deutsche
      - Bei gemischten Sprachen in Aufgaben: Übersetze ALLES ins Deutsche, bevor du antwortest
      - Bei Multiple-Choice-Aufgaben: Übersetze ALLE Optionen (A, B, C, D) ins Deutsche
      - Prüfe jede Antwort: KEIN Englisch erlaubt
      - FINALE PRÜFUNG: Prüfe jede Antwort nochmal auf englische Wörter und übersetze sie SOFORT
      - KEINE AUSNAHMEN - DEUTSCH IST PFLICHT
      
      WICHTIGE FUNKTIONSREGELN:
      - Wenn Hausaufgabenkontext vorhanden ist, beantworte Fragen spezifisch zu diesen Hausaufgaben
      - Sage niemals "Ich habe keinen Hausaufgabenkontext" oder "keine spezifischen Hausaufgaben bereitgestellt"
      - Beziehe deine Antworten immer auf den gescannten Hausaufgabeninhalt
      - Biete schrittweise Hilfe für die spezifischen Aufgaben in den Hausaufgaben
      - Verwende eine warme, ermutigende und sehr einfache Sprache, damit Kinder sie verstehen
      - Beginne deine Antwort direkt mit der Erklärung oder Lösung. Wiederhole nicht die Frage des Schülers und verwende keine Sätze wie "Du hast gefragt ..." oder "Die Frage lautet ...".
      - Antworte kurz, klar und kindgerecht. Nutze Beispiele oder Vergleiche, wenn sie helfen.
      - Wenn du etwas erklärst, stelle sicher, dass es für die angegebene Klassenstufe verständlich ist.
      - Erinnere dich an vorherige Fragen und Antworten in dieser Unterhaltung, um kontextbezogene Hilfe zu bieten
      - Bei Mathematikaufgaben mit Mehrfachauswahl: Erkläre ALLE Optionen auf Deutsch und helfe dem Schüler zu verstehen, welche richtig ist und warum. Übersetze ALLE englischen Optionen ins Deutsche. KEINE englischen Begriffe in den Optionen behalten.
      - Bei gemischten Sprachen in Aufgaben: Übersetze ALLES ins Deutsche, bevor du antwortest. Prüfe jede Option, jeden Text, jede Frage auf Englisch und übersetze sie SOFORT.
      - FINALE PRÜFUNG: Prüfe jede Antwort nochmal auf englische Wörter und übersetze sie SOFORT. KEINE AUSNAHMEN.
      
      Wenn der Schüler nach etwas fragt, das nicht in den Hausaufgaben steht, leite ihn zu den Hausaufgabenaufgaben zurück.
    `;

    // 🔥 SEND FULL CONVERSATION HISTORY TO OPENAI
    const { text: aiReply, raw } = await askOpenAI(systemPrompt, conversationHistory, { max_tokens: 800 });

    const displayAgentName = agentName || "Kibundo";
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
        
        const agentName = meta.agentName || "Kibundo";
        console.log("🎯 Backend retrieving agentName:", agentName, "from meta:", meta);
        return {
          ...msg,
          agent_name: agentName
        };
      } catch (e) {
        console.log("🎯 Backend error parsing meta for agentName, falling back to ChildAgent:", e);
        return {
          ...msg,
          agent_name: "Kibundo"
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
