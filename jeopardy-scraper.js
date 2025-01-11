const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
function convertValueToInteger(valueString) {
  const value = parseInt(valueString.replace(/[$,D: ]/g, "")) || 0;
  return value;
}

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
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

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
function modifyGame(gameData) {
  try {
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
  } catch (error) {
    console.error("Error modifying game:", error);
    throw error;
  }
}

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
function parseGameDate(dateString) {
  // Input format: "Monday, September 9, 2024"
  const date = new Date(dateString);
  return date.toISOString().split("T")[0]; // Returns YYYY-MM-DD
}

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
async function scrapeJeopardyGame(gameId) {
  try {
    // Add a user agent to avoid being blocked
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    };

    const url = `https://j-archive.com/showgame.php?game_id=${gameId}`;
    console.log(`Fetching game data from ${url}`);

    const response = await axios.get(url, {headers});
    const html = response.data;
    const $ = cheerio.load(html);

    // Parse the date from the title
    const fullTitle = $("#game_title h1").text();
    const parts = fullTitle.split(" - ");
    const showNumber = parts[0].split("#")[1];
    const dateString = parts[1];
    const formattedDate = parseGameDate(dateString);

    // Extract game data
    const gameData = {
      gameId: gameId,
      showNumber: showNumber,
      title: fullTitle,
      date: formattedDate,
      comments: $("#game_comments").text(),
      contestants: [],
      rounds: {
        jeopardy: parseRound($, "#jeopardy_round"),
        doubleJeopardy: parseRound($, "#double_jeopardy_round"),
        finalJeopardy: parseFinalJeopardy($),
      },
    };

    // Extract contestants
    $(".contestants p").each((i, elem) => {
      gameData.contestants.push($(elem).text());
    });

    // Extract final scores
    gameData.finalScores = [];
    $("#final_jeopardy_round .score_player_nickname").each((i, elem) => {
      const player = $(elem).text();
      const score = $(elem).parent().next().find("td").eq(i).text();
      gameData.finalScores.push({player, score});
    });

    // Extract Coryat scores
    gameData.coryatScores = parseScoreTable($, "Coryat scores:");

    // Fix up some things
    modifyGame(gameData);

    // Save to JSON file using the formatted date
    const basename = `j-${formattedDate}-${showNumber}-${gameId}`;
    fs.writeFileSync(
      `games/${basename}.json`,
      JSON.stringify(gameData, null, 0)
    );
    fs.writeFileSync(`html/${basename}.html`, html);
    console.log(`Game html saved to ${`<html,games>/${basename}.<html,json>`}`);

    return gameData;
  } catch (error) {
    console.error(`Error scraping Jeopardy game ${gameId}:`, error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
    }
    throw error;
  }
}

//------------------------------------------------------------------------------
// Helper function to add delay between requests
//------------------------------------------------------------------------------
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

//------------------------------------------------------------------------------
// Helper function to parse responses
//------------------------------------------------------------------------------
function parseResponses($, elem) {
  const responseText =
    $(elem).find('.clue_text[style="display:none;"]').html() || "";

  // Get correct and incorrect contestants
  const correct = [];
  const incorrect = [];

  $(elem)
    .find("table td")
    .each((i, td) => {
      const contestant = $(td).text();
      if ($(td).hasClass("right")) {
        correct.push(contestant);
      } else if ($(td).hasClass("wrong")) {
        incorrect.push(contestant);
      }
    });

  return {
    correct,
    incorrect,
    wasTripleStumper: responseText.includes("Triple Stumper"),
  };
}

//------------------------------------------------------------------------------
// Helper function to parse a round's categories and clues
//------------------------------------------------------------------------------
function parseRound($, roundSelector) {
  const categories = [];
  const clues = [];

  // Get categories
  $(`${roundSelector} .category_name`).each((i, elem) => {
    categories.push($(elem).text());
  });

  // Get clues
  $(`${roundSelector} .clue`).each((i, elem) => {
    const clueValue = $(elem)
      .find(".clue_value, .clue_value_daily_double")
      .text();
    const clueText = $(elem).find(".clue_text").first().text();
    const answer = $(elem).find(".correct_response").text();
    const isDailyDouble = $(elem).find(".clue_value_daily_double").length > 0;

    // Get clue order number
    const orderNumberLink = $(elem).find(".clue_order_number a");
    const orderNumber = orderNumberLink.length
      ? parseInt(orderNumberLink.text())
      : null;

    // Get contestant responses
    const responses = parseResponses($, elem);

    clues.push({
      category: categories[i % 6],
      value: clueValue,
      clue: clueText,
      answer: answer,
      isDailyDouble: isDailyDouble,
      orderNumber: orderNumber,
      correctContestants: responses.correct,
      incorrectContestants: responses.incorrect,
      wasTripleStumper: responses.wasTripleStumper,
    });
  });

  const result = {
    categories: categories,
    clues: clues,
  };

  // Add first commercial break scores for Jeopardy round
  if (roundSelector === "#jeopardy_round") {
    result.firstBreakScores = parseScoreTable(
      $,
      "Scores at the first commercial break"
    );
    result.endOfRoundScores = parseScoreTable(
      $,
      "Scores at the end of the Jeopardy"
    );
  }

  // Add end of round scores for Double Jeopardy round
  if (roundSelector === "#double_jeopardy_round") {
    result.endOfRoundScores = parseScoreTable(
      $,
      "Scores at the end of the Double"
    );
  }

  return result;
}

