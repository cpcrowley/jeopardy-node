const fs = require("fs");
const path = require("path");

function analyzeSeasons() {
  try {
    const gameDataDir = path.join(__dirname, "gameData");

    // Process each season from 01 to 41
    // for (let season = 1; season <= 41; season++) {
    for (let season = 33; season <= 42; season++) {
      const seasonId = season.toString().padStart(2, "0");
      const seasonFile = path.join(gameDataDir, `season-${seasonId}`);

      // Skip if season file doesn't exist
      if (!fs.existsSync(seasonFile)) {
        console.log(`Season ${seasonId} not found`);
        continue;
      }

      // Read and parse the season file
      const seasonData = JSON.parse(fs.readFileSync(seasonFile, "utf8"));
      const games = seasonData; // The file contains an array of games

      let totalGames = 0;
      let totalJeopardyCorrect = 0;
      let totalDoubleJeopardyCorrect = 0;
      let totalFinalJeopardyCorrect = 0;

      // Process each game in the season
      games.forEach((gameData) => {
        totalGames++;

        // Count Jeopardy round correct answers
        if (gameData.rounds?.jeopardy?.clues) {
          gameData.rounds.jeopardy.clues.forEach((clue) => {
            if (clue.correctContestants) {
              totalJeopardyCorrect += clue.correctContestants.length;
            }
          });
        }

        // Count Double Jeopardy round correct answers
        if (gameData.rounds?.doubleJeopardy?.clues) {
          gameData.rounds.doubleJeopardy.clues.forEach((clue) => {
            if (clue.correctContestants) {
              totalDoubleJeopardyCorrect += clue.correctContestants.length;
            }
          });
        }

        // Count Final Jeopardy correct answers
        if (gameData.rounds?.finalJeopardy?.responses) {
          gameData.rounds.finalJeopardy.responses.forEach((response) => {
            if (response.isCorrect) {
              totalFinalJeopardyCorrect++;
            }
          });
        }
      });

      // Calculate averages
      if (totalGames > 0) {
        const avgJeopardyCorrect = totalJeopardyCorrect / totalGames;
        const avgDoubleJeopardyCorrect =
          totalDoubleJeopardyCorrect / totalGames;
        const avgFinalJeopardyCorrect = totalFinalJeopardyCorrect / totalGames;

        console.log(`\nSeason ${seasonId} (${totalGames} games):`);
        console.log(
          `  Average Jeopardy correct answers: ${avgJeopardyCorrect.toFixed(1)}`
        );
        console.log(
          `  Average Double Jeopardy correct answers: ${avgDoubleJeopardyCorrect.toFixed(
            1
          )}`
        );
        console.log(
          `  Average Final Jeopardy correct answers: ${avgFinalJeopardyCorrect.toFixed(
            1
          )}`
        );
      }
    }
  } catch (error) {
    console.error("Error analyzing seasons:", error);
    throw error;
  }
}

// Run the analysis
analyzeSeasons();
