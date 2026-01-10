const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

//------------------------------------------------------------------------------
// Re-scrape game data from locally saved HTML files instead of j-archive.com
//------------------------------------------------------------------------------

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
  if (isNaN(date.getTime())) {
    console.error(`Invalid date string: "${dateString}"`);
    return "unknown-date";
  }
  return date.toISOString().split("T")[0]; // Returns YYYY-MM-DD
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
    .each((_, td) => {
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
  $(`${roundSelector} .category_name`).each((_, elem) => {
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
  $("#clue_FJ_r table tr").each((_, elem) => {
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
// Parse a single HTML file and return game data
//------------------------------------------------------------------------------
function parseHtmlFile(htmlPath, gameId) {
  try {
    const html = fs.readFileSync(htmlPath, "utf8");
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
    $(".contestants p").each((_, elem) => {
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

    return {gameData, formattedDate, showNumber};
  } catch (error) {
    console.error(`Error parsing HTML file ${htmlPath}:`, error.message);
    return null;
  }
}

//------------------------------------------------------------------------------
// Main function to re-scrape all HTML files
//------------------------------------------------------------------------------
function rescrapeFromHtml() {
  const htmlDir = path.join(__dirname, "html");
  const gamesDir = path.join(__dirname, "games");

  // Get all HTML files
  const htmlFiles = fs
    .readdirSync(htmlDir)
    .filter((file) => file.endsWith(".html"));

  console.log(`Found ${htmlFiles.length} HTML files to process`);

  let successCount = 0;
  let errorCount = 0;

  for (const htmlFile of htmlFiles) {
    // Extract gameId from filename (format: j-{date}-{showNumber}-{gameId}.html)
    const match = htmlFile.match(/-(\d+)\.html$/);
    if (!match) {
      console.error(`Could not extract gameId from filename: ${htmlFile}`);
      errorCount++;
      continue;
    }
    const gameId = parseInt(match[1]);

    const htmlPath = path.join(htmlDir, htmlFile);
    const result = parseHtmlFile(htmlPath, gameId);

    if (result) {
      const {gameData, formattedDate, showNumber} = result;
      const basename = `j-${formattedDate}-${showNumber}-${gameId}`;
      const jsonPath = path.join(gamesDir, `${basename}.json`);

      fs.writeFileSync(jsonPath, JSON.stringify(gameData, null, 0));
      successCount++;

      if (successCount % 500 === 0) {
        console.log(`Processed ${successCount} files...`);
      }
    } else {
      errorCount++;
    }
  }

  console.log(`\nRe-scraping complete!`);
  console.log(`Successfully processed: ${successCount} files`);
  console.log(`Errors: ${errorCount} files`);
}

// Run the re-scraper
rescrapeFromHtml();
