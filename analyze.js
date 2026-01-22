#!/usr/bin/env node
/**
 * Jeopardy Data Analysis Script
 *
 * Standalone script for analyzing Jeopardy game data.
 * Can be run directly without a server or API keys.
 *
 * Usage:
 *   node analyze.js                     # Show available analyses
 *   node analyze.js dd-by-season        # Run specific analysis
 *   node analyze.js dd-by-season 35 42  # With season range
 */

const fs = require("fs");
const path = require("path");

// Directory containing game data
const GAME_DATA_DIR = path.join(__dirname, "gameData");

/**
 * Load games from season files
 * @param {number} startSeason - Start season (inclusive)
 * @param {number} endSeason - End season (inclusive)
 * @returns {Array} Array of game objects
 */
function loadGames(startSeason = 1, endSeason = 99) {
  const files = fs.readdirSync(GAME_DATA_DIR).filter(f => f.startsWith("season-"));
  let allGames = [];

  for (const file of files) {
    const seasonNum = parseInt(file.replace("season-", ""));
    if (seasonNum < startSeason || seasonNum > endSeason) continue;

    const filePath = path.join(GAME_DATA_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

    if (Array.isArray(data)) {
      allGames = allGames.concat(data);
    }
  }

  return allGames;
}

/**
 * Available analyses
 */
const analyses = {
  "dd-by-season": {
    name: "Daily Double Bets by Season",
    description: "Average DD bet as % of score in Double Jeopardy round, by season",
    run: (games, startSeason, endSeason) => {
      const seasonData = {};

      // Group games by season based on file loading
      const files = fs.readdirSync(GAME_DATA_DIR).filter(f => f.startsWith("season-"));

      for (const file of files) {
        const seasonNum = parseInt(file.replace("season-", ""));
        if (seasonNum < startSeason || seasonNum > endSeason) continue;

        const filePath = path.join(GAME_DATA_DIR, file);
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        if (!Array.isArray(data)) continue;

        const ddBets = [];

        data.forEach(game => {
          if (!game.rounds?.doubleJeopardy?.clues) return;

          game.rounds.doubleJeopardy.clues.forEach(clue => {
            if (!clue.isDailyDouble) return;

            let contestant = clue.correctContestants?.[0] || clue.incorrectContestants?.[0];
            if (!contestant || !clue.runningScores) return;

            const runningScore = clue.runningScores.find(s => s.player === contestant);
            if (!runningScore) return;

            const wasCorrect = clue.correctContestants?.includes(contestant);
            const scoreBeforeDD = wasCorrect
              ? runningScore.score - clue.value
              : runningScore.score + clue.value;

            if (scoreBeforeDD > 0) {
              ddBets.push((clue.value / scoreBeforeDD) * 100);
            }
          });
        });

        if (ddBets.length > 0) {
          const avg = ddBets.reduce((sum, p) => sum + p, 0) / ddBets.length;
          seasonData[seasonNum] = { avg, count: ddBets.length, games: data.length };
        }
      }

      // Output results
      const seasons = Object.keys(seasonData).map(Number).sort((a, b) => a - b);

      console.log("\n=== Double Jeopardy Daily Double Bets by Season ===\n");
      console.log("Season | Avg Bet % | DD Count | Games");
      console.log("-------|----------|----------|------");

      let totalDDs = 0;
      let weightedSum = 0;

      seasons.forEach(s => {
        const d = seasonData[s];
        totalDDs += d.count;
        weightedSum += d.avg * d.count;
        console.log(
          String(s).padStart(6) + " | " +
          d.avg.toFixed(1).padStart(7) + "% | " +
          String(d.count).padStart(8) + " | " +
          d.games
        );
      });

      console.log("-------|----------|----------|------");
      console.log(`\nOverall: ${(weightedSum / totalDDs).toFixed(1)}% average across ${totalDDs.toLocaleString()} Daily Doubles`);
    }
  },

  "dd-overall": {
    name: "Daily Double Betting Overview",
    description: "Overall DD betting statistics across all rounds",
    run: (games) => {
      const ddData = [];

      games.forEach(game => {
        if (!game.rounds) return;

        ["jeopardy", "doubleJeopardy"].forEach(roundName => {
          const round = game.rounds[roundName];
          if (!round?.clues) return;

          round.clues.forEach(clue => {
            if (!clue.isDailyDouble) return;

            let contestant = clue.correctContestants?.[0] || clue.incorrectContestants?.[0];
            if (!contestant || !clue.runningScores) return;

            const runningScore = clue.runningScores.find(s => s.player === contestant);
            if (!runningScore) return;

            const wasCorrect = clue.correctContestants?.includes(contestant);
            const scoreBeforeDD = wasCorrect
              ? runningScore.score - clue.value
              : runningScore.score + clue.value;

            if (scoreBeforeDD > 0) {
              ddData.push({
                round: roundName === "jeopardy" ? "J" : "DJ",
                pct: (clue.value / scoreBeforeDD) * 100
              });
            }
          });
        });
      });

      const jRound = ddData.filter(d => d.round === "J");
      const djRound = ddData.filter(d => d.round === "DJ");

      const avgAll = ddData.reduce((sum, d) => sum + d.pct, 0) / ddData.length;
      const avgJ = jRound.reduce((sum, d) => sum + d.pct, 0) / jRound.length;
      const avgDJ = djRound.reduce((sum, d) => sum + d.pct, 0) / djRound.length;

      console.log("\n=== Daily Double Betting Analysis ===\n");
      console.log(`Total games: ${games.length.toLocaleString()}`);
      console.log(`Total DDs analyzed: ${ddData.length.toLocaleString()}\n`);

      console.log("Average bet as % of current score:");
      console.log(`  Overall:              ${avgAll.toFixed(1)}%`);
      console.log(`  Jeopardy round:       ${avgJ.toFixed(1)}% (${jRound.length.toLocaleString()} DDs)`);
      console.log(`  Double Jeopardy:      ${avgDJ.toFixed(1)}% (${djRound.length.toLocaleString()} DDs)`);

      // Distribution
      const ranges = [
        { min: 0, max: 25, label: "0-25%" },
        { min: 25, max: 50, label: "25-50%" },
        { min: 50, max: 75, label: "50-75%" },
        { min: 75, max: 100, label: "75-100%" },
        { min: 100, max: Infinity, label: "100%+ (True DD)" }
      ];

      console.log("\nBet Distribution:");
      ranges.forEach(r => {
        const count = ddData.filter(d => d.pct >= r.min && d.pct < r.max).length;
        const pct = (count / ddData.length * 100).toFixed(1);
        console.log(`  ${r.label.padEnd(15)} ${count.toLocaleString().padStart(6)} (${pct}%)`);
      });
    }
  },

  "position-win-rate": {
    name: "Win Rate by Position",
    description: "How often does 1st/2nd/3rd place after each round win the game?",
    run: (games) => {
      const stats = {
        afterJ: { first: 0, second: 0, third: 0, total: 0 },
        afterDJ: { first: 0, second: 0, third: 0, total: 0 }
      };

      games.forEach(game => {
        if (!game.rounds?.finalJeopardy?.responses) return;

        // Get winner (highest final score)
        const fjResponses = game.rounds.finalJeopardy.responses;
        const winner = fjResponses.reduce((best, r) =>
          r.finalScore > (best?.finalScore || -Infinity) ? r : best, null
        )?.contestant;

        if (!winner) return;

        // After Jeopardy round
        const jScores = game.rounds.jeopardy?.endOfRoundScores;
        if (jScores && jScores.length >= 2) {
          const sorted = [...jScores].sort((a, b) => b.score - a.score);
          stats.afterJ.total++;
          if (winner === sorted[0]?.player) stats.afterJ.first++;
          else if (winner === sorted[1]?.player) stats.afterJ.second++;
          else if (winner === sorted[2]?.player) stats.afterJ.third++;
        }

        // After Double Jeopardy round
        const djScores = game.rounds.doubleJeopardy?.endOfRoundScores;
        if (djScores && djScores.length >= 2) {
          const sorted = [...djScores].sort((a, b) => b.score - a.score);
          stats.afterDJ.total++;
          if (winner === sorted[0]?.player) stats.afterDJ.first++;
          else if (winner === sorted[1]?.player) stats.afterDJ.second++;
          else if (winner === sorted[2]?.player) stats.afterDJ.third++;
        }
      });

      const pct = (n, total) => total > 0 ? (n / total * 100).toFixed(1) : "0.0";

      console.log("\n=== Win Rate by Position ===\n");
      console.log(`Games analyzed: ${games.length.toLocaleString()}\n`);

      console.log("After Jeopardy Round:");
      console.log(`  1st place wins: ${pct(stats.afterJ.first, stats.afterJ.total)}% (${stats.afterJ.first.toLocaleString()})`);
      console.log(`  2nd place wins: ${pct(stats.afterJ.second, stats.afterJ.total)}% (${stats.afterJ.second.toLocaleString()})`);
      console.log(`  3rd place wins: ${pct(stats.afterJ.third, stats.afterJ.total)}% (${stats.afterJ.third.toLocaleString()})`);

      console.log("\nAfter Double Jeopardy Round:");
      console.log(`  1st place wins: ${pct(stats.afterDJ.first, stats.afterDJ.total)}% (${stats.afterDJ.first.toLocaleString()})`);
      console.log(`  2nd place wins: ${pct(stats.afterDJ.second, stats.afterDJ.total)}% (${stats.afterDJ.second.toLocaleString()})`);
      console.log(`  3rd place wins: ${pct(stats.afterDJ.third, stats.afterDJ.total)}% (${stats.afterDJ.third.toLocaleString()})`);
    }
  },

  "fj-betting": {
    name: "Final Jeopardy Betting Patterns",
    description: "How contestants bet in Final Jeopardy based on position",
    run: (games) => {
      const bets = { first: [], second: [], third: [] };

      games.forEach(game => {
        const djScores = game.rounds?.doubleJeopardy?.endOfRoundScores;
        const fjResponses = game.rounds?.finalJeopardy?.responses;

        if (!djScores || !fjResponses || djScores.length < 2) return;

        const sorted = [...djScores].sort((a, b) => b.score - a.score);

        fjResponses.forEach(resp => {
          const djScore = djScores.find(s => s.player === resp.contestant)?.score;
          if (!djScore || djScore <= 0) return;

          const betPct = (resp.value / djScore) * 100;
          const position = sorted.findIndex(s => s.player === resp.contestant);

          if (position === 0) bets.first.push(betPct);
          else if (position === 1) bets.second.push(betPct);
          else if (position === 2) bets.third.push(betPct);
        });
      });

      const avg = arr => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const median = arr => {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      };

      console.log("\n=== Final Jeopardy Betting Patterns ===\n");
      console.log(`Games analyzed: ${games.length.toLocaleString()}\n`);

      console.log("Bet as % of pre-FJ score:\n");
      console.log("Position | Avg Bet % | Median % | Count");
      console.log("---------|----------|----------|------");
      console.log(`1st      | ${avg(bets.first).toFixed(1).padStart(7)}% | ${median(bets.first).toFixed(1).padStart(7)}% | ${bets.first.length.toLocaleString()}`);
      console.log(`2nd      | ${avg(bets.second).toFixed(1).padStart(7)}% | ${median(bets.second).toFixed(1).padStart(7)}% | ${bets.second.length.toLocaleString()}`);
      console.log(`3rd      | ${avg(bets.third).toFixed(1).padStart(7)}% | ${median(bets.third).toFixed(1).padStart(7)}% | ${bets.third.length.toLocaleString()}`);
    }
  },

  "triple-stumpers": {
    name: "Triple Stumper Analysis",
    description: "Questions no one answered correctly, by category and value",
    run: (games) => {
      const byValue = {};
      const byCategory = {};
      let total = 0;
      let stumpers = 0;

      games.forEach(game => {
        ["jeopardy", "doubleJeopardy"].forEach(roundName => {
          const round = game.rounds?.[roundName];
          if (!round?.clues) return;

          round.clues.forEach(clue => {
            total++;
            if (clue.wasTripleStumper) {
              stumpers++;

              // By value
              const val = clue.value || 0;
              byValue[val] = (byValue[val] || 0) + 1;

              // By category (simplified)
              const cat = clue.category || "Unknown";
              byCategory[cat] = (byCategory[cat] || 0) + 1;
            }
          });
        });
      });

      console.log("\n=== Triple Stumper Analysis ===\n");
      console.log(`Total clues: ${total.toLocaleString()}`);
      console.log(`Triple stumpers: ${stumpers.toLocaleString()} (${(stumpers / total * 100).toFixed(1)}%)\n`);

      console.log("By Dollar Value:");
      const values = Object.keys(byValue).map(Number).sort((a, b) => a - b);
      values.forEach(v => {
        console.log(`  $${v.toLocaleString().padStart(5)}: ${byValue[v].toLocaleString().padStart(5)}`);
      });

      console.log("\nTop 10 Categories with Most Triple Stumpers:");
      const topCats = Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      topCats.forEach(([cat, count], i) => {
        console.log(`  ${(i + 1).toString().padStart(2)}. ${cat}: ${count}`);
      });
    }
  },

  "correct-answers": {
    name: "Correct Answers by Position",
    description: "Average correct answers for winner vs 2nd vs 3rd place",
    run: (games) => {
      const stats = { winner: [], second: [], third: [] };

      games.forEach(game => {
        const fjResponses = game.rounds?.finalJeopardy?.responses;
        if (!fjResponses) return;

        // Get final positions
        const sorted = [...fjResponses].sort((a, b) => b.finalScore - a.finalScore);
        const positions = {
          [sorted[0]?.contestant]: "winner",
          [sorted[1]?.contestant]: "second",
          [sorted[2]?.contestant]: "third"
        };

        // Count correct answers per contestant
        const correctCounts = {};
        ["jeopardy", "doubleJeopardy"].forEach(roundName => {
          const round = game.rounds?.[roundName];
          if (!round?.clues) return;

          round.clues.forEach(clue => {
            (clue.correctContestants || []).forEach(c => {
              correctCounts[c] = (correctCounts[c] || 0) + 1;
            });
          });
        });

        // Add to stats
        Object.entries(positions).forEach(([contestant, pos]) => {
          if (contestant && correctCounts[contestant] !== undefined) {
            stats[pos].push(correctCounts[contestant]);
          }
        });
      });

      const avg = arr => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

      console.log("\n=== Correct Answers by Final Position ===\n");
      console.log(`Games analyzed: ${games.length.toLocaleString()}\n`);

      console.log("Average correct answers (J + DJ rounds):");
      console.log(`  Winner:    ${avg(stats.winner).toFixed(1)} correct`);
      console.log(`  2nd place: ${avg(stats.second).toFixed(1)} correct`);
      console.log(`  3rd place: ${avg(stats.third).toFixed(1)} correct`);
    }
  }
};

// Main execution
function main() {
  const args = process.argv.slice(2);
  const analysisName = args[0];
  const startSeason = parseInt(args[1]) || 1;
  const endSeason = parseInt(args[2]) || 99;

  // Show help if no analysis specified
  if (!analysisName) {
    console.log("\n=== Jeopardy Data Analysis ===\n");
    console.log("Usage: node analyze.js <analysis> [startSeason] [endSeason]\n");
    console.log("Available analyses:\n");

    Object.entries(analyses).forEach(([key, val]) => {
      console.log(`  ${key.padEnd(20)} - ${val.description}`);
    });

    console.log("\nExamples:");
    console.log("  node analyze.js dd-by-season");
    console.log("  node analyze.js dd-by-season 35 42");
    console.log("  node analyze.js position-win-rate 1 20");
    return;
  }

  // Run the specified analysis
  const analysis = analyses[analysisName];
  if (!analysis) {
    console.error(`Unknown analysis: ${analysisName}`);
    console.error("Run 'node analyze.js' to see available analyses.");
    process.exit(1);
  }

  console.log(`\nLoading games from seasons ${startSeason}-${endSeason}...`);
  const games = loadGames(startSeason, endSeason);
  console.log(`Loaded ${games.length.toLocaleString()} games.`);

  analysis.run(games, startSeason, endSeason);
}

main();
