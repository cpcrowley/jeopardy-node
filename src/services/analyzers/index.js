/**
 * Analyzer registry - maps query IDs to analyzer functions
 */

const {
  analyzePositionWinRateAfterDJ,
  analyzePositionWinRateAfterJ,
} = require("./positionWinRate");

const {
  analyzeFirstPlaceBetsCover,
  analyzeSecondPlaceBets90Percent,
  analyzeSecondPlaceBetsJustEnough,
} = require("./bettingAnalysis");

const { analyzeCorrectAnswersByPlacement } = require("./correctAnswers");

// Registry of available analyzers
const analyzers = {
  "position-win-rate-dj": {
    name: "Position Win Rate (After Double Jeopardy)",
    description: "How often does 1st/2nd/3rd place after Double Jeopardy win the game?",
    fn: analyzePositionWinRateAfterDJ,
  },
  "position-win-rate-j": {
    name: "Position Win Rate (After Jeopardy)",
    description: "How often does 1st/2nd/3rd place after the Jeopardy round win the game?",
    fn: analyzePositionWinRateAfterJ,
  },
  "first-place-cover": {
    name: "First Place Covers",
    description: "How often does 1st place bet enough to beat both opponents if they bet everything?",
    fn: analyzeFirstPlaceBetsCover,
  },
  "second-place-90pct": {
    name: "Second Place Bets 90%+",
    description: "How often does 2nd place bet at least 90% of their total?",
    fn: analyzeSecondPlaceBets90Percent,
  },
  "second-place-just-enough": {
    name: "Second Place Bets Just Enough",
    description: "How often does 2nd place bet just enough to beat 1st (101-110% of difference)?",
    fn: analyzeSecondPlaceBetsJustEnough,
  },
  "correct-answers": {
    name: "Correct Answers by Placement",
    description: "Average number of correct answers for winner vs 2nd vs 3rd place",
    fn: analyzeCorrectAnswersByPlacement,
  },
};

/**
 * Get list of available queries
 * @returns {Array} Array of {id, name, description} objects
 */
function getAvailableQueries() {
  return Object.entries(analyzers).map(([id, config]) => ({
    id,
    name: config.name,
    description: config.description,
  }));
}

/**
 * Run an analyzer by query ID
 * @param {string} queryId - The query identifier
 * @param {Array} games - Array of game objects to analyze
 * @returns {Object|null} Analysis results or null if query not found
 */
function runAnalyzer(queryId, games) {
  const analyzer = analyzers[queryId];
  if (!analyzer) {
    return null;
  }
  return analyzer.fn(games);
}

module.exports = {
  getAvailableQueries,
  runAnalyzer,
};
