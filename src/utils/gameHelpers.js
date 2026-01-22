/**
 * Helper functions for analyzing Jeopardy game data
 */

/**
 * Parse a score string like "$20,200" to a number
 * @param {string|number} score - Score value (string with $ and commas, or number)
 * @returns {number} Parsed numeric score
 */
function parseScore(score) {
  if (typeof score === "number") return score;
  if (!score) return 0;
  return parseInt(String(score).replace(/[$,]/g, "")) || 0;
}

/**
 * Get the winner of a game from finalScores
 * @param {Object} game - Game object
 * @returns {string|null} Winner's name or null if not determinable
 */
function getWinner(game) {
  if (!game.finalScores || game.finalScores.length === 0) {
    return null;
  }

  // Parse scores and sort to find highest
  const scores = game.finalScores.map((s) => ({
    player: s.player,
    score: parseScore(s.score),
  }));

  scores.sort((a, b) => b.score - a.score);
  return scores[0].player;
}

/**
 * Rank players by their scores at end of a round
 * @param {Array} endOfRoundScores - Array of {player, score} objects
 * @returns {Object} {first, second, third, scores} where scores is sorted array
 */
function rankByEndOfRound(endOfRoundScores) {
  if (!endOfRoundScores || endOfRoundScores.length === 0) {
    return { first: null, second: null, third: null, scores: [] };
  }

  // Sort by score descending
  const sorted = [...endOfRoundScores]
    .map((s) => ({
      player: s.player,
      score: parseScore(s.score),
    }))
    .sort((a, b) => b.score - a.score);

  return {
    first: sorted[0]?.player || null,
    second: sorted[1]?.player || null,
    third: sorted[2]?.player || null,
    scores: sorted,
  };
}

/**
 * Count correct answers for a player across a set of clues
 * @param {Array} clues - Array of clue objects
 * @param {string} playerName - Name of player to count for
 * @returns {number} Number of correct answers
 */
function countCorrectAnswers(clues, playerName) {
  if (!clues || !playerName) return 0;

  return clues.reduce((count, clue) => {
    if (clue.correctContestants && clue.correctContestants.includes(playerName)) {
      return count + 1;
    }
    return count;
  }, 0);
}

/**
 * Get a player's Final Jeopardy response data
 * @param {Object} game - Game object
 * @param {string} playerName - Name of player
 * @returns {Object|null} Response object or null if not found
 */
function getFJResponse(game, playerName) {
  const responses = game.rounds?.finalJeopardy?.responses;
  if (!responses) return null;
  return responses.find((r) => r.contestant === playerName) || null;
}

/**
 * Check if a game has valid data for analysis
 * @param {Object} game - Game object
 * @returns {boolean} True if game has required data
 */
function isValidGame(game) {
  return (
    game &&
    game.rounds &&
    game.rounds.jeopardy &&
    game.rounds.doubleJeopardy &&
    game.rounds.finalJeopardy &&
    game.finalScores &&
    game.finalScores.length >= 2
  );
}

/**
 * Get end of round scores for Jeopardy round
 * @param {Object} game - Game object
 * @returns {Array|null} End of round scores or null
 */
function getJeopardyEndScores(game) {
  return game.rounds?.jeopardy?.endOfRoundScores || null;
}

/**
 * Get end of round scores for Double Jeopardy round
 * @param {Object} game - Game object
 * @returns {Array|null} End of round scores or null
 */
function getDoubleJeopardyEndScores(game) {
  return game.rounds?.doubleJeopardy?.endOfRoundScores || null;
}

module.exports = {
  parseScore,
  getWinner,
  rankByEndOfRound,
  countCorrectAnswers,
  getFJResponse,
  isValidGame,
  getJeopardyEndScores,
  getDoubleJeopardyEndScores,
};
