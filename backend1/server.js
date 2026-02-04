// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const db = require("./models");

const app = express();

// Middleware
const corsOrigins = String(process.env.CORS_ORIGINS || '').trim();
const allowedOrigins = corsOrigins
  ? corsOrigins.split(',').map((s) => s.trim()).filter(Boolean)
  : [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://217.160.29.143',
    'https://217.160.29.143',
  ];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Don't throw (which becomes a 500). Just disable CORS for this origin.
    // The browser will block the response if it lacks the required CORS headers.
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-XSRF-TOKEN']
}));

// Stripe webhook needs raw body, so we exclude it from JSON parsing
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));

// Serve uploaded files as static assets
app.use('/uploads', express.static('uploads'));

// Import routes and start server
(async () => {
  try {
    // Load ES module route (upload.routes.mjs)
    const uploadModule = await import("./routes/upload.routes.mjs");
    const uploadRoutes = uploadModule.default || uploadModule;
    
    // Load CommonJS routes
    const conversationRoutes = require("./routes/conversation.routes").default || require("./routes/conversation.routes");
    const authRoutes = require("./routes/auth.routes").default || require("./routes/auth.routes");
    const userRoutes = require("./routes/user.routes").default || require("./routes/user.routes");
    const aiRoutes = require("./routes/ai.routes").default || require("./routes/ai.routes");
    const ttsRoutes = require("./routes/tts.routes");

    // Setup routes
    app.use("/api/auth", authRoutes);
    app.use("/api", userRoutes);
    app.use("/api/ai", aiRoutes);
    app.use("/api/ai/upload", uploadRoutes);
    app.use("/api/conversations", conversationRoutes);
    app.use("/api/tts", ttsRoutes);

    // Sync DB and start server
    await db.sequelize.sync();
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error starting server:", err);
    process.exit(1);
  }
})();
