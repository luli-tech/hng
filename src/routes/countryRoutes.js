import express from "express";
import {
  refreshCountries,
  getCountries,
  getCountryByName,
  deleteCountryByName,
  getSummaryImage,
} from "../controllers/countryController.js";

console.log("router");
const router = express.Router();

// Refresh all countries
router.post("/refresh", refreshCountries);

// Summary image (must come before dynamic routes)
router.get("/image", getSummaryImage);

// Get all countries
router.get("/", getCountries);

// Get a single country by name
router.get("/:name", getCountryByName);

// Delete a country by name
router.delete("/:name", deleteCountryByName);

export default router;
