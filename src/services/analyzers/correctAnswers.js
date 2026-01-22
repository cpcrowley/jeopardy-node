/**
 * Analyzer for correct answer statistics
 * Q6: Average correct answers by final placement
 */

const {
  getWinner,
  countCorrectAnswers,
  parseScore,
} = require("../../utils/gameHelpers");

/**
 * Q6: What is the average number of correct answers for 1st/2nd/3rd place finishers?
 * @param {Array} games - Array of game objects
 * @returns {Object} Analysis results
 */
function analyzeCorrectAnswersByPlacement(games) {
  const stats = {
    firstPlace: { totalCorrect: 0, gameCount: 0 },
    secondPlace: { totalCorrect: 0, gameCount: 0 },
    thirdPlace: { totalCorrect: 0, gameCount: 0 },
  };

  for (const game of games) {
    const jClues = game.rounds?.jeopardy?.clues || [];
    const djClues = game.rounds?.doubleJeopardy?.clues || [];
    const allClues = [...jClues, ...djClues];

    if (allClues.length === 0) continue;

    // Get final placement from finalScores
    if (!game.finalScores || game.finalScores.length < 2) continue;

    const finalRanked = game.finalScores
      .map((s) => ({
        player: s.player,
        score: parseScore(s.score),
      }))
      .sort((a, b) => b.score - a.score);

    const first = finalRanked[0]?.player;
    const second = finalRanked[1]?.player;
    const third = finalRanked[2]?.player;

    if (!first) continue;

    // Count correct answers for each player
    const firstCorrect = countCorrectAnswers(allClues, first);
    const secondCorrect = second ? countCorrectAnswers(allClues, second) : 0;
    const thirdCorrect = third ? countCorrectAnswers(allClues, third) : 0;

    stats.firstPlace.totalCorrect += firstCorrect;
    stats.firstPlace.gameCount++;

    if (second) {
      stats.secondPlace.totalCorrect += secondCorrect;
      stats.secondPlace.gameCount++;
    }

    if (third) {
      stats.thirdPlace.totalCorrect += thirdCorrect;
      stats.thirdPlace.gameCount++;
    }
  }

  const avg = (total, count) => (count > 0 ? (total / count).toFixed(1) : "0.0");

  return {
    query: "correct-answers",
    description: "Average correct answers by final placement (Jeopardy + Double Jeopardy)",
    totalGames: stats.firstPlace.gameCount,
    results: [
      {
        position: "1st Place (Winner)",
        avgCorrect: avg(stats.firstPlace.totalCorrect, stats.firstPlace.gameCount),
        totalCorrect: stats.firstPlace.totalCorrect,
        gamesAnalyzed: stats.firstPlace.gameCount,
      },
      {
        position: "2nd Place",
        avgCorrect: avg(stats.secondPlace.totalCorrect, stats.secondPlace.gameCount),
        totalCorrect: stats.secondPlace.totalCorrect,
        gamesAnalyzed: stats.secondPlace.gameCount,
      },
      {
        position: "3rd Place",
        avgCorrect: avg(stats.thirdPlace.totalCorrect, stats.thirdPlace.gameCount),
        totalCorrect: stats.thirdPlace.totalCorrect,
        gamesAnalyzed: stats.thirdPlace.gameCount,
      },
    ],
  };
}

module.exports = {
  analyzeCorrectAnswersByPlacement,
};
