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
  
  // Warning if costs exceed threshold
  if (apiUsageStats.costsToday > 5) {
    console.warn(`⚠️ WARNING: Daily API costs exceed $5 (current: $${apiUsageStats.costsToday.toFixed(2)})`);
  }
  
  return { totalTokens, cost, dailyTotal: apiUsageStats.costsToday };
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
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const filePath = req.file.path;
    const fileUrl = `/uploads/${req.file.filename}`;
    const mimeType = req.file.mimetype;

    const studentRes = await pool.query("SELECT id FROM students WHERE user_id = $1 LIMIT 1", [userId]);
    const studentId = studentRes.rows[0]?.id;

    // Save scan record
    const scanRes = await pool.query(
      `INSERT INTO homework_scans(student_id, raw_text, file_url)
       VALUES($1, $2, $3) RETURNING *`,
      [studentId || null, null, fileUrl]
    );
    const scan = scanRes.rows[0];
    const scanId = scan.id;

    // Create conversation
    const title = `Conversation for scan #${scanId} - ${new Date().toLocaleString()}`;
    const convRes = await pool.query(
      `INSERT INTO conversations(user_id, scan_id, title)
       VALUES($1, $2, $3) RETURNING *`,
      [userId, scanId, title]
    );
    const conversationId = convRes.rows[0].id;

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

    // AI Prompt (grade 1–7 focused) - GERMAN ONLY - STRICT ENFORCEMENT
    const systemPrompt = `
      Du bist Kibundo, ein freundlicher und geduldiger Hausaufgabenhelfer für Schüler der Klassen 1–7.
      
      ⚠️ KRITISCH - ABSOLUTE SPRACHREGELN:
      - ALLE Antworten, Fragen, Beschreibungen und Texte MÜSSEN ausschließlich auf Deutsch sein
      - KEINE englischen Wörter, Begriffe, Phrasen oder Sätze verwenden
      - Wenn du englischen Text siehst, übersetze ihn sofort ins Deutsche
      - Selbst technische Begriffe müssen auf Deutsch sein oder erklärt werden
      - Bei gemischten Texten: Übersetze ALLES ins Deutsche
      - Beispiel: "What is 2+2?" → "Was ist 2+2?"
      - Beispiel: "Read the text" → "Lies den Text"
      - Wenn du englische Fragen siehst, formuliere sie auf Deutsch neu
      
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

      Gib nur gültiges JSON zurück:
      {
        "subject": "Deutscher Fachname",
        "raw_text": "Extrahierten Text und Beschreibung (NUR auf Deutsch - übersetze ALLE englischen Teile)",
        "questions": [
          { "text": "Frage (NUR auf Deutsch - übersetze englische Fragen)", "answer": "Einfache Antwort für ein Kind (NUR auf Deutsch)" }
        ]
      }
      
      WICHTIG: 
      - Übersetze ALLE englischen Texte ins Deutsche, bevor du sie in raw_text oder questions einfügst
      - Wenn die Hausaufgabe gemischte Sprachen hat, übersetze ALLES ins Deutsche
      - Prüfe jede Frage und Antwort: KEIN Englisch erlaubt
    `;

    const fileBuffer = fs.readFileSync(filePath);
    const fileBase64 = fileBuffer.toString("base64");

    const completion = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Scanne und beschreibe diese Hausaufgabe für die Klassen 1–7. Alle Fragen und Antworten müssen auf Deutsch sein." },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
          ],
        },
      ],
      max_tokens: 1500,
    });

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

    const extractedText = parsed?.raw_text || aiText || "";
    let detectedSubject = parsed?.subject || detectSubject(extractedText);

    // Update scan with results and API usage stats
      await pool.query(
      `UPDATE homework_scans 
       SET raw_text=$1, detected_subject=$2, 
           api_tokens_used=$3, api_cost_usd=$4, processed_at=NOW()
       WHERE id=$5`,
      [extractedText, detectedSubject, usageStats.totalTokens, usageStats.cost, scan.id]
    );

    if (Array.isArray(parsed?.questions)) {
      await Promise.all(
        parsed.questions.map((q, i) =>
          pool.query(
            `INSERT INTO generated_answers(scan_id, question_index, question_text, answer_text, full_response)
             VALUES($1, $2, $3, $4, $5)`,
            [scan.id, i, q.text, q.answer, JSON.stringify({ response: aiText })]
          )
        )
      );
    }

    res.json({
      success: true,
      message: "Homework scanned successfully",
      fileUrl,
      scan,
      parsed,
      aiText,
      conversationId,
    });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ error: err.message || "Error while processing image" });
  }
};
