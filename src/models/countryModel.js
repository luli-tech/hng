import db from "../config/db.js";

// Create table with all required columns
export const createTable = () => {
  return new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS countries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        capital TEXT,
        region TEXT,
        population INTEGER NOT NULL,
        currency_code TEXT,
        exchange_rate REAL,
        estimated_gdp REAL,
        flag_url TEXT,
        last_refreshed_at TEXT
      )`,
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

// Create summary_images table
export const createImageTable = () => {
  return new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS summary_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        svg_content TEXT NOT NULL,
        last_refreshed_at TEXT NOT NULL
      )`,
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

// Insert or update (UPSERT)
export const upsertCountry = (country) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO countries 
      (name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, last_refreshed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        capital = excluded.capital,
        region = excluded.region,
        population = excluded.population,
        currency_code = excluded.currency_code,
        exchange_rate = excluded.exchange_rate,
        estimated_gdp = excluded.estimated_gdp,
        flag_url = excluded.flag_url,
        last_refreshed_at = excluded.last_refreshed_at`,
      [
        country.name,
        country.capital,
        country.region,
        country.population,
        country.currency_code,
        country.exchange_rate,
        country.estimated_gdp,
        country.flag_url,
        country.last_refreshed_at,
      ],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

// Get all countries
export const dbAllCountries = () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM countries", [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Get country by name
export const dbGetCountry = (name) => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM countries WHERE LOWER(name) = LOWER(?)",
      [name],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
};

// Delete country by name
export const dbDeleteCountry = (name) => {
  return new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM countries WHERE LOWER(name) = LOWER(?)",
      [name],
      function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
};

// Save summary image
export const saveSummaryImage = (
  topCountries,
  totalCountries,
  lastRefreshed
) => {
  const svgParts = [];

  svgParts.push(`
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <text x="50" y="50" font-size="28" fill="#000000" font-family="Arial">
        Total Countries: ${totalCountries}
      </text>
      <text x="50" y="100" font-size="24" fill="#000000" font-family="Arial">
        Last Refreshed: ${lastRefreshed}
      </text>
      <text x="50" y="150" font-size="26" fill="#000000" font-family="Arial">
        Top 5 Countries by GDP:
      </text>
  `);

  topCountries.forEach((c, i) => {
    svgParts.push(`
      <text x="50" y="${
        200 + i * 50
      }" font-size="22" fill="#333" font-family="Arial">
        ${i + 1}. ${c.name} - ${Math.round(c.estimated_gdp).toLocaleString()}
      </text>
    `);
  });

  svgParts.push(`</svg>`);
  const svgContent = svgParts.join("");

  db.run(
    `INSERT INTO summary_images (svg_content, last_refreshed_at)
     VALUES (?, ?)`,
    [svgContent, lastRefreshed],
    (err) => {
      if (err) console.error("❌ Error saving SVG image:", err.message);
    }
  );
};
