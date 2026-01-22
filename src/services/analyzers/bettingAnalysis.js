/**
 * Analyzers for Final Jeopardy betting pattern questions
 * Q3: First place bets enough to cover
 * Q4: Second place bets at least 90%
 * Q5: Second place bets "just enough"
 */

const {
  rankByEndOfRound,
  getFJResponse,
  getDoubleJeopardyEndScores,
} = require("../../utils/gameHelpers");

/**
 * Q3: How often does 1st place bet enough to beat both others if they bet everything?
 * @param {Array} games - Array of game objects
 * @returns {Object} Analysis results
 */
function analyzeFirstPlaceBetsCover(games) {
  const stats = {
    totalGames: 0,
    betEnoughToCover: 0,
  };

  for (const game of games) {
    const djScores = getDoubleJeopardyEndScores(game);
    if (!djScores || djScores.length < 2) continue;

    const ranked = rankByEndOfRound(djScores);
    const firstPlayer = ranked.first;
    const firstScore = ranked.scores[0]?.score || 0;
    const secondScore = ranked.scores[1]?.score || 0;
    const thirdScore = ranked.scores[2]?.score || 0;

    // Skip if first place has 0 or negative score
    if (firstScore <= 0) continue;

    // Calculate max possible scores if others bet everything and are correct
    const secondMax = secondScore > 0 ? secondScore * 2 : 0;
    const thirdMax = thirdScore > 0 ? thirdScore * 2 : 0;

    // Get first player's wager
    const firstResponse = getFJResponse(game, firstPlayer);
    if (!firstResponse || firstResponse.value === undefined) continue;

    const wager = firstResponse.value;

    // Calculate how much first place needs to cover both
    const maxOpponent = Math.max(secondMax, thirdMax);
    const neededToCover = maxOpponent - firstScore + 1;

    stats.totalGames++;

    // First place "covers" if their potential winning score beats the max opponent score
    // This means: firstScore + wager >= maxOpponent + 1 (to beat, not tie)
    // Which simplifies to: wager >= neededToCover
    if (neededToCover <= 0 || wager >= neededToCover) {
      stats.betEnoughToCover++;
    }
  }

  const pct =
    stats.totalGames > 0
      ? ((stats.betEnoughToCover / stats.totalGames) * 100).toFixed(1)
      : "0.0";

  return {
    query: "first-place-cover",
    description: "First place bets enough to cover max possible opponent scores",
    totalGames: stats.totalGames,
    results: [
      {
        metric: "Bet enough to cover",
        count: stats.betEnoughToCover,
        percentage: pct,
      },
      {
        metric: "Did not bet enough",
        count: stats.totalGames - stats.betEnoughToCover,
        percentage: (100 - parseFloat(pct)).toFixed(1),
      },
    ],
  };
}

/**
 * Q4: How often does 2nd place bet at least 90% of their total?
 * @param {Array} games - Array of game objects
 * @returns {Object} Analysis results
 */
function analyzeSecondPlaceBets90Percent(games) {
  const stats = {
    totalGames: 0,
    bet90OrMore: 0,
    bet75to90: 0,
    bet50to75: 0,
    betUnder50: 0,
  };

  for (const game of games) {
    const djScores = getDoubleJeopardyEndScores(game);
    if (!djScores || djScores.length < 2) continue;

    const ranked = rankByEndOfRound(djScores);
    const secondPlayer = ranked.second;
    const secondScore = ranked.scores[1]?.score || 0;

    // Skip if second place has 0 or negative score (can't bet)
    if (secondScore <= 0 || !secondPlayer) continue;

    const secondResponse = getFJResponse(game, secondPlayer);
    if (!secondResponse || secondResponse.value === undefined) continue;

    const wager = secondResponse.value;
    const betPct = (wager / secondScore) * 100;

    stats.totalGames++;

    if (betPct >= 90) {
      stats.bet90OrMore++;
    } else if (betPct >= 75) {
      stats.bet75to90++;
    } else if (betPct >= 50) {
      stats.bet50to75++;
    } else {
      stats.betUnder50++;
    }
  }

  const pct = (count) =>
    stats.totalGames > 0 ? ((count / stats.totalGames) * 100).toFixed(1) : "0.0";

  return {
    query: "second-place-90pct",
    description: "Second place betting patterns (% of their score wagered)",
    totalGames: stats.totalGames,
    results: [
      { metric: "Bet 90%+", count: stats.bet90OrMore, percentage: pct(stats.bet90OrMore) },
      { metric: "Bet 75-90%", count: stats.bet75to90, percentage: pct(stats.bet75to90) },
      { metric: "Bet 50-75%", count: stats.bet50to75, percentage: pct(stats.bet50to75) },
      { metric: "Bet under 50%", count: stats.betUnder50, percentage: pct(stats.betUnder50) },
    ],
  };
}

/**
 * Q5: How often does 2nd place bet "just enough" to beat 1st (101-110% of difference)?
 * @param {Array} games - Array of game objects
 * @returns {Object} Analysis results
 */
function analyzeSecondPlaceBetsJustEnough(games) {
  const stats = {
    totalGames: 0,
    betJustEnough: 0,
    betMoreThanEnough: 0,
    betLessThanEnough: 0,
  };

  for (const game of games) {
    const djScores = getDoubleJeopardyEndScores(game);
    if (!djScores || djScores.length < 2) continue;

    const ranked = rankByEndOfRound(djScores);
    const firstScore = ranked.scores[0]?.score || 0;
    const secondPlayer = ranked.second;
    const secondScore = ranked.scores[1]?.score || 0;

    // Skip if second place is not behind first, or has non-positive score
    if (secondScore <= 0 || firstScore <= secondScore || !secondPlayer) continue;

    const secondResponse = getFJResponse(game, secondPlayer);
    if (!secondResponse || secondResponse.value === undefined) continue;

    const wager = secondResponse.value;
    const difference = firstScore - secondScore;

    // "Just enough" to beat first if second is correct and first is wrong:
    // Second needs: secondScore + wager > firstScore
    // So: wager > difference
    // "Just enough" defined as 101-110% of the difference

    const minTarget = difference + 1; // Must bet at least this to beat (not just tie)
    const maxTarget = difference * 1.1; // Upper bound of "just enough"

    stats.totalGames++;

    if (wager >= minTarget && wager <= maxTarget) {
      stats.betJustEnough++;
    } else if (wager > maxTarget) {
      stats.betMoreThanEnough++;
    } else {
      stats.betLessThanEnough++;
    }
  }

  const pct = (count) =>
    stats.totalGames > 0 ? ((count / stats.totalGames) * 100).toFixed(1) : "0.0";

  return {
    query: "second-place-just-enough",
    description: "Second place bets 'just enough' to beat first (difference + 1 to 110%)",
    totalGames: stats.totalGames,
    results: [
      {
        metric: "Bet just enough (diff+1 to 110%)",
        count: stats.betJustEnough,
        percentage: pct(stats.betJustEnough),
      },
      {
        metric: "Bet more than enough (>110%)",
        count: stats.betMoreThanEnough,
        percentage: pct(stats.betMoreThanEnough),
      },
      {
        metric: "Bet less than needed",
        count: stats.betLessThanEnough,
        percentage: pct(stats.betLessThanEnough),
      },
    ],
  };
}

module.exports = {
  analyzeFirstPlaceBetsCover,
  analyzeSecondPlaceBets90Percent,
  analyzeSecondPlaceBetsJustEnough,
};
