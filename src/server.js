import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fetch from "node-fetch";
import { PrismaClient } from "../generated/prisma/index.js";

dotenv.config();
const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const COUNTRIES_API =
  "https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies";
const EXCHANGE_API = "https://open.er-api.com/v6/latest/USD";

// ✅ Refresh all countries and generate SVG summary
app.post("/countries/refresh", async (req, res) => {
  try {
    const [countriesRes, exchangeRes] = await Promise.all([
      fetch(COUNTRIES_API),
      fetch(EXCHANGE_API),
    ]);

    if (!countriesRes.ok || !exchangeRes.ok)
      return res.status(503).json({ error: "External API unavailable" });

    const countries = await countriesRes.json();
    const exchangeRates = await exchangeRes.json();
    const now = new Date();

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

    // 🖼️ Generate SVG summary
    const allCountries = await prisma.country.findMany();
    const topCountries = allCountries
      .sort((a, b) => b.estimated_gdp - a.estimated_gdp)
      .slice(0, 5);

    const svgParts = [];
    svgParts.push(`
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <text x="50" y="50" font-size="28" fill="#000000">Total Countries: ${
          allCountries.length
        }</text>
        <text x="50" y="100" font-size="24" fill="#000000">Last Refreshed: ${now.toISOString()}</text>
        <text x="50" y="150" font-size="26" fill="#000000">Top 5 Countries by GDP:</text>
    `);

    topCountries.forEach((c, i) => {
      svgParts.push(`
        <text x="50" y="${200 + i * 50}" font-size="22" fill="#333">
          ${i + 1}. ${c.name} - ${Math.round(c.estimated_gdp).toLocaleString()}
        </text>
      `);
    });

    svgParts.push(`</svg>`);
    const svgContent = svgParts.join("");

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
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 📊 Get all countries
app.get("/countries", async (req, res) => {
  try {
    const { region, currency, sort } = req.query;
    let countries = await prisma.country.findMany();

    if (region) countries = countries.filter((c) => c.region === region);
    if (currency)
      countries = countries.filter((c) => c.currency_code === currency);
    if (sort === "gdp_desc")
      countries.sort((a, b) => b.estimated_gdp - a.estimated_gdp);

    res.json(countries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/countries/image", async (req, res) => {
  try {
    const meta = await prisma.meta.findUnique({ where: { id: 1 } });
    if (!meta || !meta.summary_svg)
      return res.status(404).json({ error: "Summary image not found" });

    res.setHeader("Content-Type", "image/svg+xml");
    res.send(meta.summary_svg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/status", async (req, res) => {
  try {
    const total = await prisma.country.count();
    const meta = await prisma.meta.findUnique({ where: { id: 1 } });
    res.json({
      total_countries: total,
      last_refreshed_at: meta?.last_refreshed_at || null,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 📍 Get one country
app.get("/countries/:name", async (req, res) => {
  try {
    const country = await prisma.country.findUnique({
      where: { name: req.params.name },
    });
    if (!country) return res.status(404).json({ error: "Country not found" });
    res.json(country);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ❌ Delete a country
app.delete("/countries/:name", async (req, res) => {
  try {
    await prisma.country.delete({ where: { name: req.params.name } });
    res.json({ message: `✅ ${req.params.name} deleted successfully` });
  } catch (err) {
    res.status(404).json({ error: "Country not found" });
  }
});

// 🖼️ Get SVG summary
app.get("/countries/image", async (req, res) => {
  try {
    const meta = await prisma.meta.findUnique({ where: { id: 1 } });
    if (!meta || !meta.summary_svg)
      return res.status(404).json({ error: "Summary image not found" });

    res.setHeader("Content-Type", "image/svg+xml");
    res.send(meta.summary_svg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Health/status check

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
