const fs = require("fs");
const path = require("path");

//------------------------------------------------------------------------------
// Delete JSON game files that don't have corresponding HTML files
// This allows them to be re-scraped with the fixed scraper code
//------------------------------------------------------------------------------

const gamesDir = path.join(__dirname, "games");
const htmlDir = path.join(__dirname, "html");

// Get all JSON files
const jsonFiles = fs.readdirSync(gamesDir).filter((f) => f.endsWith(".json"));
console.log(`Found ${jsonFiles.length} JSON files`);

// Get all HTML files as a Set for fast lookup
const htmlFiles = new Set(
  fs.readdirSync(htmlDir)
    .filter((f) => f.endsWith(".html"))
    .map((f) => f.replace(".html", ""))
);
console.log(`Found ${htmlFiles.size} HTML files`);

// Find JSON files without matching HTML
let deleteCount = 0;
let keepCount = 0;

for (const jsonFile of jsonFiles) {
  const baseName = jsonFile.replace(".json", "");

  if (!htmlFiles.has(baseName)) {
    // No matching HTML file - delete the JSON
    const jsonPath = path.join(gamesDir, jsonFile);
    fs.unlinkSync(jsonPath);
    deleteCount++;

    if (deleteCount % 100 === 0) {
      console.log(`Deleted ${deleteCount} files...`);
    }
  } else {
    keepCount++;
  }
}

console.log(`\nComplete!`);
console.log(`Deleted: ${deleteCount} JSON files (no matching HTML)`);
console.log(`Kept: ${keepCount} JSON files (have matching HTML)`);
console.log(`\nNow run the scraper to re-fetch the deleted games from j-archive.com`);
