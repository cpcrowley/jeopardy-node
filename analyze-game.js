const fs = require('fs');
const path = require('path');

function analyzeGame(filename) {
    try {
        // Read and parse the game file
        const filePath = path.join(__dirname, 'games2', filename);
        const gameData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Initialize contestant stats
        const contestants = {};
        gameData.contestants.forEach(contestant => {
            contestants[contestant] = {
                correct: 0,
                incorrect: 0,
                earnings: 0,
                correctClues: []
            };
        });

        // Function to process clues from a round
        function processRound(round, roundName) {
            // Get all clues and sort by order number
            const clues = round.clues
                .filter(clue => clue.orderNumber) // Filter out any null order numbers
                .sort((a, b) => a.orderNumber - b.orderNumber);

            clues.forEach(clue => {
                console.log(`\nClue #${clue.orderNumber} (${roundName}):`);
                console.log(`Category: ${clue.category}`);
                console.log(`Value: ${clue.value}`);
                console.log(`Q: ${clue.clue}`);
                console.log(`A: ${clue.answer}`);

                // Track correct responses
                clue.correctContestants.forEach(contestant => {
                    contestants[contestant].correct++;
                    // Parse the clue value (remove '$' and ',' and convert to number)
                    const value = parseInt(clue.value.replace(/[$,]/g, '')) || 0;
                    contestants[contestant].earnings += value;
                    contestants[contestant].correctClues.push({
                        orderNumber: clue.orderNumber,
                        category: clue.category,
                        value: value,
                        round: roundName
                    });
                });

                // Track incorrect responses
                clue.incorrectContestants.forEach(contestant => {
                    contestants[contestant].incorrect++;
                });

                // Print who got it right/wrong
                if (clue.correctContestants.length > 0) {
                    console.log('Correct:', clue.correctContestants.join(', '));
                }
                if (clue.incorrectContestants.length > 0) {
                    console.log('Incorrect:', clue.incorrectContestants.join(', '));
                }
                if (clue.wasTripleStumper) {
                    console.log('Triple Stumper!');
                }
            });
        }

        // Process both rounds
        console.log('\nProcessing Jeopardy Round...');
        processRound(gameData.rounds.jeopardy, 'Jeopardy');
        
        console.log('\nProcessing Double Jeopardy Round...');
        processRound(gameData.rounds.doubleJeopardy, 'Double Jeopardy');

        // Print Final Jeopardy
        console.log('\nFinal Jeopardy:');
        console.log(`Category: ${gameData.rounds.finalJeopardy.category}`);
        console.log(`Q: ${gameData.rounds.finalJeopardy.clue}`);
        console.log(`A: ${gameData.rounds.finalJeopardy.answer}`);
        gameData.rounds.finalJeopardy.responses.forEach(response => {
            console.log(`${response.contestant}: ${response.response} (${response.isCorrect ? 'Correct' : 'Incorrect'})`);
        });

        // Print contestant statistics
        console.log('\nContestant Statistics:');
        Object.entries(contestants).forEach(([contestant, stats]) => {
            console.log(`\n${contestant}:`);
            console.log(`Correct Responses: ${stats.correct}`);
            console.log(`Incorrect Responses: ${stats.incorrect}`);
            console.log(`Earnings before Final: $${stats.earnings}`);
            console.log('Correct answers by category:');
            
            // Group correct responses by category
            const byCategory = stats.correctClues.reduce((acc, clue) => {
                acc[clue.category] = (acc[clue.category] || 0) + 1;
                return acc;
            }, {});
            
            Object.entries(byCategory).forEach(([category, count]) => {
                console.log(`  ${category}: ${count}`);
            });
        });

    } catch (error) {
        console.error('Error analyzing game:', error);
        throw error;
    }
}

// Analyze the specified game
analyzeGame('j-2023-11-22-8697.json'); 