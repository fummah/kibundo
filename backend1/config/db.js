// db.js
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

// Create a connection pool
export const pool = new Pool({
  host: process.env.DB_HOST,       // e.g. "localhost"
  user: process.env.DB_USER,       // e.g. "postgres"
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,   // e.g. "kibundo_db"
  port: process.env.DB_PORT || 5432,
});

// Optional: test connection
pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch(err => console.error("❌ Database connection error:", err));