//------------------------------------------------------------------------------
// Helper function to parse Final Jeopardy
//------------------------------------------------------------------------------
function parseFinalJeopardy($) {
  const category = $("#final_jeopardy_round .category_name").text();
  const clue = $("#clue_FJ").text();
  const answer = $("#clue_FJ_r em.correct_response").text();

  // Parse contestant responses
  const responses = [];
  $("#clue_FJ_r table tr").each((i, elem) => {
    const isCorrect = $(elem).find(".right").length > 0;
    const isIncorrect = $(elem).find(".wrong").length > 0;
    const contestant = $(elem).find("td").first().text();
    const response = $(elem).find("td").last().text();

    if (contestant) {
      responses.push({
        contestant,
        response,
        isCorrect,
        isIncorrect,
      });
    }
  });

  return {
    category,
    clue,
    answer,
    responses,
  };
}

//------------------------------------------------------------------------------
// Helper function to parse score tables
//------------------------------------------------------------------------------
function parseScoreTable($, tableTitle) {
  const players = [];
  // Find the text node containing our title, then navigate to the score table
  const titleText = $(`h3:contains("${tableTitle}")`);
  if (titleText.length > 0) {
    const table = titleText.next("table");
    const names = table.find(".score_player_nickname");
    const scores = table.find(".score_positive, .score_negative");

    for (let i = 0; i < 3; i++) {
      players.push({
        player: names.eq(i).text(),
        score: parseInt(scores.eq(i).text().replace(/[$,]/g, "")),
      });
    }
  }
  return players;
}

//------------------------------------------------------------------------------
// Run the scraper for multiple games
//------------------------------------------------------------------------------
async function scrapeGames(gameIds) {
  const results = [];

  for (const gameId of gameIds) {
    try {
      const gameData = await scrapeJeopardyGame(gameId);
      results.push(gameData);

      // Add a random delay between 4-10 seconds between requests
      if (gameId !== gameIds[gameIds.length - 1]) {
        const randomDelay =
          Math.floor(Math.random() * (10000 - 4000 + 1)) + 4000;
        console.log(
          `Waiting ${randomDelay / 1000} seconds before next request...`
        );
        await delay(randomDelay);
      }
    } catch (error) {
      console.error(`Failed to scrape game ${gameId}`);
      // Continue with next game even if one fails
    }
  }

  return results;
}

//------------------------------------------------------------------------------
// Array of game IDs to scrape 1 to 9086
//------------------------------------------------------------------------------
const ranges = [
  [9001, 9086], // 0xxx
  [8501, 9000], // 1xxx
  [8001, 8500], // 2xxx
  [7501, 8000], // 3xxx
  [7001, 7500], // 4xxx
  [6501, 7000], // 5xxx
  [6001, 6500], // 6xxx
  [5501, 6000], // 7xxx
  [5001, 5500], // 8xxx
  [4501, 5000], // 9xxx
  [4001, 4500], // 10xxx
  [3501, 4000], // 11xxx
  [3001, 3500], // 12xxx
  [2501, 3000], // 13xxx
  [2001, 2500], // 14xxx
  [1501, 2000], // 15xxx
  [1001, 1500], // 16xxx
  [501, 1000], // 17xxx
  [1, 500], // 18xxx
];

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
let iRanges = 0;

const firstGameId = ranges[iRanges][0];
const lastGameId = ranges[iRanges][1];
let gameIds = Array.from(
  {length: lastGameId - firstGameId + 1},
  (_, i) => firstGameId + i
);
console.log(`Scraping games ${firstGameId} to ${lastGameId}`);
// gameIds = [];

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
scrapeGames(gameIds)
  .then((results) => {
    console.log("\nScraping complete!");
    console.log(`Successfully scraped ${results.length} games`);
  })
  .catch((error) => {
    console.error("An error occurred during scraping:", error);
    process.exit(1);
  });
