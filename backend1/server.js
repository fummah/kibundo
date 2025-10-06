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

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/ai/upload", uploadRoutes);
app.use("/api/ai/conversations", conversationRoutes);

// Sync DB and start server
db.sequelize.sync().then(() => {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
  });
});
