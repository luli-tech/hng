const sqlite3 = require('sqlite3').verbose();

// Connect to SQLite database (or create it if it doesn’t exist)
let db = new sqlite3.Database('./country.db', (err) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
  } else {
    console.log('✅ Connected to SQLite database.');
  }
});

// Example: Create a sample table
db.run(`CREATE TABLE IF NOT EXISTS countries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  capital TEXT NOT NULL
)`, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('✅ Table ready.');
  }
});

// Close connection
db.close((err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('✅ Connection closed.');
  }
});
