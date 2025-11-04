const express = require("express");
const router = express.Router();
const { textToSpeech, getTTSUrl } = require("../controllers/tts.controller");
const { verifyToken } = require("../middlewares/authJwt");

// Generate TTS audio from text
router.post("/speak", verifyToken, textToSpeech);

// Get TTS URL (optional - for URL-based access)
router.get("/url", verifyToken, getTTSUrl);

module.exports = router;

