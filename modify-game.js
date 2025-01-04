const fs = require("fs");
const path = require("path");

function convertValueToInteger(valueString) {
  const value = parseInt(valueString.replace(/[$,D: ]/g, "")) || 0;
  return value;
}

function modifyResponses(responses, runningScores) {
  if (!responses || responses.length < 2) return responses;

  const modifiedResponses = [];

  // Process pairs of responses (0,1), (2,3), and (4,5)
  for (let i = 0; i < responses.length; i += 2) {
    if (i + 1 < responses.length) {
      // Add value from the second entry to the first entry
      const firstEntry = {...responses[i]};
      firstEntry.value = convertValueToInteger(responses[i + 1].response);

      // Add finalScore based on running score and whether answer was correct
      const lastRunningScore = runningScores[firstEntry.contestant] || 0;
      if (firstEntry.isCorrect) {
        firstEntry.finalScore = lastRunningScore + firstEntry.value;
      } else if (firstEntry.isIncorrect) {
        firstEntry.finalScore = lastRunningScore - firstEntry.value;
      } else {
        firstEntry.finalScore = lastRunningScore;
      }

      modifiedResponses.push(firstEntry);
    } else {
      // If there's an unpaired entry, keep it as is
      modifiedResponses.push(responses[i]);
    }
  }

  return modifiedResponses;
}

function modifyGame(filename) {
  try {
    // Read and parse the game file
    const filePath = path.join(__dirname, "games.orig", filename);
    const gameData = JSON.parse(fs.readFileSync(filePath, "utf8"));

    // Initialize running scores for each contestant
    const runningScores = {};
    if (gameData.finalScores) {
      gameData.finalScores.forEach((score) => {
        runningScores[score.player] = 0;
      });
    }

    // Process Jeopardy round
    if (gameData.rounds.jeopardy && gameData.rounds.jeopardy.clues) {
      // Sort clues by orderNumber
      gameData.rounds.jeopardy.clues.sort(
        (a, b) => (a.orderNumber || Infinity) - (b.orderNumber || Infinity)
      );

      gameData.rounds.jeopardy.clues.forEach((clue) => {
        // Convert value to integer
        if (clue.value) {
          clue.value = convertValueToInteger(clue.value);
        }

        if (clue.correctContestants && clue.correctContestants.length > 0) {
          // Add points for correct answers
          clue.correctContestants.forEach((contestant) => {
            if (runningScores.hasOwnProperty(contestant)) {
              runningScores[contestant] += clue.value;
            }
          });
          // clue.correctContestants.shift(); // Remove first item
        }
        if (clue.incorrectContestants && clue.incorrectContestants.length > 0) {
          // Subtract points for incorrect answers
          clue.incorrectContestants.forEach((contestant) => {
            if (
              contestant !== "Triple Stumper" &&
              runningScores.hasOwnProperty(contestant)
            ) {
              runningScores[contestant] -= clue.value;
            }
          });
          // Remove first item and "Triple Stumper"
          // clue.incorrectContestants.shift();
          clue.incorrectContestants = clue.incorrectContestants.filter(
            (contestant) => contestant !== "Triple Stumper"
          );
        }

        // Add running scores to the clue
        clue.runningScores = Object.entries(runningScores).map(
          ([player, score]) => ({
            player,
            score,
          })
        );
      });
    }

    // Process Double Jeopardy round
    if (
      gameData.rounds.doubleJeopardy &&
      gameData.rounds.doubleJeopardy.clues
    ) {
      // Sort clues by orderNumber
      gameData.rounds.doubleJeopardy.clues.sort(
        (a, b) => (a.orderNumber || Infinity) - (b.orderNumber || Infinity)
      );

      gameData.rounds.doubleJeopardy.clues.forEach((clue) => {
        // Convert value to integer
        if (clue.value) {
          clue.value = convertValueToInteger(clue.value);
        }

        if (clue.correctContestants && clue.correctContestants.length > 0) {
          // Add points for correct answers
          clue.correctContestants.forEach((contestant) => {
            if (runningScores.hasOwnProperty(contestant)) {
              runningScores[contestant] += clue.value;
            }
          });
          clue.correctContestants.shift(); // Remove first item
        }
        if (clue.incorrectContestants && clue.incorrectContestants.length > 0) {
          // Subtract points for incorrect answers
          clue.incorrectContestants.forEach((contestant) => {
            if (
              contestant !== "Triple Stumper" &&
              runningScores.hasOwnProperty(contestant)
            ) {
              runningScores[contestant] -= clue.value;
            }
          });
          // Remove first item and "Triple Stumper"
          clue.incorrectContestants.shift();
          clue.incorrectContestants = clue.incorrectContestants.filter(
            (contestant) => contestant !== "Triple Stumper"
          );
        }

        // Add running scores to the clue
        clue.runningScores = Object.entries(runningScores).map(
          ([player, score]) => ({
            player,
            score,
          })
        );
      });
    }

    // Modify Final Jeopardy responses
    if (
      gameData.rounds.finalJeopardy &&
      gameData.rounds.finalJeopardy.responses
    ) {
      gameData.rounds.finalJeopardy.responses = modifyResponses(
        gameData.rounds.finalJeopardy.responses,
        runningScores
      );
    }

    // Truncate finalScores to three items
    if (gameData.finalScores && gameData.finalScores.length > 3) {
      gameData.finalScores = gameData.finalScores.slice(0, 3);
    }

    // Update contestants array with names from finalScores
    if (gameData.finalScores && gameData.finalScores.length > 0) {
      gameData.contestants = gameData.finalScores.map((score) => score.player);
    }

    // Write the modified data to the new file
    const outputPath = path.join(__dirname, "games.mod", filename);
    fs.writeFileSync(outputPath, JSON.stringify(gameData, null, 2));

    console.log(`Successfully modified game data and wrote to ${filename}`);
  } catch (error) {
    console.error("Error modifying game:", error);
    throw error;
  }
}

// Get all files in games.orig directory that start with "j-"
const files = fs
  .readdirSync("games.orig")
  .filter((file) => file.startsWith("j-"));

// Process each file
files.forEach((file) => {
  console.log(`Processing ${file}`);
  try {
    modifyGame(file);
  } catch (error) {
    console.error(`Error processing ${file}:`, error);
  }
});
