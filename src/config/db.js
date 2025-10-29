import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

// Get the absolute path to store your database file in the project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "./country.db");

// Connect to SQLite
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Connected to SQLite database at:", dbPath);
  }
});

export default db;
