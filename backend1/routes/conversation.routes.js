import express from "express";
import { handleConversation, getChatHistory } from "../controllers/conversationController.js";

const router = express.Router();

// POST a message to a conversation. conversationId is optional
router.post("/:conversationId/message", handleConversation);

// POST a message without conversationId (creates new conversation)
router.post("/message", handleConversation);

// GET all messages for a conversation
router.get("/:conversationId/messages", getChatHistory);

export default router;
