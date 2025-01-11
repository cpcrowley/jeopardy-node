const fs = require("fs");
const path = require("path");

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
let totalGames = 0;
let lockoutCount = 0;

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

let currentSeason = 1;
let games = {};

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
function classifyOneGame(gameData) {
  gamesSheet += `${gameData.date},${gameData.showNumber},${gameData.gameId},`;
  gamesSheet += `"${gameData.title}","${gameData.comments}"\n`;

  classifyGame(gameData);
  checkIfValuesExist(gameData);
  analyzeFinalJeopardy();
}

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
function classifyGame(gameData) {
  let notes = gameData.comments;

  // See if we are starting a new season
  if (notes.includes("First game of Season")) {
    const match = notes.match(/First game of Season (\d+)/);
    if (match) {
      currentSeason = parseInt(match[1]);
    } else {
      console.log(`No year found in ${gameData.date} - ${notes}`);
    }
  }

  // See if it is a regular game or something else
  gameData.classification = "regularGame";

  if (notes.includes("Tournament of Champions")) {
    gameData.classification = "tournamentOfChampions";
  } else if (notes.includes("All-Star Games")) {
    gameData.classification = "allStarGames";
  } else if (notes.includes("Back to School Week")) {
    gameData.classification = "backToSchoolWeek";
  } else if (notes.includes("Battle of the Decades")) {
    gameData.classification = "battleOfTheDecades";
  } else if (notes.includes("Celebrity Jeopardy")) {
    gameData.classification = "celebrityJeopardy";
  } else if (notes.includes("Champions Wildcard")) {
    gameData.classification = "championsWildcard";
  } else if (notes.includes("College Championship")) {
    gameData.classification = "collegeChampionship";
  } else if (notes.includes("High School Reunion Tournament")) {
    gameData.classification = "highSchoolReunionTournament";
  } else if (notes.includes("Jeopardy!: The Greatest of All Time")) {
    gameData.classification = "jeopartyGOAT";
  } else if (notes.includes("Jeopardy! Invitational Tournament")) {
    gameData.classification = "jeopardyInvitationalTournament";
  } else if (notes.includes("Jeopardy! Masters")) {
    gameData.classification = "jeopardyMasters";
  } else if (notes.includes("Kids Week")) {
    gameData.classification = "kidsWeek";
  } else if (notes.includes("Power Players Week")) {
    gameData.classification = "powerPlayersWeek";
  } else if (notes.includes("Professors Tournament")) {
    gameData.classification = "professorsTournament";
  } else if (notes.includes("Second Chance competition")) {
    gameData.classification = "secondChanceCompetition";
  } else if (notes.match(/Senior[s]? Tournament/)) {
    gameData.classification = "seniorsTournament Tournament";
  } else if (notes.includes("Teachers Tournament")) {
    gameData.classification = "teachersTournament";
  } else if (notes.includes("Teen Tournament")) {
    gameData.classification = "teenTournament";
  }

  if (gameData.classification === "regularGame") {
    let pad0 = currentSeason < 10 ? "0" : "";
    const season = `season-${pad0}${currentSeason}`;
    if (!games[season]) {
      games[season] = [];
    }
    games[season].push(gameData);
  } else {
    if (!games[gameData.classification]) {
      games[gameData.classification] = [];
    }
    games[gameData.classification].push(gameData);
  }
}

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
function classifyGames() {
  try {
    const gamesDir = path.join(__dirname, "games");
    const files = fs
      .readdirSync(gamesDir)
      .filter((file) => file.endsWith(".json"));

    // Process each JSON file in the "games" directory
    const gameLimit = 99999;
    for (const file of files) {
      if (totalGames >= gameLimit) {
        break;
      }
      totalGames++;
      let filePath = path.join(gamesDir, file);
      const gameData = JSON.parse(fs.readFileSync(filePath, "utf8"));
      classifyOneGame(gameData);
    }

    console.log(`***** Total games processed: ${totalGames}`);

    const sortedEntries = Object.entries(games).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    for (const [fieldName, fieldArray] of sortedEntries) {
      if (Array.isArray(fieldArray)) {
        console.log(`${fieldName}: ${fieldArray.length} games`);
        fs.writeFileSync(
          path.join(__dirname, "gameData", fieldName),
          JSON.stringify(fieldArray, null, 0)
        );
      } else {
        console.log(`ERROR: ${fieldName}: not an array: ${fieldArray}`);
      }
    }
    let percentLockouts = ((lockoutCount / totalGames) * 100).toFixed(1);
    console.log(`Lockouts: ${lockoutCount} (${percentLockouts}%)`);
  } catch (error) {
    console.error("Error analyzing game:", error);
    throw error;
  }
}

classifyGames();

/*
"First game of Season " <number> "."
"Last <regular-play> game of Season " <number> "."
<year> "Tournament of Champions" 1985 1986 1991 2011 2013 2014 2015 2017 2019 2021 2022 2024
<year> "Teen Tournament" 1987 1988 1989 1990 1991 1992 1993 1994 1995 1996 2004 2011 2012 2013 2014 2016 2018 2019
<year> "Senior<s> Tournament" 1987 1988 1989 1990 1991 1993 1994 1995
<year> "<National> College Championship" 1989 1991 1992 1993 1994 1995 1996 2003 2009 2010 2012 2013 2014 2016 2017 2018 2020
<year> "Celebrity Jeopardy!" 1993 1994 1996 1997 1998 1999 2003 2015
<year> "Kids Week" 2000 2003 2009 2011 2014
<year> "Back to School Week" 2000 2002
<year> "Teachers Tournament" 2011 2012 2013 2015 2016 2017 2018 2019 2020
<year> "Power Players Week" 2012 2016 2018
"Battle of the Decades"
<year> "All-Star Games" 2019
"Jeopardy!: The Greatest of All Time"
<year> "Professors Tournament" 2021
<year> "Primetime Celebrity Jeopardy!" 2022-2023
<year> "Second Chance competition" 2022 2023 2023-2024 2024-2025
<year> "High School Reunion Tournament" 2023
<year> "Jeopardy! Masters" 2023 2024
<year> "Champions Wildcard" 2023
<year> "Jeopardy! Invitational Tournament" 2024
*/
