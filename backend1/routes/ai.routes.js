const express = require("express");
const router = express.Router();
const { chatWithAgent  } = require("../controllers/ai.controller");
const { verifyToken } = require("../middlewares/authJwt");

router.post("/chat", verifyToken, chatWithAgent);

module.exports = router;
