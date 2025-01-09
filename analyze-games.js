const fs = require("fs");
const path = require("path");

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
let totalGames = 0;
let lockoutCount = 0;

let allGames = [];
let gamesSheet = "";

let jeopardyClueCount = 0;
let doubleJeopardyClueCount = 0;

let jeopardyDidNotFinishCount = 0;
let doubleJeopardyDidNotFinishCount = 0;

let firstBreakScores = [];
let jeopardyScores = [];
let doubleJeopardyScores = [];
let coryatScores = [];

let jeopardyClues = [];
let doubleJeopardyClues = [];

let jeopardyCategories = [];
let doubleJeopardyCategories = [];

let finalJeopardyResponses = [];

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
function checkIfValuesExist(gameData) {
  if (gameData.rounds?.doubleJeopardy?.firstBreakScores) {
    firstBreakScores = gameData.rounds.jeopardy.firstBreakScores;
  }

  if (gameData.rounds?.doubleJeopardy?.endOfRoundScores) {
    jeopardyScores = gameData.rounds.jeopardy.endOfRoundScores;
  }

  if (gameData.rounds?.doubleJeopardy?.endOfRoundScores) {
    doubleJeopardyScores = gameData.rounds.doubleJeopardy.endOfRoundScores;
  }

  if (gameData.coryatScores) {
    coryatScores = gameData.coryatScores;
  }

  if (gameData.rounds?.jeopardy?.clues) {
    jeopardyClues = gameData.rounds.jeopardy.clues;
  }

  if (gameData.rounds?.doubleJeopardy?.clues) {
    doubleJeopardyClues = gameData.rounds.doubleJeopardy.clues;
  }

  if (gameData.rounds?.jeopardy?.categories) {
    jeopardyCategories = gameData.rounds.jeopardy.categories;
  }

  if (gameData.rounds?.doubleJeopardy?.categories) {
    doubleJeopardyCategories = gameData.rounds.doubleJeopardy.categories;
  }

  if (gameData.rounds?.finalJeopardy?.responses) {
    finalJeopardyResponses = gameData.rounds.finalJeopardy.responses;
  }
}

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
function countUpClues(file) {
  jeopardyClueCount += jeopardyClues.length;
  if (20 < jeopardyClueCount && jeopardyClueCount < 30) {
    ++jeopardyDidNotFinishCount;
    console.log(`${file} has only ${jeopardyClueCount} clues in jeopardy`);
  }
  doubleJeopardyClueCount += doubleJeopardyClues.length;
  if (20 < doubleJeopardyClueCount && doubleJeopardyClueCount < 30) {
    ++doubleJeopardyDidNotFinishCount;
    console.log(
      `${file} has only ${doubleJeopardyClueCount} clues in double jeopardy`
    );
  }
}

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
function analyzeFinalJeopardy() {
  if (doubleJeopardyScores.length !== 3) return;

  // Get the numeric scores
  const numericScores = doubleJeopardyScores.map((s) => s.score);
  let isLockout = false;

  // Check if any score is more than double both other scores
  for (let i = 0; i < 3; i++) {
    const score = numericScores[i];
    const otherScores = numericScores.filter((_, idx) => idx !== i);

    if (otherScores.every((otherScore) => score > otherScore * 2)) {
      isLockout = true;
      break; // Only count each game once
    }
  }

  if (isLockout) {
    ++lockoutCount;
    return;
  }

  // Figure out the betting strategy
}

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
function analyzeOneGame(gameData, file) {
  allGames.push(gameData);
  gamesSheet += `${gameData.date},${gameData.showNumber},${gameData.gameId},"${gameData.title}","${gameData.comments}"\n`;

  checkIfValuesExist(gameData);
  countUpClues(file);
  analyzeFinalJeopardy();
}

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
function showResults() {
  console.log(`Total games processed: ${totalGames}`);
  console.log(
    `Lockouts: ${lockoutCount} (${((lockoutCount / totalGames) * 100).toFixed(
      1
    )}%)`
  );
  console.log(
    `< 30 Jeopardy Round Clues: ${jeopardyDidNotFinishCount} (${(
      (jeopardyDidNotFinishCount / totalGames) *
      100
    ).toFixed(1)}%) -- check this, does not seem right`
  );
  console.log(
    `< 30 Double Jeopardy Round Clues : ${doubleJeopardyDidNotFinishCount} (${(
      (doubleJeopardyDidNotFinishCount / totalGames) *
      100
    ).toFixed(1)}%) -- check this, does not seem right`
  );
}

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
function analyzeGames() {
  try {
    // Read the games directory
    const gamesDir = path.join(__dirname, "games");
    const files = fs
      .readdirSync(gamesDir)
      .filter((file) => file.endsWith(".json"));

    // Process each JSON file in the directory
    const gameLimit = 9999;
    for (const file of files) {
      if (totalGames >= gameLimit) {
        break;
      }
      totalGames++;
      const filePath = path.join(gamesDir, file);
      const gameData = JSON.parse(fs.readFileSync(filePath, "utf8"));
      analyzeOneGame(gameData, file);
    }

    showResults();
  } catch (error) {
    console.error("Error analyzing game:", error);
    throw error;
  }
}

analyzeGames();

//------------------------------------------------------------------------------
// Write out gamesSheet as CSV
//------------------------------------------------------------------------------
try {
  fs.writeFileSync(path.join(__dirname, "games.csv"), gamesSheet);
  console.log("Successfully wrote games data to games.csv");
} catch (error) {
  console.error("Error writing games CSV file:", error);
}

//------------------------------------------------------------------------------
// Write out allGames as JSON
//------------------------------------------------------------------------------
// try {
//   fs.writeFileSync(
//     path.join(__dirname, "all-games.json"),
//     JSON.stringify(allGames, null, 2)
//   );
//   console.log("Successfully wrote all games to all-games.json");
// } catch (error) {
//   console.error("Error writing all games file:", error);
// }
