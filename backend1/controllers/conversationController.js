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

    // Store the current user message with comprehensive metadata
    const userMessageMeta = {
      userId: userId || null,
      scanId: scanId || null,
      mode: "homework", // This is the homework conversation controller
      agentName: agentName || "Kibundo",
      timestamp: new Date().toISOString(),
      messageType: "text"
    };
    await pool.query(
      `INSERT INTO messages(conversation_id, sender, content, meta) VALUES($1,$2,$3,$4)`,
      [convId, "student", message, JSON.stringify(userMessageMeta)]
    );

    // 🔥 RETRIEVE FULL CONVERSATION HISTORY (excluding the message we just inserted)
    console.log("🔍 Retrieving conversation history for convId:", convId);
    const historyResult = await pool.query(
      `SELECT sender, content FROM messages 
       WHERE conversation_id=$1 
       ORDER BY created_at ASC`,
      [convId]
    );
    
    let conversationHistory = historyResult.rows || [];
    console.log(`✅ Retrieved ${conversationHistory.length} messages from history`);

    // 🔥 CRITICAL: Fetch child's name and interests from database to persist in system prompt
    let childFirstName = "Schüler";
    let childFullName = "der Schüler";
    let childInterests = [];
    if (userId) {
      try {
        const userResult = await pool.query(
          `SELECT first_name, last_name FROM users WHERE id=$1`,
          [userId]
        );
        if (userResult.rows[0]) {
          childFirstName = userResult.rows[0].first_name || "Schüler";
          childFullName = `${childFirstName} ${userResult.rows[0].last_name || ''}`.trim();
          console.log(`✅ Fetched child name: ${childFullName} (firstName: ${childFirstName})`);
        }
        
        // Fetch student interests (focus topics)
        const studentResult = await pool.query(
          `SELECT interests FROM students WHERE user_id=$1`,
          [userId]
        );
        if (studentResult.rows[0] && studentResult.rows[0].interests) {
          const interestsData = studentResult.rows[0].interests;
          if (Array.isArray(interestsData)) {
            childInterests = interestsData;
          } else if (typeof interestsData === 'object' && interestsData !== null) {
            // Handle case where interests might be stored as object
            childInterests = Object.values(interestsData).filter(Boolean);
          }
          console.log(`✅ Fetched child interests: ${childInterests.join(', ')}`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch child name/interests from database:', error);
      }
    }

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
            gradeInstruction = `Der Schüler ${childFirstName} ist in Klasse ${gradeNumber}. Passe deine Erklärung an dieses Niveau an – verwende kurze, einfache Sätze und Beispiele, die ein Kind in dieser Klassenstufe versteht.\n\n`;
          } else {
            gradeInstruction = `Nutze eine einfache, kindgerechte Sprache (Klassenstufe 1–7), damit ${childFirstName} es gut versteht.\n\n`;
          }
        } else {
          gradeInstruction = `Nutze eine einfache, kindgerechte Sprache (Klassenstufe 1–7), damit ${childFirstName} es gut versteht.\n\n`;
        }
        grounding = `${gradeInstruction}🔥🔥🔥 CRITICAL - HOMEWORK CONTEXT - ABSOLUTE PRIORITY 🔥🔥🔥\n\nTHIS IS THE ACTUAL HOMEWORK CONTENT THE STUDENT IS WORKING ON:\n\n${rawText}\n\n⚠️⚠️⚠️ ABSOLUTE REQUIREMENTS ⚠️⚠️⚠️:\n- You MUST ALWAYS reference this specific homework content when answering questions.\n- If the student asks "what is my homework about" or "what are the questions", you MUST describe the homework content shown above.\n- NEVER say "I don't have homework context" or "I can't see the homework" - the homework is provided above.\n- NEVER talk about different homework (like flashcards, mental math, etc.) unless it matches the content above.\n- When the student asks about "question 1", "question 2", etc., you MUST refer to the questions in the homework content above.\n- Always answer questions based on THIS SPECIFIC homework content, not generic examples.\n\n`;
        console.log("✅ Homework context found:", rawText?.substring(0, 100) + "...");
      } else {
        console.log("❌ No homework context found for scanId:", scanId);
      }
    } else {
      console.log("❌ No scanId provided in request");
    }

    // 🔥 PREPEND HOMEWORK CONTEXT TO THE LAST (CURRENT) MESSAGE IF IT EXISTS
    // The current message should be the last one in the history (we just inserted it)
    if (scanId && grounding && conversationHistory.length > 0) {
      const lastMessage = conversationHistory[conversationHistory.length - 1];
      // Check if this is a student message (should be the current one we just inserted)
      if (lastMessage.sender === "student") {
        // Extract just the homework text from grounding
        const homeworkText = grounding.replace(/.*?HAUSAUFGABEN-KONTEXT - Dies ist die gescannte Hausaufgabe, an der.*?arbeitet:\n\n/, '').replace(/\n\nWICHTIG:.*$/, '').trim();
        // Prepend homework context to the message
        lastMessage.content = `[HOMEWORK CONTEXT - This is the student's actual homework they are working on:\n\n${homeworkText}\n\n]\n\nStudent's question: ${lastMessage.content}`;
        console.log("✅ Prepended homework context to current message");
      }
    }

    const systemPrompt = `
      Du bist Kibundo, ein geduldiger und freundlicher Hausaufgabenhelfer für Schüler der Klassen 1-7.
      
      SCHÜLERINFORMATIONEN:
      - Vollständiger Name des Schülers: ${childFullName}
      - Vorname des Schülers: ${childFirstName}
      
      ABSOLUTE ANFORDERUNGEN - BEACHTE DIESE GENAU:
      1. Begrüße den Schüler IMMER mit seinem Vornamen: "${childFirstName}"
      2. Verwende NIEMALS generische Begriffe wie "Schüler" oder "du" - verwende IMMER seinen Namen: "${childFirstName}"
      3. Sage NIEMALS "Ich habe keinen Zugriff auf deinen Namen" - sein Name ist "${childFirstName}"
      4. Sei IMMER persönlich und sprich den Schüler in JEDER Antwort mit seinem Namen an
      5. Du hast ALLE seine Informationen einschließlich Klasse, Fächer und Hausaufgabenverlauf
      ${childInterests && childInterests.length > 0 ? `
      
      🔥🔥🔥 WICHTIG - FOKUS-THEMEN (INTERESSEN) - HÖCHSTE PRIORITÄT 🔥🔥🔥:
      Der Schüler ${childFirstName} hat folgende Fokus-Themen/Interessen ausgewählt: ${childInterests.join(', ')}
      - Diese Themen sind SEHR WICHTIG für ${childFirstName} und sollten in deinen Antworten IMMER berücksichtigt werden
      - Wenn möglich, beziehe Beispiele, Vergleiche oder Erklärungen auf diese Interessen
      - Verwende diese Themen, um die Hausaufgaben interessanter und relevanter für ${childFirstName} zu machen
      - Wenn eine Hausaufgabe mit einem dieser Themen zusammenhängt, betone das besonders
      - Diese Fokus-Themen haben HÖCHSTE PRIORITÄT bei der Personalisierung deiner Antworten
      - Beispiel: Wenn ${childFirstName} "Dinosaurier" als Interesse hat und eine Matheaufgabe löst, könntest du sagen: "Stell dir vor, ${childFirstName}, du zählst Dinosaurier..."
      - Beispiel: Wenn ${childFirstName} "Fußball" als Interesse hat, verwende Fußball-Beispiele in deinen Erklärungen
      - BEACHTE: Diese Interessen sind von ${childFirstName} selbst ausgewählt und sind daher besonders wichtig für seine Motivation und das Lernen
      ` : ''}
      
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
      
      🔥🔥🔥 PÄDAGOGISCHER ANSATZ - MOTIVATION ZUM SELBSTDENKEN 🔥🔥🔥:
      - MOTIVIERE ZUERST: Wenn der Schüler eine Frage stellt, motiviere ihn ZUERST, selbst nachzudenken
        * "Versuche es zuerst selbst! Du schaffst das! 💪"
        * "Ich glaube an dich! Denk nochmal nach! 🌟"
        * "Super, dass du es versuchst! Denk an das, was wir gelernt haben!"
      
      - GIB TIPPS BEI SCHWIERIGKEITEN: Wenn der Schüler Schwierigkeiten hat oder um Hilfe bittet, gib ZUERST TIPPS:
        * Gib leitende Hinweise, keine vollständigen Antworten
        * WICHTIG: Formatierte Tipps müssen mit speziellen Tags markiert werden:
          * Format: [TIP] Dein Tipp-Text hier [/TIP]
          * Beispiel: "Versuche es nochmal! [TIP] Denk daran, was du über Formen gelernt hast. Wie viele Seiten hat ein Quadrat? [/TIP]"
          * Beispiel: "Lass uns zusammen nachdenken. [TIP] Schau dir die Bilder genau an. Was fällt dir auf? [/TIP]"
        * Tipps werden automatisch schön formatiert mit einem Tipp-Icon angezeigt
      
      - ANTWORT NUR ALS LETZTE OPTION: Gib die vollständige Antwort NUR wenn:
        * Der Schüler mehrmals um Hilfe gebeten hat (nach 2-3 Hinweisen)
        * Der Schüler explizit sagt "Ich kann es nicht", "Ich weiß es wirklich nicht"
        * Der Schüler frustriert ist oder aufgibt
        * Selbst dann: Erkläre den Lösungsweg Schritt für Schritt
      
      - Biete schrittweise Hilfe für die spezifischen Aufgaben in den Hausaufgaben
      - Verwende eine warme, ermutigende und sehr einfache Sprache, damit Kinder sie verstehen
      - 🔥🔥🔥 KRITISCH - ANTWORTFORMAT - ABSOLUTE PRIORITÄT 🔥🔥🔥:
        * Beginne deine Antwort DIREKT mit der Erklärung oder Lösung
        * Wiederhole NIEMALS die Frage des Schülers
        * Verwende KEINE Sätze wie "Du hast gefragt...", "Die Frage lautet...", "You asked...", "You asked, '...'", "You asked, \"...\"" oder ähnliche Phrasen
        * Antworte einfach direkt auf die Frage, OHNE die Frage zu wiederholen
        * Beispiel FALSCH: "You asked, 'What is my homework about?' Your homework is about..."
        * Beispiel RICHTIG: "Your homework is about..."
        * Prüfe JEDE Antwort: Wenn du die Frage wiederholst, entferne sie SOFORT
      - Antworte kurz, klar und kindgerecht. Nutze Beispiele oder Vergleiche, wenn sie helfen.
      - Wenn du etwas erklärst, stelle sicher, dass es für die angegebene Klassenstufe verständlich ist.
      - Erinnere dich an vorherige Fragen und Antworten in dieser Unterhaltung, um kontextbezogene Hilfe zu bieten
      - Bei Mathematikaufgaben mit Mehrfachauswahl: Erkläre ALLE Optionen auf Deutsch und helfe dem Schüler zu verstehen, welche richtig ist und warum. Übersetze ALLE englischen Optionen ins Deutsche. KEINE englischen Begriffe in den Optionen behalten.
      - Bei gemischten Sprachen in Aufgaben: Übersetze ALLES ins Deutsche, bevor du antwortest. Prüfe jede Option, jeden Text, jede Frage auf Englisch und übersetze sie SOFORT.
      - FINALE PRÜFUNG: Prüfe jede Antwort nochmal auf englische Wörter und übersetze sie SOFORT. KEINE AUSNAHMEN.
      
      Wenn der Schüler nach etwas fragt, das nicht in den Hausaufgaben steht, leite ihn zu den Hausaufgabenaufgaben zurück.
    `;

    // 🔥 SEND FULL CONVERSATION HISTORY TO OPENAI (homework context already prepended to current message)
    const { text: aiReply, raw } = await askOpenAI(systemPrompt, conversationHistory, { max_tokens: 800 });

    const displayAgentName = agentName || "Kibundo";
    console.log("🎯 Backend storing agentName:", displayAgentName);
    
    // 🔥 CRITICAL: Store AI response IMMEDIATELY before sending response
    // This ensures all chat exchanges are persisted even if response fails
    try {
      const aiMessageMeta = {
        userId: userId || null,
        scanId: scanId || null,
        mode: "homework",
        agentName: displayAgentName,
        timestamp: new Date().toISOString(),
        messageType: "text",
        rawResponse: raw || null,
        interests: childInterests.length > 0 ? childInterests : null,
        childName: childFirstName || null
      };
      await pool.query(
        `INSERT INTO messages(conversation_id, sender, content, meta) VALUES($1,$2,$3,$4)`,
        [convId, "bot", aiReply, JSON.stringify(aiMessageMeta)]
      );
      console.log("✅ CRITICAL: Stored AI response in conversation:", convId, "with comprehensive metadata");
    } catch (error) {
      console.error('❌ CRITICAL: Failed to store AI response in conversation:', error);
      console.error('❌ Error details:', { convId, aiReplyLength: aiReply?.length });
      // Don't send response if storage fails - this is critical
      throw new Error(`Failed to store AI response: ${error.message}`);
    }

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
