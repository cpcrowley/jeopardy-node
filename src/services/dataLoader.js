const fs = require("fs");
const path = require("path");

// Path to gameData directory containing classified season files
const GAME_DATA_DIR = path.join(__dirname, "../../gameData");

// Cache for loaded seasons
const seasonCache = {};

/**
 * Load a single season's game data
 * @param {number} seasonNum - Season number (1-42+)
 * @returns {Array} Array of game objects for that season
 */
function loadSeason(seasonNum) {
  const key = `season-${String(seasonNum).padStart(2, "0")}`;

  // Return cached data if available
  if (seasonCache[key]) {
    return seasonCache[key];
  }

  const filePath = path.join(GAME_DATA_DIR, key);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    seasonCache[key] = data;
    return data;
  } catch (err) {
    console.error(`Error loading ${key}:`, err.message);
    return [];
  }
}

/**
 * Load games from a range of seasons
 * @param {number} startSeason - First season to include
 * @param {number} endSeason - Last season to include
 * @returns {Array} Array of all game objects in the range
 */
function loadSeasonRange(startSeason, endSeason) {
  const games = [];
  for (let s = startSeason; s <= endSeason; s++) {
    games.push(...loadSeason(s));
  }
  return games;
}

/**
 * Get list of available seasons
 * @returns {Array<number>} Sorted array of season numbers
 */
function getAvailableSeasons() {
  try {
    const files = fs.readdirSync(GAME_DATA_DIR);
    const seasons = files
      .filter((f) => f.match(/^season-\d+$/))
      .map((f) => parseInt(f.replace("season-", "")))
      .sort((a, b) => a - b);
    return seasons;
  } catch (err) {
    console.error("Error reading gameData directory:", err.message);
    return [];
  }
}

/**
 * Clear the season cache (useful for testing or reloading data)
 */
function clearCache() {
  Object.keys(seasonCache).forEach((key) => delete seasonCache[key]);
}

module.exports = {
  loadSeason,
  loadSeasonRange,
  getAvailableSeasons,
  clearCache,
};
