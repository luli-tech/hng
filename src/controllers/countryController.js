import fetch from "node-fetch";
import prisma from "../utils/lib/prisma.js";

const COUNTRIES_API =
  "https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies";
const EXCHANGE_API = "https://open.er-api.com/v6/latest/USD";

// ✅ Refresh countries and store summary SVG in Meta
export const refreshCountries = async (req, res) => {
  try {
    const [countriesRes, exchangeRes] = await Promise.all([
      fetch(COUNTRIES_API),
      fetch(EXCHANGE_API),
    ]);

    if (!countriesRes.ok || !exchangeRes.ok) {
      return res.status(503).json({
        error: "External data source unavailable",
        details: "Could not fetch data from API",
      });
    }

    const countries = await countriesRes.json();
    const exchangeRates = await exchangeRes.json();
    const now = new Date();

    // 🧩 Save or update countries
    for (const country of countries) {
      const currency = country.currencies?.[0]?.code || null;
      const rate =
        currency && exchangeRates.rates[currency]
          ? exchangeRates.rates[currency]
          : null;
      const randomMultiplier = Math.floor(Math.random() * 1001) + 1000;
      const estimated_gdp = rate
        ? (country.population * randomMultiplier) / rate
        : 0;

      await prisma.country.upsert({
        where: { name: country.name },
        update: {
          capital: country.capital || null,
          region: country.region || null,
          population: country.population,
          currency_code: currency,
          exchange_rate: rate,
          estimated_gdp,
          flag_url: country.flag || null,
          last_refreshed_at: now,
        },
        create: {
          name: country.name,
          capital: country.capital || null,
          region: country.region || null,
          population: country.population,
          currency_code: currency,
          exchange_rate: rate,
          estimated_gdp,
          flag_url: country.flag || null,
          last_refreshed_at: now,
        },
      });
    }

    // 🧠 Generate summary SVG
    const allCountries = await prisma.country.findMany();
    const topCountries = allCountries
      .sort((a, b) => b.estimated_gdp - a.estimated_gdp)
      .slice(0, 5);

    const svgParts = [];
    svgParts.push(`
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#fff"/>
        <text x="50" y="50" font-size="28" fill="#000">Total Countries: ${
          allCountries.length
        }</text>
        <text x="50" y="100" font-size="22" fill="#000">Last Refreshed: ${now.toISOString()}</text>
        <text x="50" y="150" font-size="24" fill="#000">Top 5 Countries by GDP:</text>
    `);
    topCountries.forEach((c, i) => {
      svgParts.push(`
        <text x="50" y="${200 + i * 50}" font-size="20" fill="#333">${i + 1}. ${
        c.name
      } - ${Math.round(c.estimated_gdp).toLocaleString()}</text>
      `);
    });
    svgParts.push(`</svg>`);
    const svgContent = svgParts.join("");

    // 🧩 Upsert Meta record
    await prisma.meta.upsert({
      where: { id: 1 },
      update: {
        total_countries: allCountries.length,
        last_refreshed_at: now,
        summary_svg: svgContent,
      },
      create: {
        id: 1,
        total_countries: allCountries.length,
        last_refreshed_at: now,
        summary_svg: svgContent,
      },
    });

    res.json({
      message: "✅ Countries refreshed successfully",
      last_refreshed_at: now,
    });
  } catch (err) {
    console.error("❌ Refresh failed:", err);
    res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

// ✅ Get all countries
export const getCountries = async (req, res) => {
  try {
    const countries = await prisma.country.findMany();
    res.json(countries);
  } catch (err) {
    console.error("❌ Failed to get countries:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Get one country by name
export const getCountryByName = async (req, res) => {
  try {
    const { name } = req.params;
    const country = await prisma.country.findUnique({ where: { name } });

    if (!country) return res.status(404).json({ error: "Country not found" });
    res.json(country);
  } catch (err) {
    console.error("❌ Failed to get country:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Delete country by name
export const deleteCountryByName = async (req, res) => {
  try {
    const { name } = req.params;
    const deleted = await prisma.country.delete({ where: { name } });
    res.json({ message: `Deleted ${deleted.name} successfully`, deleted });
  } catch (err) {
    console.error("❌ Failed to delete country:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Serve summary SVG image
export const getSummaryImage = async (req, res) => {
  try {
    const meta = await prisma.meta.findUnique({ where: { id: 1 } });

    if (!meta || !meta.summary_svg) {
      return res.status(404).json({ error: "Summary image not found" });
    }

    res.setHeader("Content-Type", "image/svg+xml");
    res.send(meta.summary_svg);
  } catch (err) {
    console.error("❌ Failed to fetch summary image:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
