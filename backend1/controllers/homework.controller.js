// ================================
// 📘 Imports & Configuration
// ================================
import express from "express";
import multer from "multer";
import bodyParser from "body-parser";
import pkg from "pg";
import OpenAI from "openai";
import fs from "fs";
import Tesseract from "tesseract.js";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB
  }
});

console.log("📦 Connected as DB user:", process.env.DB_USER);

// ================================
// 🤖 OpenAI Setup
// ================================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to call OpenAI
async function askOpenAI(systemPrompt, userInput, opts = {}) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput },
    ],
    max_tokens: opts.max_tokens || 800,
  });
  const text = completion.choices[0].message.content;
  return { text, raw: completion };
}

// ================================
// 📷 1️⃣ OCR UPLOAD & ANALYSIS
// ================================
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;

    // OCR extraction
    const { data } = await Tesseract.recognize(filePath, "eng");
    const rawText = data.text;
    fs.unlinkSync(filePath); // delete temp file

    const scanRes = await pool.query(
      `INSERT INTO homework_scans(student_id, raw_text,file_url)
       VALUES($1, $2, $3) RETURNING *`,
      [1 || null, rawText,"testfile"]
    );
    const scan = scanRes.rows[0];

    // Ask OpenAI to extract questions & answers - GERMAN ONLY - STRICT ENFORCEMENT
    const systemPrompt = `
      Du bist Kibundo, ein freundlicher und geduldiger Hausaufgabenhelfer für Schüler der Klassen 1–7.
      
      ⚠️ KRITISCH - ABSOLUTE SPRACHREGELN:
      - ALLE Fragen, Antworten und Texte MÜSSEN ausschließlich auf Deutsch sein
      - KEINE englischen Wörter, Begriffe, Phrasen oder Sätze verwenden
      - Wenn du englischen Text im Hausaufgabentext siehst, übersetze ihn sofort ins Deutsche
      - Selbst wenn die ursprüngliche Frage auf Englisch ist, formuliere sie auf Deutsch neu
      - Beispiel: "What is 2+2?" → Extrahiere als "Was ist 2+2?" und antworte auf Deutsch
      - Beispiel: "Read the story" → Extrahiere als "Lies die Geschichte" und erkläre auf Deutsch
      
      Extrahiere unterschiedliche Fragen aus dem gegebenen Hausaufgabentext und beantworte jede Frage.
      Gib JSON zurück wie: {"questions":[{"text":"Frage auf Deutsch (übersetzt falls ursprünglich Englisch)","answer":"Antwort auf Deutsch"}]}.
      Füge schrittweise Erklärungen hinzu, wo angemessen.
      Wenn unklar, bitte um Klärung.
      
      WICHTIG: 
      - Übersetze ALLE englischen Fragen und Texte ins Deutsche, bevor du sie extrahierst
      - Prüfe jede Frage und Antwort: KEIN Englisch erlaubt
      - Wenn die Hausaufgabe gemischte Sprachen hat, übersetze ALLES ins Deutsche
    `;

    const { text: aiText, raw } = await askOpenAI(systemPrompt, rawText, {
      max_tokens: 1500,
    });

    let parsed = null;
    try {
      parsed = JSON.parse(aiText);
    } catch (e) {
      console.warn("⚠️ AI output not valid JSON, returning raw text instead");
    }

    // Store generated answers
    if (Array.isArray(parsed?.questions)) {
      const insertPromises = parsed.questions.map(async (q, idx) => {
        return pool.query(
          `INSERT INTO generated_answers(scan_id, question_index, question_text, answer_text, full_response)
           VALUES($1,$2,$3,$4,$5)`,
          [scan.id, idx, q.text, q.answer, raw]
        );
      });
      await Promise.all(insertPromises);
    }

    res.json({ scan, parsed, aiText, aiRaw: raw });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================================
// 💬 2️⃣ CHAT ENDPOINTS
// ================================

// Separate routes to avoid path-to-regexp error
app.post("/api/conversations/message", async (req, res) => {
  await handleConversation(req, res);
});

app.post("/api/conversations/:conversationId/message", async (req, res) => {
  await handleConversation(req, res);
});

async function handleConversation(req, res) {
  try {
    const { conversationId } = req.params;
    const { userId, message, scanId } = req.body;

    let convId = conversationId;

    // Create conversation if missing
    if (!convId) {
      const title = `Conversation for ${userId || "guest"} ${new Date().toISOString()}`;
      const r = await pool.query(
        `INSERT INTO conversations(user_id, scan_id, title)
         VALUES($1,$2,$3) RETURNING *`,
        [userId || null, scanId || null, title]
      );
      convId = r.rows[0].id;
    }

    // Save user message
    await pool.query(
      `INSERT INTO messages(conversation_id, sender, content)
       VALUES($1,$2,$3)`,
      [convId, "student", message]
    );

    // Add scan grounding context if exists
    let grounding = "";
    if (scanId) {
      const s = await pool.query(`SELECT raw_text FROM homework_scans WHERE id=$1`, [scanId]);
      if (s.rows[0]) grounding = `Homework context:\n${s.rows[0].raw_text}\n\n`;
    }

    const systemPrompt = `
      You are a patient, grade-appropriate tutoring assistant.
      Provide answers and step-by-step hints when appropriate.
      If the student asks for answers, show steps.
      If they ask only for hints, give hints.
      Always be concise and educational.
    `;

    const { text: aiReply, raw } = await askOpenAI(systemPrompt, grounding + message, {
      max_tokens: 800,
    });

    await pool.query(
      `INSERT INTO messages(conversation_id, sender, content, meta)
       VALUES($1,$2,$3,$4)`,
      [convId, "bot", aiReply, raw]
    );

    res.json({ conversationId: convId, reply: aiReply });
  } catch (err) {
    console.error("❌ Chat error:", err);
    res.status(500).json({ error: err.message });
  }
}

// ================================
// 🗂️ 3️⃣ GET CHAT HISTORY
// ================================
app.get("/api/conversations/:conversationId/messages", async (req, res) => {
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
});

// ================================
// 🚀 Start Server
// ================================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
