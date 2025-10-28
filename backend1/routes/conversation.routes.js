import express from "express";
import { handleConversation, getChatHistory, searchConversations } from "../controllers/conversationController.js";

const router = express.Router();

// GET search/filter conversations (must be before /:conversationId to avoid conflicts)
router.get("/", searchConversations);

// POST a message to a conversation. conversationId is optional
router.post("/:conversationId/message", handleConversation);

// POST a message without conversationId (creates new conversation)
router.post("/message", handleConversation);

// GET all messages for a conversation
router.get("/:conversationId/messages", getChatHistory);

export default router;
