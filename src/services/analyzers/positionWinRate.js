/**
 * Analyzers for position-based win rate questions
 * Q1: Win rate by position after Double Jeopardy
 * Q2: Win rate by position after Jeopardy round
 */

const {
  getWinner,
  rankByEndOfRound,
  getJeopardyEndScores,
  getDoubleJeopardyEndScores,
} = require("../../utils/gameHelpers");

/**
 * Analyze win rate by position after Double Jeopardy
 * Q1: How often does 1st/2nd/3rd place after DJ win the game?
 * @param {Array} games - Array of game objects
 * @returns {Object} Analysis results
 */
function analyzePositionWinRateAfterDJ(games) {
  const stats = {
    totalGames: 0,
    firstPlaceWins: 0,
    secondPlaceWins: 0,
    thirdPlaceWins: 0,
  };

  for (const game of games) {
    const djScores = getDoubleJeopardyEndScores(game);
    if (!djScores || djScores.length < 2) continue;

    const ranked = rankByEndOfRound(djScores);
    const winner = getWinner(game);

    if (!winner || !ranked.first) continue;

    stats.totalGames++;

    if (winner === ranked.first) {
      stats.firstPlaceWins++;
    } else if (winner === ranked.second) {
      stats.secondPlaceWins++;
    } else if (winner === ranked.third) {
      stats.thirdPlaceWins++;
    }
  }

  const pct = (count) =>
    stats.totalGames > 0 ? ((count / stats.totalGames) * 100).toFixed(1) : "0.0";

  return {
    query: "position-win-rate-dj",
    description: "Win rate by position after Double Jeopardy",
    totalGames: stats.totalGames,
    results: [
      {
        position: "1st Place",
        wins: stats.firstPlaceWins,
        percentage: pct(stats.firstPlaceWins),
      },
      {
        position: "2nd Place",
        wins: stats.secondPlaceWins,
        percentage: pct(stats.secondPlaceWins),
      },
      {
        position: "3rd Place",
        wins: stats.thirdPlaceWins,
        percentage: pct(stats.thirdPlaceWins),
      },
    ],
  };
}

/**
 * Analyze win rate by position after Jeopardy round
 * Q2: How often does 1st/2nd/3rd place after J win the game?
 * @param {Array} games - Array of game objects
 * @returns {Object} Analysis results
 */
function analyzePositionWinRateAfterJ(games) {
  const stats = {
    totalGames: 0,
    firstPlaceWins: 0,
    secondPlaceWins: 0,
    thirdPlaceWins: 0,
  };

  for (const game of games) {
    const jScores = getJeopardyEndScores(game);
    if (!jScores || jScores.length < 2) continue;

    const ranked = rankByEndOfRound(jScores);
    const winner = getWinner(game);

    if (!winner || !ranked.first) continue;

    stats.totalGames++;

    if (winner === ranked.first) {
      stats.firstPlaceWins++;
    } else if (winner === ranked.second) {
      stats.secondPlaceWins++;
    } else if (winner === ranked.third) {
      stats.thirdPlaceWins++;
    }
  }

  const pct = (count) =>
    stats.totalGames > 0 ? ((count / stats.totalGames) * 100).toFixed(1) : "0.0";

  return {
    query: "position-win-rate-j",
    description: "Win rate by position after Jeopardy round",
    totalGames: stats.totalGames,
    results: [
      {
        position: "1st Place",
        wins: stats.firstPlaceWins,
        percentage: pct(stats.firstPlaceWins),
      },
      {
        position: "2nd Place",
        wins: stats.secondPlaceWins,
        percentage: pct(stats.secondPlaceWins),
      },
      {
        position: "3rd Place",
        wins: stats.thirdPlaceWins,
        percentage: pct(stats.thirdPlaceWins),
      },
    ],
  };
}

module.exports = {
  analyzePositionWinRateAfterDJ,
  analyzePositionWinRateAfterJ,
};
