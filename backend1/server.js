// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const db = require("./models");

// Import routes
const uploadRoutes = require("./routes/upload.routes").default || require("./routes/upload.routes");
const conversationRoutes = require("./routes/conversation.routes").default || require("./routes/conversation.routes");
const authRoutes = require("./routes/auth.routes").default || require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes").default || require("./routes/user.routes");
const aiRoutes = require("./routes/ai.routes").default || require("./routes/ai.routes");
const ttsRoutes = require("./routes/tts.routes");

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-XSRF-TOKEN']
}));

// Stripe webhook needs raw body, so we exclude it from JSON parsing
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));

// Serve uploaded files as static assets
app.use('/uploads', express.static('uploads'));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/ai/upload", uploadRoutes);
app.use("/api/conversations", conversationRoutes); // ✅ Changed from /api/ai/conversations to /api/conversations
app.use("/api/tts", ttsRoutes); // TTS endpoint

// Sync DB and start server
db.sequelize.sync().then(() => {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
  });
});
