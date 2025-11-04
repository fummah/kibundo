// backend1/controllers/tts.controller.js
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate speech from text using OpenAI TTS API
 */
exports.textToSpeech = async (req, res) => {
  try {
    const { text, lang = "de" } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    // Map language codes to OpenAI voice models
    // OpenAI TTS supports: alloy, echo, fable, onyx, nova, shimmer
    // Use "nova" for German as it's a high-quality voice suitable for children
    const voice = "nova"; // Good for German, friendly voice

    console.log("🔊 Generating TTS for text:", text.substring(0, 50) + "...");

    // Generate speech using OpenAI TTS
    const mp3 = await openai.audio.speech.create({
      model: "tts-1", // or "tts-1-hd" for higher quality (more expensive)
      voice: voice,
      input: text,
      response_format: "mp3",
    });

    // Convert response to buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());

    console.log("✅ TTS generated successfully, size:", buffer.length, "bytes");

    // Set appropriate headers
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour

    // Send audio buffer
    res.send(buffer);
  } catch (error) {
    console.error("❌ TTS error:", error);
    res.status(500).json({ error: "Failed to generate speech", message: error.message });
  }
};

/**
 * Alias for backward compatibility
 */
exports.speak = exports.textToSpeech;

/**
 * Get TTS URL (optional - for URL-based access)
 */
exports.getTTSUrl = async (req, res) => {
  try {
    const { text, lang = "de" } = req.query;
    if (!text) {
      return res.status(400).json({ error: "Text parameter is required" });
    }
    // Return URL to TTS endpoint
    const baseUrl = req.protocol + "://" + req.get("host");
    res.json({ url: `${baseUrl}/api/tts/speak?text=${encodeURIComponent(text)}&lang=${lang}` });
  } catch (error) {
    console.error("❌ TTS URL error:", error);
    res.status(500).json({ error: "Failed to generate TTS URL", message: error.message });
  }
};
