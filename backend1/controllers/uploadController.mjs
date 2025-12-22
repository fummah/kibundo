import fs from "fs";
import path from "path";
import { pool } from "../config/db.js";
import OpenAI from "openai";
import multer from "multer";

// ✅ Ensure /uploads folder exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// ✅ Multer setup
export const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + "-" + file.originalname);
    },
  }),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
});

// Lazy-load OpenAI client to ensure env vars are loaded
let client = null;
const getOpenAIClient = () => {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
};

// ✅ API Usage Tracking (in-memory for development, use Redis/DB for production)
const apiUsageStats = {
  totalCalls: 0,
  totalTokens: 0,
  totalCost: 0, // Estimated cost in USD
  lastReset: new Date(),
  callsToday: 0,
  costsToday: 0,
};

// GPT-4o-mini pricing (as of 2024): $0.150/1M input tokens, $0.600/1M output tokens
const PRICING = {
  input: 0.150 / 1_000_000,  // $0.150 per 1M tokens
  output: 0.600 / 1_000_000, // $0.600 per 1M tokens
};

function trackAPIUsage(tokensUsed, type = 'vision') {
  const inputTokens = tokensUsed?.prompt_tokens || 0;
  const outputTokens = tokensUsed?.completion_tokens || 0;
  const totalTokens = tokensUsed?.total_tokens || inputTokens + outputTokens;
  
  const cost = (inputTokens * PRICING.input) + (outputTokens * PRICING.output);
  
  apiUsageStats.totalCalls++;
  apiUsageStats.totalTokens += totalTokens;
  apiUsageStats.totalCost += cost;
  apiUsageStats.callsToday++;
  apiUsageStats.costsToday += cost;
  
  console.log(`💰 API Usage: Call #${apiUsageStats.totalCalls} | Tokens: ${totalTokens} | Cost: $${cost.toFixed(4)} | Total: $${apiUsageStats.totalCost.toFixed(2)}`);
  
  // Reset daily counters at midnight
  const now = new Date();
  if (now.getDate() !== apiUsageStats.lastReset.getDate()) {
    console.log(`📊 Daily Reset - Yesterday: ${apiUsageStats.callsToday} calls, $${apiUsageStats.costsToday.toFixed(2)}`);
    apiUsageStats.callsToday = 0;
    apiUsageStats.costsToday = 0;
    apiUsageStats.lastReset = now;
  }
  
  return { totalTokens, cost };
}

let gradeColumnEnsured = false;
async function ensureGradeColumnIsText() {
  if (gradeColumnEnsured) return;
  try {
    await pool.query(
      "ALTER TABLE homework_scans ALTER COLUMN grade TYPE TEXT USING grade::text"
    );
  } catch (err) {
    const msg = String(err?.message || "");
    if (
      !msg.includes("cannot cast type") &&
      !msg.includes("already of type") &&
      !msg.includes("does not exist")
    ) {
      console.warn("⚠️ Unable to alter homework_scans.grade to TEXT:", err.message);
    }
  } finally {
    gradeColumnEnsured = true;
  }
}

