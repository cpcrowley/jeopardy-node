/**
 * Jeopardy Game Statistics Server
 * Express server for analyzing Jeopardy game data
 */

require("dotenv").config();

const express = require("express");
const path = require("path");
const apiRoutes = require("./src/routes/api");

const app = express();
const PORT = process.env.PORT || 3700;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// API routes
app.use("/api", apiRoutes);

// Serve index.html for root path
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`Jeopardy Stats server running on http://localhost:${PORT}`);
  console.log(`API endpoints:`);
  console.log(`  GET  /api/seasons  - List available seasons`);
  console.log(`  GET  /api/queries  - List available query types`);
  console.log(`  POST /api/analyze  - Run analysis query`);
});
