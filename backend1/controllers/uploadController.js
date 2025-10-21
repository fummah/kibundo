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

    // Validate file
    console.log("📁 File info:", {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    // Check file size (additional validation)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (req.file.size > maxSize) {
      return res.status(400).json({ 
        error: `File too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB` 
      });
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
      
      IMPORTANT: You must ALWAYS extract something from the image, even if it's just a description of what you see.
      
      You must:
      - Look carefully at the uploaded homework (it may be a photo or PDF).
      - Extract ALL text you can see, even if it's handwritten or unclear.
      - Identify any math problems, questions, or tasks.
      - Give very simple, clear answers a 6-year-old can understand.
      - Encourage and motivate the child with kindness.
      
      If you see ANY text, numbers, or problems, extract them. Even if you can't solve them perfectly, describe what you see.

      IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks.
      
      Return JSON in this EXACT format:
      {
        "raw_text": "All text you can see in the image",
        "questions": [
          { "text": "Question text", "answer": "Simple, happy answer." }
        ]
      }
      
      If you cannot see any text at all, return:
      {
        "raw_text": "I can see an image but the text is not clear enough to read. Please try taking a clearer photo or describe what you need help with.",
        "questions": []
      }
      
      Do NOT wrap the JSON in code blocks. Return pure JSON only.
    `;

    // ✅ Send image/PDF to ChatGPT (gpt-4o supports both)
    console.log("🤖 Sending to OpenAI for analysis...");
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Please scan and answer this homework in Grade 1 language." },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
          ],
        },
      ],
      max_tokens: 1500,
    });

    const aiText = completion.choices[0].message.content;
    console.log("✅ OpenAI response received:", aiText?.substring(0, 200) + "...");

    // ✅ Try parsing AI response
    let parsed = null;
    try {
      // Handle markdown-wrapped JSON (```json ... ```)
      let jsonText = aiText.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      parsed = JSON.parse(jsonText);
      console.log("✅ Successfully parsed AI JSON response");
    } catch (parseError) {
      console.warn("⚠️ AI output not valid JSON. Storing raw text instead.", parseError.message);
      console.log("Raw AI response:", aiText);
    }

    // ✅ Update scan record with extracted text
    const extractedText = parsed?.raw_text || aiText || "";
    if (extractedText) {
      await pool.query(
        `UPDATE homework_scans SET raw_text = $1 WHERE id = $2`,
        [extractedText, scan.id]
      );
      console.log("✅ Updated scan record with extracted text:", extractedText.substring(0, 100) + "...");
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
    
    // Handle specific error types
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: "File too large. Maximum size is 25MB." 
      });
    }
    
    if (err.message?.includes('not supported')) {
      return res.status(400).json({ 
        error: err.message 
      });
    }
    
    if (err.status === 400 && err.message?.includes('image_url')) {
      return res.status(500).json({ 
        error: "Image processing failed. Please try with a different image format (JPEG, PNG, or PDF)." 
      });
    }
    
    if (err.status === 429) {
      return res.status(503).json({ 
        error: "Service temporarily unavailable. Please try again in a few moments." 
      });
    }
    
    // Generic error response
    res.status(500).json({ 
      error: err.message || "An unexpected error occurred while processing your image. Please try again." 
    });
  }
};