// ✅ Enhanced subject detector with confidence scoring (Grades 1–7)
function detectSubject(text) {
  if (!text) return "Sonstiges";
  const lower = text.toLowerCase();
  
  // Score-based detection for better accuracy
  const scores = {
    Mathe: 0,
    Deutsch: 0,
    Englisch: 0,
    Sachkunde: 0,
    Biologie: 0,
    Erdkunde: 0,
    Geschichte: 0,
    Religion: 0,
    Ethik: 0,
    Kunst: 0,
    Musik: 0,
    Sport: 0,
    Technik: 0,
  };

  // 🧮 Math - highest priority if numbers present
  if (/[0-9+\-×÷=<>]/.test(text)) scores.Mathe += 10;
  if (/\b(plus|minus|mal|geteilt|rechnen|addieren|subtrahieren|multiplizieren|dividieren|summe|differenz|produkt|quotient|lösung|aufgabe|berechne|ergebnis|gleichung|term|zahl|prozent|bruch|kommazu)\b/i.test(lower)) 
    scores.Mathe += 5;
  if (/\b(mathe|mathematik|algebra|geometrie)\b/i.test(lower)) scores.Mathe += 15;

  // 📖 German
  if (/\b(der|die|das|ein|eine|dem|den|des)\b/i.test(lower)) scores.Deutsch += 2;
  if (/\b(lesen|schreiben|buchstaben|wort|satz|absatz|geschichte|text|grammatik|rechtschreibung|aufsatz|diktat|erzählen|vorlesen|literatur|gedicht|märchen|wörterbuch|verb|nomen|adjektiv|silbe)\b/i.test(lower))
    scores.Deutsch += 8;
  if (/\b(deutsch|deutschunterricht)\b/i.test(lower)) scores.Deutsch += 15;

  // 🇬🇧 English
  if (/\b(the|and|is|are|was|were|have|has|do|does)\b/i.test(lower)) scores.Englisch += 2;
  if (/\b(english|vocabulary|word|school|teacher|book|dog|cat|color|hello|goodbye|please|thank|sorry|yes|no|family|house|food|animal)\b/i.test(lower))
    scores.Englisch += 8;
  if (/\b(englisch|englischunterricht)\b/i.test(lower)) scores.Englisch += 15;

  // 🔬 Sachkunde (Grades 1–4)
  if (/\b(tier|pflanze|natur|experiment|wasser|luft|erde|umwelt|körper|sinne|sehen|hören|riechen|schmecken|fühlen|wetter|jahreszeit|frühling|sommer|herbst|winter|sonne|mond|stern|tag|nacht|energie|strom|magnet|licht|schatten)\b/i.test(lower))
    scores.Sachkunde += 8;
  if (/\b(sachkunde|sachunterricht)\b/i.test(lower)) scores.Sachkunde += 15;

  // 🧫 Biology (Grades 5+)
  if (/\b(zelle|organismus|pflanzen|tiere|biologie|ökosystem|atmung|verdauung|herz|blut|knochen|muskel|organ|fotosynthese|evolution|genetik|dna|nahrungskette|lebensraum)\b/i.test(lower))
    scores.Biologie += 8;
  if (/\b(biologie|biologieunterricht)\b/i.test(lower)) scores.Biologie += 15;

  // 🗺 Geography
  if (/\b(erde|karte|land|länder|kontinent|europa|asien|afrika|amerika|australien|deutschland|stadt|dorf|hauptstadt|meer|ozean|fluss|see|berg|gebirge|tal|hügel|richtung|norden|süden|osten|westen|kompass|klima|wüste|regenwald)\b/i.test(lower))
    scores.Erdkunde += 8;
  if (/\b(erdkunde|geografie|geographie)\b/i.test(lower)) scores.Erdkunde += 15;

  // 📜 History
  if (/\b(geschichte|historisch|vergangenheit|antike|mittelalter|neuzeit|krieg|frieden|könig|königin|kaiser|ritter|burg|schloss|römer|griechen|ägypter|pharao|pyramide|datum|jahr|jahrhundert|epoche|ereignis|revolution)\b/i.test(lower))
    scores.Geschichte += 8;
  if (/\b(geschichtsunterricht)\b/i.test(lower)) scores.Geschichte += 15;

  // ✝️ Religion
  if (/\b(gott|bibel|koran|thora|kirche|moschee|synagoge|tempel|religion|glaube|jesus|mohammed|moses|buddha|heilig|beten|gebet|gottesdienst|engel|himmel|hölle|christentum|islam|judentum|buddhismus)\b/i.test(lower))
    scores.Religion += 8;
  if (/\b(religionsunterricht)\b/i.test(lower)) scores.Religion += 15;

  // 🧠 Ethics
  if (/\b(ethik|moral|werte|wert|gerechtigkeit|respekt|toleranz|freundschaft|ehrlichkeit|verantwortung|gewissen|gut|böse|richtig|falsch|konflikt|streit|versöhnung)\b/i.test(lower))
    scores.Ethik += 8;
  if (/\b(ethikunterricht)\b/i.test(lower)) scores.Ethik += 15;

  // 🎨 Art
  if (/\b(malen|zeichnen|farbe|bild|kunst|künstler|pinsel|stift|kreide|wasserfarbe|basteln|formen|collage|skulptur|gemälde|portrait|landschaft|rot|blau|gelb|grün)\b/i.test(lower))
    scores.Kunst += 8;
  if (/\b(kunstunterricht)\b/i.test(lower)) scores.Kunst += 15;

  // 🎵 Music
  if (/\b(musik|note|noten|lied|singen|song|instrument|gitarre|klavier|flöte|trommel|geige|cello|rhythmus|melodie|takt|ton|hören|komponist|orchester|chor|konzert)\b/i.test(lower))
    scores.Musik += 8;
  if (/\b(musikunterricht)\b/i.test(lower)) scores.Musik += 15;

  // 🤸‍♀️ Sports
  if (/\b(sport|laufen|rennen|springen|werfen|turnen|spielen|ball|fußball|basketball|volleyball|handball|schwimmen|bewegung|übung|training|fitness|team|mannschaft|wettkampf|sieg|niederlage)\b/i.test(lower))
    scores.Sport += 8;
  if (/\b(sportunterricht)\b/i.test(lower)) scores.Sport += 15;

  // 🔧 Technical / Crafts
  if (/\b(technik|technisch|bauen|konstruieren|werkzeug|hammer|säge|schrauben|holz|metall|basteln|konstruktion|mechanik|elektronik|schaltung|computer|programmieren)\b/i.test(lower))
    scores.Technik += 8;
  if (/\b(technikunterricht|werken)\b/i.test(lower)) scores.Technik += 15;

  // Find subject with highest score
  let maxScore = 0;
  let detectedSubject = "Sonstiges";
  
  for (const [subject, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedSubject = subject;
    }
  }
  
  // Only return detected subject if confidence is high enough (>= 5 points)
  if (maxScore >= 5) {
    console.log(`📚 Subject detected: ${detectedSubject} (confidence: ${maxScore})`);
    return detectedSubject;
  }
  
  console.log(`📚 Subject unclear, defaulting to Sonstiges (max score: ${maxScore})`);
  return "Sonstiges";
}

