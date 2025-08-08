const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const db = require("./models");

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api", require("./routes/user.routes"));
// Sync DB and start server
db.sequelize.sync().then(() => {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
