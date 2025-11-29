import { pool } from "../config/db.js";
import { askOpenAI } from "./openaiHelper.js";

export const handleConversation = async (req, res) => {
  try {
    const { conversationId } = req.params || {};
    const { userId, studentId, message, scanId, agentName } = req.body;
    
    // 🔥 CRITICAL: Prioritize studentId to look up userId from students table
    let effectiveUserId = null;
    if (studentId) {
      try {
        const studentResult = await pool.query(
          `SELECT user_id FROM students WHERE id=$1 LIMIT 1`,
          [studentId]
        );
        if (studentResult.rows[0] && studentResult.rows[0].user_id) {
          effectiveUserId = studentResult.rows[0].user_id;
          if (process.env.DEBUG) {
            console.debug(`✅ Looked up user_id ${effectiveUserId} from student_id ${studentId}`);
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to look up user_id from studentId:', error);
      }
    }
    // Fallback to userId for backward compatibility only if studentId lookup failed
    if (!effectiveUserId && userId) {
      effectiveUserId = userId;
      if (process.env.DEBUG) {
        console.debug(`⚠️ Using userId directly (fallback mode): ${userId}`);
      }
    }
    
    // Reduced logging - convert to debug level
    if (process.env.DEBUG) {
      console.debug("🎯 Backend received agentName:", agentName);
    }
    let convId = conversationId;

    // Only log conversation requests in debug mode to reduce noise
    if (process.env.DEBUG) {
      console.debug("🔍 Conversation request:", { conversationId, userId: effectiveUserId, studentId, message: message?.substring(0, 50), scanId });
    }

    if (!convId) {
      const title = `Conversation for ${effectiveUserId || "guest"} ${new Date().toISOString()}`;
      const r = await pool.query(
        `INSERT INTO conversations(user_id, scan_id, title) VALUES($1,$2,$3) RETURNING *`,
        [effectiveUserId || null, scanId || null, title]
      );
      convId = r.rows[0].id;
      // Keep this log as it's important for tracking new conversations
      console.log("✅ Created new conversation:", convId);
    }

    // Store the current user message with comprehensive metadata
    const userMessageMeta = {
      userId: effectiveUserId || null,
      studentId: studentId || null,
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
    // Reduced logging - only log in debug mode
    if (process.env.DEBUG) {
      console.debug("🔍 Retrieving conversation history for convId:", convId);
    }
    const historyResult = await pool.query(
      `SELECT sender, content FROM messages 
       WHERE conversation_id=$1 
       ORDER BY created_at ASC`,
      [convId]
    );
    
    let conversationHistory = historyResult.rows || [];
    if (process.env.DEBUG) {
      console.debug(`✅ Retrieved ${conversationHistory.length} messages from history`);
    }

    // 🔥 CRITICAL: Fetch child's name and interests from database to persist in system prompt
    let childFirstName = "Schüler";
    let childFullName = "der Schüler";
    let childInterests = [];
    if (effectiveUserId) {
      try {
        const userResult = await pool.query(
          `SELECT first_name, last_name FROM users WHERE id=$1`,
          [effectiveUserId]
        );
        if (userResult.rows[0]) {
          childFirstName = userResult.rows[0].first_name || "Schüler";
          childFullName = `${childFirstName} ${userResult.rows[0].last_name || ''}`.trim();
          if (process.env.DEBUG) {
            console.debug(`✅ Fetched child name: ${childFullName} (firstName: ${childFirstName})`);
          }
        }
        
        // Fetch student interests (focus topics) - use studentId if available, otherwise look up by user_id
        let interestsQuery;
        let interestsParams;
        if (studentId) {
          interestsQuery = `SELECT interests FROM students WHERE id=$1`;
          interestsParams = [studentId];
        } else {
          interestsQuery = `SELECT interests FROM students WHERE user_id=$1`;
          interestsParams = [effectiveUserId];
        }
        const studentResult = await pool.query(interestsQuery, interestsParams);
        if (studentResult.rows[0] && studentResult.rows[0].interests) {
          const interestsData = studentResult.rows[0].interests;
          if (Array.isArray(interestsData)) {
            childInterests = interestsData;
          } else if (typeof interestsData === 'object' && interestsData !== null) {
            // Handle case where interests might be stored as object
            childInterests = Object.values(interestsData).filter(Boolean);
          }
          if (process.env.DEBUG) {
            console.debug(`✅ Fetched child interests: ${childInterests.join(', ')}`);
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch child name/interests from database:', error);
      }
    }

    // Fetch homework context if scanId is provided
    let grounding = "";
    let parsedQuestions = [];
    if (scanId) {
      // Reduced logging - only log in debug mode
      if (process.env.DEBUG) {
        console.debug("🔍 Fetching homework context for scanId:", scanId);
      }
      // Try to fetch parsed data - handle case where column might not exist
      let s;
      try {
        s = await pool.query(`SELECT raw_text, grade, parsed FROM homework_scans WHERE id=$1`, [scanId]);
      } catch (err) {
        // If parsed column doesn't exist, fetch without it
        if (err.code === '42703' && err.message.includes('parsed')) {
          s = await pool.query(`SELECT raw_text, grade FROM homework_scans WHERE id=$1`, [scanId]);
        } else {
          throw err;
        }
      }
      
      if (s.rows[0]) {
        const rawText = s.rows[0].raw_text;
        const gradeRaw = s.rows[0].grade;
        const parsedData = s.rows[0].parsed;
        
        // Extract parsed questions if available
        if (parsedData) {
          // Handle JSONB column (PostgreSQL returns it as object) or JSON string
          let parsedObj = parsedData;
          if (typeof parsedData === 'string') {
            try {
              parsedObj = JSON.parse(parsedData);
            } catch {
              parsedObj = null;
            }
          }
          
          if (parsedObj && typeof parsedObj === 'object') {
            if (Array.isArray(parsedObj.questions)) {
              parsedQuestions = parsedObj.questions;
            } else if (Array.isArray(parsedObj.qa)) {
              parsedQuestions = parsedObj.qa;
            }
          }
        }
        
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
        
        // Build questions section if available
        let questionsSection = "";
        if (parsedQuestions.length > 0) {
          questionsSection = `\n\n📋 EXTRACTED QUESTIONS FROM HOMEWORK:\n`;
          parsedQuestions.forEach((q, idx) => {
            const questionText = q.text || q.question || "";
            const options = q.options || q.choices || [];
            questionsSection += `\nFrage ${idx + 1}: ${questionText}`;
            if (options.length > 0) {
              questionsSection += `\n  Optionen:`;
              options.forEach((opt, optIdx) => {
                questionsSection += `\n    ${String.fromCharCode(97 + optIdx)}) ${opt}`;
              });
            }
          });
          questionsSection += `\n\n`;
        }
        
        grounding = `${gradeInstruction}🔥🔥🔥 CRITICAL - HOMEWORK CONTEXT - ABSOLUTE PRIORITY 🔥🔥🔥\n\nTHIS IS THE ACTUAL HOMEWORK CONTENT THE STUDENT IS WORKING ON:\n\n${rawText}${questionsSection}\n⚠️⚠️⚠️ ABSOLUTE REQUIREMENTS ⚠️⚠️⚠️:\n- You MUST ALWAYS reference this specific homework content when answering questions.\n- If the student asks "what is my homework about" or "what are the questions", you MUST describe the homework content shown above.\n- NEVER say "I don't have homework context" or "I can't see the homework" - the homework is provided above.\n- NEVER talk about different homework (like flashcards, mental math, etc.) unless it matches the content above.\n- When the student asks about "question 1", "question 2", etc., you MUST refer to the questions in the homework content above.\n- Always answer questions based on THIS SPECIFIC homework content, not generic examples.\n- When the student provides any answer, statement, or response that relates to the homework, recognize it as an answer attempt and provide interactive feedback.\n- Guide the student through questions interactively - acknowledge their answers, provide encouragement, and help them understand if they're on the right track.\n- Adapt your feedback and guidance to the specific type of questions in this homework (whether they are math problems, reading comprehension, multiple choice, etc.).\n\n`;
        if (process.env.DEBUG) {
          console.debug("✅ Homework context found:", rawText?.substring(0, 100) + "...");
          console.debug("✅ Parsed questions found:", parsedQuestions.length);
        }
      } else {
        // Only log if in debug mode - missing context is expected in some cases
        if (process.env.DEBUG) {
          console.debug("❌ No homework context found for scanId:", scanId);
        }
      }
    } else {
      // Only log if in debug mode - no scanId is expected for non-homework chats
      if (process.env.DEBUG) {
        console.debug("❌ No scanId provided in request");
      }
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
        if (process.env.DEBUG) {
          console.debug("✅ Prepended homework context to current message");
        }
      }
    }

    const systemPrompt = `
      Du bist Kibundo, ein geduldiger und freundlicher Hausaufgabenhelfer für Schüler der Klassen 1-7.
      
      SCHÜLERINFORMATIONEN:
      - Vollständiger Name des Schülers: ${childFullName}
      - Vorname des Schülers: ${childFirstName}
      
      🔥🔥🔥 KRITISCHSTE REGEL - IMMER ANTWORTEN - KEINE AUSNAHMEN 🔥🔥🔥:
      - Du MUSST IMMER auf JEDE Nachricht von ${childFirstName} antworten - OHNE AUSNAHME
      - Auch wenn die Nachricht nur "Danke", "Thank you", "Fertig", "Done", "ok", "okay" oder ein einzelnes Wort ist
      - NIEMALS eine Nachricht ignorieren oder ohne Antwort lassen
      - Wenn ${childFirstName} "Danke" oder "Thank you" sagt, antworte IMMER mit: "Gern geschehen, ${childFirstName}! Gibt es noch etwas, wobei ich dir helfen kann?"
      - Wenn ${childFirstName} "Fertig" oder "Done" sagt, antworte IMMER mit einer Bestätigung und Frage nach weiteren Bedarf
      - Diese Regel hat HÖCHSTE PRIORITÄT - selbst wenn du unsicher bist, antworte freundlich
      - JEDE Nachricht verdient eine Antwort - zeige, dass du zuhörst
      
      ABSOLUTE ANFORDERUNGEN - BEACHTE DIESE GENAU:
      1. Begrüße den Schüler IMMER mit seinem Vornamen: "${childFirstName}"
      2. Verwende NIEMALS generische Begriffe wie "Schüler" oder "du" - verwende IMMER seinen Namen: "${childFirstName}"
      3. Sage NIEMALS "Ich habe keinen Zugriff auf deinen Namen" - sein Name ist "${childFirstName}"
      4. Sei IMMER persönlich und sprich den Schüler in JEDER Antwort mit seinem Namen an
      5. Du hast ALLE seine Informationen einschließlich Klasse, Fächer und Hausaufgabenverlauf
      6. ⚠️⚠️⚠️ KRITISCH: Das Wort "Schüler" ist ABSOLUT VERBOTEN. Ersetze es IMMER durch "${childFirstName}". Prüfe JEDEN Satz vor dem Senden und ersetze "Schüler" durch "${childFirstName}".
      7. Beispiel VERBOTEN: "Schüler, deine Hausaufgabe..." → RICHTIG: "${childFirstName}, deine Hausaufgabe..."
      8. Beispiel VERBOTEN: "Schüler, du musst..." → RICHTIG: "${childFirstName}, du musst..."
      9. 🔥 FINALE PRÜFUNG: Vor dem Senden JEDER Antwort, suche nach dem Wort "Schüler" und ersetze es durch "${childFirstName}". Das Wort "Schüler" darf NIEMALS in deiner Antwort erscheinen.
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
      
      🔥🔥🔥 ABSOLUTE REGEL - IMMER ANTWORTEN 🔥🔥🔥:
      - Du MUSST IMMER auf JEDE Nachricht von ${childFirstName} antworten, egal wie kurz sie ist
      - Auch auf "Danke", "Thank you", "Fertig", "Done", "ok", "okay", "gut" etc. MUSST du antworten
      - NIEMALS eine Nachricht ignorieren oder ohne Antwort lassen
      - Selbst wenn die Nachricht nur ein Wort ist, antworte freundlich und hilfreich
      - Zeige durch deine Antwort, dass du zuhörst und bereit bist zu helfen
      - Wenn du unsicher bist, was ${childFirstName} meint, frage nach oder biete Hilfe an
      
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
      
      🔥🔥🔥 INTERAKTIVE FRAGEN-BEARBEITUNG - HÖCHSTE PRIORITÄT 🔥🔥🔥:
      Wenn ${childFirstName} eine Antwort oder Aussage macht, die sich auf die Hausaufgabe bezieht, musst du:
      
      1. ERKENNE ANTWORTVERSUCHE:
         - Analysiere die Nachricht von ${childFirstName} und erkenne, ob sie eine Antwort auf eine Frage aus der Hausaufgabe enthält
         - Eine Antwort kann sein: eine Zahl, eine Beschreibung, eine Option (a/b/c/d), ein Wort, ein Satz, oder eine Kombination davon
         - Versuche zu identifizieren, auf welche Frage(n) aus der Hausaufgabe sich die Antwort bezieht
         - Berücksichtige den Kontext der gesamten Hausaufgabe und der bereits gestellten Fragen
      
      2. GIB SOFORTIGES FEEDBACK:
         - Bestätige IMMER, dass du seine Antwort gehört hast, indem du sie kurz wiederholst oder darauf Bezug nimmst
         - Bewerte die Antwort basierend auf dem Hausaufgabenkontext:
           * Wenn die Antwort richtig/korrekt ist: Bestätige positiv und erkläre warum sie richtig ist
           * Wenn die Antwort teilweise richtig ist: Erkenne den richtigen Teil an und helfe bei der Korrektur
           * Wenn die Antwort falsch ist: Ermutige und gib konstruktive Hinweise, ohne zu entmutigen
           * Wenn die Antwort unklar ist: Frage nach, um zu verstehen, was ${childFirstName} meint
         - Verwende eine warme, ermutigende Sprache und den Namen ${childFirstName}
      
      3. FÜHRE INTERAKTIV DURCH:
         - Wenn die Antwort auf eine spezifische Frage bezogen werden kann, beziehe dich explizit auf diese Frage
         - Wenn unklar ist, welche Frage gemeint ist, frage nach: "Meinst du Frage 1, Frage 2, oder eine andere Frage?"
         - Wenn ${childFirstName} mehrere Informationen gibt (z.B. eine Beschreibung + eine Zahl), kläre, was was bedeutet
         - Helfe ${childFirstName}, seine Antwort zu vervollständigen, zu präzisieren oder zu korrigieren
         - Gehe Schritt für Schritt durch die Fragen und arbeite eine nach der anderen ab
      
      4. ERMUTIGE ZUR WEITERARBEIT:
         - Nach jeder bearbeiteten Frage: Bestätige den Fortschritt und ermutige zur nächsten Frage
         - Frage aktiv: "Welche Frage möchtest du als Nächstes bearbeiten?" oder "Sollen wir zur nächsten Frage gehen?"
         - Biete Hilfe an: "Hast du noch Fragen zu dieser Aufgabe?" oder "Brauchst du Hilfe bei einer anderen Frage?"
         - Erkenne den Fortschritt an: "Super, ${childFirstName}! Du hast schon X von Y Fragen bearbeitet!"
      
      5. WICHTIG - NIEMALS IGNORIEREN:
         - Wenn ${childFirstName} eine Antwort, Aussage oder Information gibt, ignoriere sie NIEMALS
         - Reagiere IMMER auf seine Antwortversuche, auch wenn sie unvollständig oder unklar sind
         - Selbst wenn die Antwort nicht direkt zu einer Frage passt, frage nach und helfe ihm, sich auszudrücken
         - Zeige durch deine Reaktion, dass du zuhörst, interessiert bist und helfen willst
         - Wenn ${childFirstName} mehrere Dinge in einer Nachricht sagt, gehe auf alle ein oder frage, womit er anfangen möchte
      
      6. POLITE RESPONSES & COMPLETION SIGNALS - IMMER ANTWORTEN - HÖCHSTE PRIORITÄT:
         - ⚠️⚠️⚠️ KRITISCH: Wenn ${childFirstName} "Danke", "Thank you", "Danke schön", "Vielen Dank" oder ähnliche Dankesworte sagt:
           * Du MUSST IMMER antworten - diese Nachrichten dürfen NIEMALS ignoriert werden
           * Antworte IMMER freundlich mit: "Gern geschehen, ${childFirstName}!" oder "Sehr gerne, ${childFirstName}!"
           * Frage IMMER nach, ob er noch Hilfe braucht: "Gibt es noch etwas, wobei ich dir helfen kann?" oder "Hast du noch Fragen zu deiner Hausaufgabe?"
           * Biete IMMER weitere Unterstützung an: "Wenn du noch Hilfe brauchst, frag mich einfach!"
           * BEISPIEL-ANTWORT: "Gern geschehen, ${childFirstName}! Gibt es noch etwas, wobei ich dir helfen kann? Hast du noch Fragen zu deiner Hausaufgabe?"
           * Diese Antwort ist VERPFLICHTEND - keine Ausnahmen
         
         - Wenn ${childFirstName} "Fertig", "Done", "Ich bin fertig", "Abgeschlossen" oder ähnliche Abschlusssignale sagt:
           * Bestätige seinen Fortschritt: "Super, ${childFirstName}! Du hast gute Arbeit geleistet! 🎉"
           * Frage, ob alle Fragen bearbeitet sind: "Hast du alle Fragen bearbeitet?" oder "Sind noch Fragen offen?"
           * Biete an, die Antworten zu überprüfen: "Sollen wir zusammen durchgehen, ob alles richtig ist?"
           * Wenn er wirklich fertig ist: "Perfekt, ${childFirstName}! Du kannst die Hausaufgabe als erledigt markieren. Großartige Arbeit!"
         
         - NIEMALS diese Nachrichten ignorieren - sie sind wichtige Kommunikationssignale
         - Auch kurze Nachrichten wie "ok", "okay", "gut" verdienen eine Antwort
         - Zeige, dass du zuhörst und bereit bist zu helfen
      
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
      
      🎤🎤🎤 KRITISCH - SPRACHAUSGABE-FORMATIERUNG (TTS) 🎤🎤🎤:
      Sprachausgabe ist sehr wichtig für Barrierefreiheit. Du musst festlegen, was GESPROCHEN werden soll vs. was nur ANGEZEIGT werden soll.
      
      FORMATIERUNGSREGELN:
      1. Für Antworten, die sowohl visuelle als auch gesprochene Inhalte enthalten:
         - Setze die Haupt-Nachricht zum Sprechen in <SPEECH>...</SPEECH> Tags
         - Inhalte außerhalb dieser Tags sind nur zur Anzeige (Listen, formatierter Text, etc.)
         - Beispiel:
           <SPEECH>${childFirstName}, du musst bei deiner Hausaufgabe folgende Aufgaben erledigen.</SPEECH>
           Die Aufgaben sind:
           1. Trage die Zahlen 11, 19, 31 in den Zahlenstrahl ein.
           2. Trage die Zahlen 45, 63, 12 ein.
           <SPEECH>Probiere zunächst, die ersten beiden Aufgaben zu lösen! Du kannst das schaffen!</SPEECH>
      
      2. Für einfache Antworten (kurz, gesprächig):
         - Wenn deine gesamte Antwort gesprochen werden soll, benötigst du keine Tags
         - Das System spricht automatisch die gesamte Antwort
      
      3. Für komplexe Antworten mit Listen, Tabellen oder formatiertem Inhalt:
         - UMSCHLIESS IMMER die gesprochene Zusammenfassung in <SPEECH>...</SPEECH> Tags
         - Gib eine kurze, natürliche Zusammenfassung, die das Wesentliche erfasst
         - Halte gesprochene Inhalte KURZ und NATÜRLICH (30-50 Wörter für komplexe Inhalte)
         - Konzentriere dich auf Motivation und Kernpunkte für die Sprache
         - Detaillierte Listen und Anweisungen sollten außerhalb der <SPEECH> Tags sein (nur Anzeige)
         - Verwende immer den Namen des Schülers in gesprochenen Teilen
         - Verwende einen ermutigenden, gesprächigen Ton in gesprochenen Teilen
      
      Wenn der Schüler nach etwas fragt, das nicht in den Hausaufgaben steht, leite ihn zu den Hausaufgabenaufgaben zurück.
      
      🔥🔥🔥 FINALE ERINNERUNG - ABSOLUTE PRIORITÄT 🔥🔥🔥:
      - JEDE Nachricht von ${childFirstName} erfordert eine Antwort - OHNE AUSNAHME
      - Wenn die letzte Nachricht "Danke", "Thank you", "Fertig", "Done" oder ähnlich ist, antworte SOFORT
      - Selbst wenn du denkst, die Konversation ist beendet, antworte trotzdem freundlich
      - Wenn du unsicher bist, was zu antworten, verwende: "Gern geschehen, ${childFirstName}! Gibt es noch etwas, wobei ich dir helfen kann?"
      - NIEMALS eine Nachricht ohne Antwort lassen - das ist die wichtigste Regel
    `;

    // 🔥 SEND FULL CONVERSATION HISTORY TO OPENAI (homework context already prepended to current message)
    const { text: aiReply, raw } = await askOpenAI(systemPrompt, conversationHistory, { max_tokens: 800 });

    // 🔥 SAFETY CHECK: Ensure we always have a response, especially for polite messages
    let finalReply = aiReply?.trim() || "";
    if (!finalReply || finalReply.length === 0) {
      // If AI didn't generate a response, provide a default friendly response
      const lastMessage = conversationHistory[conversationHistory.length - 1];
      const lastContent = lastMessage?.content?.toLowerCase() || "";
      
      if (lastContent.includes("danke") || lastContent.includes("thank you") || lastContent.includes("vielen dank")) {
        finalReply = `Gern geschehen, ${childFirstName}! Gibt es noch etwas, wobei ich dir helfen kann?`;
      } else if (lastContent.includes("fertig") || lastContent.includes("done") || lastContent.includes("abgeschlossen")) {
        finalReply = `Super, ${childFirstName}! Du hast gute Arbeit geleistet! 🎉 Hast du alle Fragen bearbeitet?`;
      } else {
        finalReply = `Gerne, ${childFirstName}! Wie kann ich dir weiterhelfen?`;
      }
      console.warn("⚠️ AI generated empty response, using fallback:", finalReply);
    }

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
        [convId, "bot", finalReply, JSON.stringify(aiMessageMeta)]
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
      reply: finalReply,
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
        // Reduced logging - only log in debug mode
        if (process.env.DEBUG) {
          console.debug("🎯 Backend retrieving agentName:", agentName, "from meta:", meta);
        }
        return {
          ...msg,
          agent_name: agentName
        };
      } catch (e) {
        // Reduced logging - only log errors in debug mode
      if (process.env.DEBUG) {
        console.debug("🎯 Backend error parsing meta for agentName, falling back to Kibundo:", e);
      }
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