// ✅ Simple upload route
export const handleSimpleUpload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const fileUrl = `/uploads/${req.file.filename}`;
    console.log("✅ File uploaded:", fileUrl);
    res.json({ success: true, message: "File uploaded successfully", fileUrl });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ error: err.message || "File upload failed" });
  }
};

// ✅ Main upload + AI vision
export const handleUpload = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRoleId = req.user?.role_id;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Get file path - multer sets req.file.path to the full path
    const filePath = req.file.path;
    const fileUrl = `/uploads/${req.file.filename}`;
    const mimeType = req.file.mimetype;
    
    // Log file info for debugging
    console.log("📁 File upload info:", {
      path: filePath,
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: mimeType,
      size: req.file.size,
      cwd: process.cwd(),
      fileExists: fs.existsSync(filePath)
    });

    // 🔥 Handle student_id from request body (for parent viewing child scenario)
    // FormData fields are available in req.body
    console.log("📤 Upload request - userId:", userId, "userRoleId:", userRoleId, "req.body:", req.body);
    let studentId = req.body?.student_id ? parseInt(req.body.student_id, 10) : null;
    if (isNaN(studentId)) studentId = null;
    console.log("📤 Parsed student_id from request:", studentId);
    let classId = null;

    if (studentId && !isNaN(studentId)) {
      // Use provided student_id and fetch class_id
      console.log("📚 Using provided student_id:", studentId);
      const studentRes = await pool.query(
        "SELECT id, class_id FROM students WHERE id = $1 LIMIT 1",
        [studentId]
      );
      const studentRow = studentRes.rows[0] || {};
      if (studentRow.id) {
        classId = studentRow.class_id || null;
        // Verify the student belongs to the user (if user is parent, check if student is their child)
        if (userRoleId === 2) {
          // User is a parent - verify student is their child
          const parentRes = await pool.query(
            "SELECT id FROM parents WHERE user_id = $1 LIMIT 1",
            [userId]
          );
          if (parentRes.rows[0]) {
            const parentId = parentRes.rows[0].id;
            const childCheck = await pool.query(
              "SELECT id FROM students WHERE id = $1 AND parent_id = $2 LIMIT 1",
              [studentId, parentId]
            );
            if (!childCheck.rows[0]) {
              return res.status(403).json({ error: "Student does not belong to this parent" });
            }
          }
        } else if (userRoleId === 1) {
          // User is a student - verify it's their own student_id
          console.log("🔍 Verifying student ownership: student_id=", studentId, "user_id=", userId);
          const studentCheck = await pool.query(
            "SELECT id, user_id FROM students WHERE id = $1 LIMIT 1",
            [studentId]
          );
          if (!studentCheck.rows[0]) {
            console.error("❌ Student not found with id:", studentId);
            return res.status(403).json({ error: "Student ID not found" });
          }
          const studentUserId = studentCheck.rows[0].user_id;
          if (studentUserId !== userId) {
            console.error("❌ Student ID mismatch: student.user_id=", studentUserId, "logged_in_user_id=", userId);
            return res.status(403).json({ 
              error: "Student ID does not match logged-in user",
              details: {
                provided_student_id: studentId,
                student_user_id: studentUserId,
                logged_in_user_id: userId
              }
            });
          }
          console.log("✅ Student ownership verified");
        }
      } else {
        return res.status(400).json({ error: "Invalid student_id provided" });
      }
    } else {
      // Fallback: Find student by user_id (for direct student login)
      console.log("📚 Finding student by user_id:", userId);
      const studentRes = await pool.query(
        "SELECT id, class_id FROM students WHERE user_id = $1 LIMIT 1",
        [userId]
      );
      const studentRow = studentRes.rows[0] || {};
      studentId = studentRow.id || null;
      classId = studentRow.class_id || null;
      
      // If no student found and user is a parent, try to get first child
      if (!studentId && userRoleId === 2) {
        console.log("📚 No student found for parent, trying to get first child");
        const parentRes = await pool.query(
          "SELECT id FROM parents WHERE user_id = $1 LIMIT 1",
          [userId]
        );
        if (parentRes.rows[0]) {
          const parentId = parentRes.rows[0].id;
          const childRes = await pool.query(
            "SELECT id, class_id FROM students WHERE parent_id = $1 ORDER BY id LIMIT 1",
            [parentId]
          );
          if (childRes.rows[0]) {
            studentId = childRes.rows[0].id;
            classId = childRes.rows[0].class_id || null;
            console.log("✅ Using first child student_id:", studentId);
          }
        }
      }
    }
    
    console.log("📚 Final student_id for homework scan:", studentId);

    await ensureGradeColumnIsText();

    let gradeValue = null;
    if (classId) {
      try {
        const classRes = await pool.query(
          "SELECT class_name FROM classes WHERE id = $1 LIMIT 1",
          [classId]
        );
        const className = classRes.rows[0]?.class_name;
        gradeValue = className || String(classId);
      } catch (gradeErr) {
        console.warn("⚠️ Could not resolve class name for class_id:", classId, gradeErr.message);
        gradeValue = String(classId);
      }
    }

    // 🔥 Check if this is a continuation of an existing conversation
    const existingConversationId = req.body?.conversationId ? parseInt(req.body.conversationId, 10) : null;
    const existingScanId = req.body?.scanId ? parseInt(req.body.scanId, 10) : null;
    let previousScan = null;
    let conversationId = existingConversationId;
    let scanId = null;
    let scan = null;
    let isDifferentHomework = false;

    // If we have an existing scan, fetch it to compare
    if (existingScanId && !isNaN(existingScanId)) {
      try {
        const prevScanRes = await pool.query(
          `SELECT id, raw_text, detected_subject, task_type, file_url 
           FROM homework_scans WHERE id = $1 LIMIT 1`,
          [existingScanId]
        );
        if (prevScanRes.rows.length > 0) {
          previousScan = prevScanRes.rows[0];
          console.log("📋 Found previous scan:", previousScan.id, "subject:", previousScan.detected_subject);
        }
      } catch (err) {
        console.warn("⚠️ Could not fetch previous scan:", err.message);
      }
    }

    // Save scan record - update existing scan if scanId provided, otherwise create new
    const finalStudentId = studentId || null;
    
    if (existingScanId && !isNaN(existingScanId) && previousScan) {
      // Update existing scan with new image
      console.log("💾 Updating existing scan:", existingScanId, "with new fileUrl:", fileUrl);
      const updateRes = await pool.query(
        `UPDATE homework_scans 
         SET file_url = $1, grade = $2, processed_at = NULL
         WHERE id = $3 RETURNING *`,
        [fileUrl, gradeValue, existingScanId]
      );
      if (updateRes.rows.length > 0) {
        scan = updateRes.rows[0];
        scanId = scan.id;
        console.log("✅ Scan updated successfully - scan.id:", scan.id, "scan.student_id:", scan.student_id, "(type:", typeof scan.student_id, ")");
      } else {
        console.warn("⚠️ Could not update scan, creating new one instead");
        // Fall through to create new scan
        const scanRes = await pool.query(
          `INSERT INTO homework_scans(student_id, raw_text, file_url, grade, created_by)
           VALUES($1, $2, $3, $4, $5) RETURNING *`,
          [finalStudentId, null, fileUrl, gradeValue, userId ? String(userId) : null]
        );
        scan = scanRes.rows[0];
        scanId = scan.id;
        console.log("✅ Scan saved successfully - scan.id:", scan.id, "scan.student_id:", scan.student_id, "(type:", typeof scan.student_id, ")");
      }
    } else {
      // Create new scan
      console.log("💾 Creating new scan with student_id:", finalStudentId, "(type:", typeof finalStudentId, "), fileUrl:", fileUrl, "grade:", gradeValue);
      console.log("💾 INSERT values:", {
        student_id: finalStudentId,
        raw_text: null,
        file_url: fileUrl,
        grade: gradeValue,
        created_by: userId ? String(userId) : null
      });
      
      const scanRes = await pool.query(
        `INSERT INTO homework_scans(student_id, raw_text, file_url, grade, created_by)
         VALUES($1, $2, $3, $4, $5) RETURNING *`,
        [finalStudentId, null, fileUrl, gradeValue, userId ? String(userId) : null]
      );
      scan = scanRes.rows[0];
      scanId = scan.id;
      console.log("✅ Scan saved successfully - scan.id:", scan.id, "scan.student_id:", scan.student_id, "(type:", typeof scan.student_id, ")");
    }
    
    // Verify the saved student_id matches what we intended
    if (finalStudentId !== null && scan.student_id !== finalStudentId) {
      console.error("❌ MISMATCH: Intended student_id:", finalStudentId, "but saved student_id:", scan.student_id);
    }

    // Use existing conversation if provided, otherwise create new one
    if (conversationId && !isNaN(conversationId)) {
      // Verify the conversation exists and belongs to the user
      try {
        const convCheck = await pool.query(
          `SELECT id FROM conversations WHERE id = $1 AND user_id = $2 LIMIT 1`,
          [conversationId, userId]
        );
        if (convCheck.rows.length === 0) {
          console.warn("⚠️ Conversation not found or doesn't belong to user, creating new one");
          conversationId = null;
        } else {
          console.log("✅ Using existing conversation:", conversationId);
        }
      } catch (err) {
        console.warn("⚠️ Error checking conversation:", err.message);
        conversationId = null;
      }
    }

    if (!conversationId) {
      // Create new conversation
      const title = `Conversation for scan #${scanId} - ${new Date().toLocaleString()}`;
      const convRes = await pool.query(
        `INSERT INTO conversations(user_id, scan_id, title)
         VALUES($1, $2, $3) RETURNING *`,
        [userId, scanId, title]
      );
      conversationId = convRes.rows[0].id;
      console.log("✅ Created new conversation:", conversationId);
    }

    // Non-image file handling
    if (!mimeType.startsWith("image/")) {
      const msg = "Bitte lade ein Bild hoch (JPEG oder PNG) für die Analyse.";
      await pool.query(`UPDATE homework_scans SET raw_text=$1, detected_subject=$2 WHERE id=$3`, [msg, "Sonstiges", scan.id]);
      return res.json({
        success: true,
        message: msg,
        fileUrl,
        scan,
        parsed: { raw_text: msg, subject: "Sonstiges", questions: [] },
        conversationId,
      });
    }

    // AI Prompt (grade 1–7 focused) - GERMAN ONLY - ULTRA STRICT ENFORCEMENT
    const systemPrompt = `
      Du bist Kibundo, ein freundlicher und geduldiger Hausaufgabenhelfer für Schüler der Klassen 1–7.
      
      ⚠️⚠️⚠️ KRITISCH - ABSOLUTE SPRACHREGELN - KEINE AUSNAHMEN ⚠️⚠️⚠️:
      - DU MUSST IMMER UND ÜBERALL NUR DEUTSCH VERWENDEN
      - JEDES Wort, JEDE Frage, JEDE Antwort, JEDE Beschreibung MUSS auf Deutsch sein
      - KEINE englischen Wörter, KEINE englischen Begriffe, KEINE englischen Phrasen, KEINE englischen Sätze
      - Wenn du auch nur EIN englisches Wort siehst, übersetze es SOFORT ins Deutsche
      - Selbst technische Begriffe wie "computer", "internet", "email" → "Computer", "Internet", "E-Mail"
      - Bei gemischten Texten: Übersetze ALLES ins Deutsche - KEINE AUSNAHMEN
      - Beispiel: "What is 2+2?" → "Was ist 2+2?" (NIEMALS die englische Version behalten)
      - Beispiel: "Read the text" → "Lies den Text" (NIEMALS "Read" behalten)
      - Beispiel: "Choose the correct answer" → "Wähle die richtige Antwort" (NIEMALS "Choose" behalten)
      - Wenn du englische Fragen siehst, formuliere sie IMMER auf Deutsch neu
      - Bei Multiple-Choice-Aufgaben: Übersetze ALLE Optionen ins Deutsche
      - Prüfe JEDE Antwort nochmal: WENN DU EIN ENGLISCHES WORT SIEHST, ÜBERSETZE ES
      
      ÜBERSETZUNGSREGELN:
      - "What" → "Was"
      - "How" → "Wie"
      - "Where" → "Wo"
      - "When" → "Wann"
      - "Why" → "Warum"
      - "Choose" → "Wähle"
      - "Select" → "Wähle aus"
      - "Answer" → "Antworte" oder "Antwort"
      - "Question" → "Frage"
      - "Read" → "Lies"
      - "Write" → "Schreibe"
      - "Calculate" → "Berechne"
      - "Solve" → "Löse"
      - Übersetze ALLE englischen Wörter konsequent
      
      Identifiziere das FACH mit den folgenden Regeln:

      FACH-ERKENNUNGSREGELN:
      - Zahlen, mathematische Symbole (+, -, ×, ÷) → "Mathe"
      - Wörter, Sätze, Schreibaufgaben → "Deutsch"
      - Englischer Wortschatz (aber übersetze ins Deutsche) → "Englisch"
      - Natur, Tiere, Wissenschaft → "Sachkunde"
      - Biologie, Körper, Pflanzen → "Biologie"
      - Geografie, Karten, Länder → "Erdkunde"
      - Historische Ereignisse, Könige, Kriege → "Geschichte"
      - Religion, Ethik, Werte → "Religion" oder "Ethik"
      - Kunst, Farben, Zeichnungen → "Kunst"
      - Noten, Instrumente → "Musik"
      - Sport, körperliche Aktivitäten → "Sport"
      - Werkzeuge, Bauen, Handwerk → "Technik"
      - Gemischt oder unklar → "Sonstiges"

      AUFGABENTYP-ERKENNUNG:
      - Type A (Solvable): Mathe, Deutsch, Englisch, Sachkunde, Biologie, Erdkunde, Geschichte - Aufgaben mit Fragen, Rechnungen, Texten zum Lösen
      - Type B (Creative/Manual): Kunst, Musik, Sport, Handwerk, Basteln, Malen, Zeichnen - Kreative oder manuelle Aufgaben ohne direkte Lösung
      
      🔥🔥🔥 WICHTIG - FRAGEN OHNE ANTWORTEN 🔥🔥🔥:
      - Extrahiere NUR die Fragen aus der Hausaufgabe
      - Gib KEINE Antworten in der initialen Analyse
      - Der Schüler soll zuerst selbst nachdenken
      - Antworten werden nur gegeben, wenn der Schüler explizit um Hilfe bittet oder Schwierigkeiten hat
      
      Gib nur gültiges JSON zurück:
      {
        "subject": "Deutscher Fachname",
        "task_type": "solvable" oder "creative",
        "raw_text": "Extrahierten Text und Beschreibung (NUR auf Deutsch - übersetze ALLE englischen Teile)",
        "questions": [
          { "text": "Frage (NUR auf Deutsch - übersetze englische Fragen)" }
        ]
      }
      
      ⚠️ WICHTIG: Die "questions" Array soll NUR "text" enthalten, KEIN "answer" Feld!
      
      Bestimme task_type basierend auf:
      - "solvable": Wenn es mathematische Aufgaben, Fragen zum Beantworten, Texte zum Lesen/Schreiben, Grammatikübungen gibt
      - "creative": Wenn es um Malen, Zeichnen, Basteln, Handwerk, Musik, Sport, kreative Gestaltung geht
      
      ⚠️ FINALE PRÜFUNG VOR DER AUSGABE:
      - Übersetze ALLE englischen Texte ins Deutsche, bevor du sie in raw_text oder questions einfügst
      - Wenn die Hausaufgabe gemischte Sprachen hat, übersetze ALLES ins Deutsche
      - Prüfe jede Frage und Antwort: KEIN Englisch erlaubt
      - Wenn du auch nur EIN englisches Wort in deiner Antwort hast, übersetze es SOFORT
      - Bei Multiple-Choice: Übersetze ALLE Optionen (A, B, C, D) ins Deutsche
      - KEINE AUSNAHMEN - DEUTSCH IST PFLICHT
    `;

    // Read file with error handling
    let fileBuffer;
    try {
      // Normalize the file path (handle both absolute and relative paths)
      const normalizedPath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(process.cwd(), filePath);
      
      if (!fs.existsSync(normalizedPath)) {
        // Try the original path as well
        const altPath = path.isAbsolute(filePath) 
          ? path.join(process.cwd(), path.basename(filePath))
          : filePath;
        
        if (fs.existsSync(altPath)) {
          fileBuffer = fs.readFileSync(altPath);
        } else {
          throw new Error(`File not found at path: ${normalizedPath} (also tried: ${altPath})`);
        }
      } else {
        fileBuffer = fs.readFileSync(normalizedPath);
      }
    } catch (fileError) {
      console.error("❌ Error reading file:", fileError);
      console.error("❌ File path attempted:", filePath);
      console.error("❌ Current working directory:", process.cwd());
      throw new Error(`Failed to read uploaded file: ${fileError.message}`);
    }
    
    const fileBase64 = fileBuffer.toString("base64");

    // Call OpenAI API with error handling
    let completion;
    try {
      completion = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Scanne und beschreibe diese Hausaufgabe für die Klassen 1–7. WICHTIG: Alle Fragen, Antworten, Texte und Beschreibungen MÜSSEN ausschließlich auf Deutsch sein. Übersetze ALLE englischen Wörter, Phrasen und Sätze ins Deutsche. KEINE englischen Begriffe verwenden." },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
          ],
        },
      ],
      max_tokens: 1500,
      temperature: 0.3, // Lower temperature for more consistent German output
      });
    } catch (openAIError) {
      console.error("❌ OpenAI API error:", openAIError);
      // Clean up the uploaded file if OpenAI fails
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.error("❌ Error cleaning up file:", cleanupError);
      }
      throw new Error(`OpenAI API error: ${openAIError.message || "Failed to process image"}`);
    }

    // Track API usage and costs
    const usageStats = trackAPIUsage(completion.usage, 'vision');

    const aiText = completion.choices[0].message.content;
    let parsed;
    try {
      let jsonText = aiText.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
      parsed = JSON.parse(jsonText);
    } catch {
      parsed = null;
    }

    // Post-processing: Translate any English words that slipped through
    const translateEnglishToGerman = async (text) => {
      if (!text || typeof text !== 'string') return text;
      
      // Common English question words and phrases that should be translated
      const translations = {
        'What': 'Was',
        'what': 'was',
        'How': 'Wie',
        'how': 'wie',
        'Where': 'Wo',
        'where': 'wo',
        'When': 'Wann',
        'when': 'wann',
        'Why': 'Warum',
        'why': 'warum',
        'Choose': 'Wähle',
        'choose': 'wähle',
        'Select': 'Wähle aus',
        'select': 'wähle aus',
        'Answer': 'Antworte',
        'answer': 'antworte',
        'Question': 'Frage',
        'question': 'Frage',
        'Read': 'Lies',
        'read': 'lies',
        'Write': 'Schreibe',
        'write': 'schreibe',
        'Calculate': 'Berechne',
        'calculate': 'berechne',
        'Solve': 'Löse',
        'solve': 'löse',
        'the correct': 'die richtige',
        'correct answer': 'richtige Antwort',
        'correct': 'richtig',
      };
      
      let translated = text;
      // Replace common English phrases
      for (const [english, german] of Object.entries(translations)) {
        const regex = new RegExp(`\\b${english}\\b`, 'gi');
        translated = translated.replace(regex, german);
      }
      
      return translated;
    };

    let extractedText = parsed?.raw_text || aiText || "";
    extractedText = await translateEnglishToGerman(extractedText);
    let detectedSubject = parsed?.subject || detectSubject(extractedText);
    let detectedTaskType = parsed?.task_type || null; // Get task_type from AI response

    // 🔥 Compare with previous scan to detect if this is a different homework
    if (previousScan && previousScan.raw_text) {
      // Simple comparison: check if subject or key content differs significantly
      const prevSubject = (previousScan.detected_subject || "").toLowerCase().trim();
      const newSubject = (detectedSubject || "").toLowerCase().trim();
      
      // Extract key words from both texts for comparison
      const prevTextWords = (previousScan.raw_text || "").toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const newTextWords = (extractedText || "").toLowerCase().split(/\s+/).filter(w => w.length > 3);
      
      // Calculate similarity: count common words
      const prevSet = new Set(prevTextWords);
      const newSet = new Set(newTextWords);
      const commonWords = [...prevSet].filter(w => newSet.has(w));
      const similarity = commonWords.length / Math.max(prevSet.size, newSet.size, 1);
      
      // If subject differs OR similarity is very low (< 0.2), it's likely a different homework
      if (prevSubject !== newSubject || similarity < 0.2) {
        isDifferentHomework = true;
        console.log("⚠️ Detected different homework:", {
          prevSubject,
          newSubject,
          similarity: similarity.toFixed(2),
          commonWords: commonWords.length
        });
      } else {
        console.log("✅ Same homework detected:", {
          subject: newSubject,
          similarity: similarity.toFixed(2)
        });
      }
    }

    // Update scan with results, task type, and API usage stats
    // Note: If task_type column doesn't exist, this will fail gracefully - we'll handle it
    try {
      await pool.query(
        `UPDATE homework_scans 
         SET raw_text=$1, detected_subject=$2, 
             api_tokens_used=$3, api_cost_usd=$4, processed_at=NOW(),
             task_type=$6
         WHERE id=$5`,
        [extractedText, detectedSubject, usageStats.totalTokens, usageStats.cost, scan.id, detectedTaskType]
      );
    } catch (updateError) {
      // If task_type column doesn't exist, update without it
      if (updateError.message?.includes('task_type') || updateError.message?.includes('column')) {
        console.warn('⚠️ task_type column not found, updating without it');
        await pool.query(
          `UPDATE homework_scans 
           SET raw_text=$1, detected_subject=$2, 
               api_tokens_used=$3, api_cost_usd=$4, processed_at=NOW()
           WHERE id=$5`,
          [extractedText, detectedSubject, usageStats.totalTokens, usageStats.cost, scan.id]
        );
      } else {
        throw updateError;
      }
    }

    if (Array.isArray(parsed?.questions)) {
      await Promise.all(
        parsed.questions.map(async (q, i) => {
          // Translate question and answer text
          const translatedQuestion = await translateEnglishToGerman(q.text || '');
          const translatedAnswer = await translateEnglishToGerman(q.answer || '');
          
          return pool.query(
            `INSERT INTO generated_answers(scan_id, question_index, question_text, answer_text, full_response)
             VALUES($1, $2, $3, $4, $5)`,
            [scan.id, i, translatedQuestion, translatedAnswer, JSON.stringify({ response: aiText })]
          );
        })
      );
    }

    // Fetch the updated scan from database to include all updated fields (detected_subject, raw_text, etc.)
    const updatedScanRes = await pool.query(
      `SELECT * FROM homework_scans WHERE id = $1 LIMIT 1`,
      [scan.id]
    );
    const updatedScan = updatedScanRes.rows[0] || scan;
    
    // Include task_type and all updated fields in response
    const responseScan = {
      ...updatedScan,
      task_type: detectedTaskType,
    };
    
    res.json({
      success: true,
      message: "Homework scanned successfully",
      fileUrl,
      scan: responseScan,
      parsed: {
        ...parsed,
        task_type: detectedTaskType, // Ensure task_type is in parsed response
      },
      aiText,
      conversationId,
      isDifferentHomework, // 🔥 Flag to indicate if this is a different homework than the previous scan
      previousScanId: previousScan?.id || null, // Include previous scan ID for reference
    });
  } catch (err) {
    console.error("❌ Upload error:", err);
    console.error("❌ Upload error stack:", err.stack);
    // Provide more detailed error information
    const errorMessage = err.message || "Error while processing image";
    const errorDetails = {
      error: errorMessage,
      type: err.name || "UnknownError",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    };
    res.status(500).json(errorDetails);
  }
};

