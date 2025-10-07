import fs from "fs";
import { pool } from "../config/db.js"; // create a separate db.js for pg Pool
import Tesseract from "tesseract.js";
import { askOpenAI } from "./openaiHelper.js";

export const handleUpload = async (req, res) => {
  try {
    const filePath = req.file.path;

    // OCR extraction
      //const userId = req.user.id;

      const userId = 1;

    // ✅ Get student_id linked to this user
    const studentRes = await pool.query(
      "SELECT id FROM students WHERE user_id = $1 LIMIT 1",
      [userId]
    );

    const studentId = studentRes.rows[0].id;
    const { data } = await Tesseract.recognize(filePath, "eng");
    const rawText = data.text;
    fs.unlinkSync(filePath);

    const scanRes = await pool.query(
      `INSERT INTO homework_scans(student_id, raw_text,file_url)
       VALUES($1, $2, $3) RETURNING *`,
      [studentId || null, rawText, filePath]
    );
    const scan = scanRes.rows[0];
    const scanId = scan.id;

// ✅ Create a new conversation linked to this scan
const title = `Conversation for scan #${scanId} - ${new Date().toLocaleString()}`;

const convRes = await pool.query(
  `INSERT INTO conversations(user_id, scan_id, title)
   VALUES($1, $2, $3)
   RETURNING *`,
  [1, scanId, title]
);

const conversation = convRes.rows[0];

console.log("🧩 New conversation created:", conversation);

    // AI processing
    const systemPrompt = `
      You are a helpful homework assistant.
      Extract distinct questions from the given homework text and answer each one.
      Return JSON like: {"questions":[{"text":"...","answer":"..."}]}.
    `;
    const { text: aiText, raw } = await askOpenAI(systemPrompt, rawText, { max_tokens: 1500 });

    let parsed = null;
    try { parsed = JSON.parse(aiText); } catch (e) { console.warn("⚠️ AI output not valid JSON"); }

    if (Array.isArray(parsed?.questions)) {
      await Promise.all(parsed.questions.map((q, idx) => pool.query(
        `INSERT INTO generated_answers(scan_id, question_index, question_text, answer_text, full_response)
         VALUES($1,$2,$3,$4,$5)`,
        [scan.id, idx, q.text, q.answer, raw]
      )));
    }

    res.json({ scan, parsed, aiText, aiRaw: raw });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ error: err.message });
  }
};
