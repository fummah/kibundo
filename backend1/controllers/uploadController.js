import fs from "fs";
import path from "path";
import { pool } from "../config/db.js";
import OpenAI from "openai";
import multer from "multer";

// ✅ Create /uploads folder if it doesn’t exist
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// ✅ Configure multer to store uploads locally
export const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + "-" + file.originalname);
    },
  }),
});

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const handleUpload = async (req, res) => {
  try {
    const userId = req.user?.id;
    console.log("👤 User ID from token:", userId);

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const fileUrl = `/uploads/${req.file.filename}`; // relative URL for your frontend
    const mimeType = req.file.mimetype;

    // ✅ Get student linked to this user
    const studentRes = await pool.query(
      "SELECT id FROM students WHERE user_id = $1 LIMIT 1",
      [userId]
    );
    const studentId = studentRes.rows[0]?.id;

    // ✅ Save the scan record (before AI)
    const scanRes = await pool.query(
      `INSERT INTO homework_scans(student_id, raw_text, file_url)
       VALUES($1, $2, $3) RETURNING *`,
      [studentId || null, null, fileUrl]
    );
    const scan = scanRes.rows[0];
    const scanId = scan.id;

    // ✅ Create conversation record
    const title = `Conversation for scan #${scanId} - ${new Date().toLocaleString()}`;
    const convRes = await pool.query(
      `INSERT INTO conversations(user_id, scan_id, title)
       VALUES($1, $2, $3)
       RETURNING *`,
      [userId, scanId, title]
    );
    const conversation = convRes.rows[0];
    const conversationId = conversation.id;

    console.log("🗣️ New conversation created:", conversationId);

    // ✅ Read uploaded file and convert to base64
    const fileBuffer = fs.readFileSync(filePath);
    const fileBase64 = fileBuffer.toString("base64");

    // ✅ AI instructions
    const systemPrompt = `
      You are a kind and patient homework helper for Grade 1 students.
      You must:
      - Look at the uploaded homework (it may be a photo or PDF).
      - Understand what the child was asked to do.
      - Give very simple, clear answers a 6-year-old can understand.
      - Encourage and motivate the child with kindness.

      Return JSON in this format:
      {
        "questions": [
          { "text": "Question text", "answer": "Simple, happy answer." }
        ]
      }
    `;

    // ✅ Send image/PDF to ChatGPT (gpt-4o supports both)
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Please scan and answer this homework in Grade 1 language." },
            { type: "image_url", image_url: `data:${mimeType};base64,${fileBase64}` },
          ],
        },
      ],
      max_tokens: 1500,
    });

    const aiText = completion.choices[0].message.content;

    // ✅ Try parsing AI response
    let parsed = null;
    try {
      parsed = JSON.parse(aiText);
    } catch {
      console.warn("⚠️ AI output not valid JSON. Storing raw text instead.");
    }

    // ✅ Store generated answers
    if (Array.isArray(parsed?.questions)) {
      await Promise.all(
        parsed.questions.map((q, idx) =>
          pool.query(
            `INSERT INTO generated_answers(scan_id, question_index, question_text, answer_text, full_response)
             VALUES($1, $2, $3, $4, $5)`,
            [scan.id, idx, q.text, q.answer, aiText]
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
    res.status(500).json({ error: err.message });
  }
};