// ✅ Create homework from text description (no image)
export const createHomeworkFromText = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRoleId = req.user?.role_id;
    const { description, student_id } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ error: "Homework description is required" });
    }

    // Get student_id
    let studentId = student_id ? parseInt(student_id, 10) : null;
    if (isNaN(studentId)) studentId = null;
    let classId = null;

    if (studentId && !isNaN(studentId)) {
      // Use provided student_id and fetch class_id
      const studentRes = await pool.query(
        "SELECT id, class_id FROM students WHERE id = $1 LIMIT 1",
        [studentId]
      );
      const studentRow = studentRes.rows[0] || {};
      if (studentRow.id) {
        classId = studentRow.class_id || null;
        // Verify the student belongs to the user
        if (userRoleId === 2) {
          // User is a parent - verify student is their child
          const parentRes = await pool.query(
            "SELECT id FROM parents WHERE user_id = $1 LIMIT 1",
            [userId]
          );
          if (parentRes.rows[0]) {
            const parentId = parentRes.rows[0].id;
            const childCheck = await pool.query(
              "SELECT id FROM students WHERE id = $1 AND parent_id = $2 LIMIT 1",
              [studentId, parentId]
            );
            if (!childCheck.rows[0]) {
              return res.status(403).json({ error: "Student does not belong to this parent" });
            }
          }
        } else if (userRoleId === 1) {
          // User is a student - verify it's their own student_id
          const studentCheck = await pool.query(
            "SELECT id, user_id FROM students WHERE id = $1 LIMIT 1",
            [studentId]
          );
          if (!studentCheck.rows[0]) {
            return res.status(403).json({ error: "Student ID not found" });
          }
          const studentUserId = studentCheck.rows[0].user_id;
          if (studentUserId !== userId) {
            return res.status(403).json({ error: "Student ID does not match logged-in user" });
          }
        }
      } else {
        return res.status(400).json({ error: "Invalid student_id provided" });
      }
    } else {
      // Fallback: Find student by user_id
      const studentRes = await pool.query(
        "SELECT id, class_id FROM students WHERE user_id = $1 LIMIT 1",
        [userId]
      );
      const studentRow = studentRes.rows[0] || {};
      studentId = studentRow.id || null;
      classId = studentRow.class_id || null;
      
      // If no student found and user is a parent, try to get first child
      if (!studentId && userRoleId === 2) {
        const parentRes = await pool.query(
          "SELECT id FROM parents WHERE user_id = $1 LIMIT 1",
          [userId]
        );
        if (parentRes.rows[0]) {
          const parentId = parentRes.rows[0].id;
          const childRes = await pool.query(
            "SELECT id, class_id FROM students WHERE parent_id = $1 ORDER BY id LIMIT 1",
            [parentId]
          );
          if (childRes.rows[0]) {
            studentId = childRes.rows[0].id;
            classId = childRes.rows[0].class_id || null;
          }
        }
      }
    }

    if (!studentId) {
      return res.status(400).json({ error: "Could not determine student ID" });
    }

    await ensureGradeColumnIsText();

    let gradeValue = null;
    if (classId) {
      try {
        const classRes = await pool.query(
          "SELECT class_name FROM classes WHERE id = $1 LIMIT 1",
          [classId]
        );
        const className = classRes.rows[0]?.class_name;
        gradeValue = className || String(classId);
      } catch (gradeErr) {
        console.warn("⚠️ Could not resolve class name for class_id:", classId, gradeErr.message);
        gradeValue = String(classId);
      }
    }

    // Create homework scan entry with text description (no file)
    const scanRes = await pool.query(
      `INSERT INTO homework_scans(student_id, raw_text, file_url, grade, created_by)
       VALUES($1, $2, $3, $4, $5) RETURNING *`,
      [studentId, description.trim(), null, gradeValue, String(userId)]
    );
    const scan = scanRes.rows[0];

    // Try to detect subject from description using OpenAI
    try {
      const openai = getOpenAIClient();
      const subjectPrompt = `Bestimme das Fach (Subject) für diese Hausaufgabe. Antworte nur mit einem Wort: "Mathe", "Deutsch", oder "Sonstiges".\n\nHausaufgabe: ${description.substring(0, 200)}`;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Du bist ein Assistent, der das Fach einer Hausaufgabe bestimmt. Antworte nur mit einem Wort: Mathe, Deutsch, oder Sonstiges." },
          { role: "user", content: subjectPrompt }
        ],
        max_tokens: 10,
        temperature: 0.3
      });

      const detectedSubject = completion.choices[0]?.message?.content?.trim() || null;
      if (detectedSubject && ["Mathe", "Deutsch", "Sonstiges"].includes(detectedSubject)) {
        await pool.query(
          "UPDATE homework_scans SET detected_subject = $1 WHERE id = $2",
          [detectedSubject, scan.id]
        );
        scan.detected_subject = detectedSubject;
      }
    } catch (aiErr) {
      console.warn("⚠️ Could not detect subject:", aiErr.message);
    }

    res.json({ 
      success: true, 
      scan: {
        ...scan,
        detected_subject: scan.detected_subject || null
      }
    });
  } catch (error) {
    console.error("❌ Error creating homework from text:", error);
    res.status(500).json({ error: error.message || "Error creating homework entry" });
  }
};
