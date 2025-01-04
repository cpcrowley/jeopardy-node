const fs = require('fs');
const path = require('path');

function processGames() {
    try {
        // Read the games2 directory
        const gamesDir = path.join(__dirname, 'games2');
        const files = fs.readdirSync(gamesDir).filter(file => file.endsWith('.json'));
        
        console.log(`Found ${files.length} game files`);
        
        // Process each file
        files.forEach(file => {
            console.log(`\nProcessing ${file}...`);
            
            // Read and parse the game file
            const filePath = path.join(gamesDir, file);
            const gameData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            // 1. Reorder clues arrays by orderNumber
            if (gameData.rounds.jeopardy && gameData.rounds.jeopardy.clues) {
                gameData.rounds.jeopardy.clues.sort((a, b) => 
                    (a.orderNumber || Infinity) - (b.orderNumber || Infinity)
                );
            }
            
            if (gameData.rounds.doubleJeopardy && gameData.rounds.doubleJeopardy.clues) {
                gameData.rounds.doubleJeopardy.clues.sort((a, b) => 
                    (a.orderNumber || Infinity) - (b.orderNumber || Infinity)
                );
            }

            // 2. Update contestants array from finalScores
            if (gameData.finalScores && gameData.finalScores.length >= 3) {
                gameData.contestants = gameData.finalScores
                    .slice(0, 3)
                    .map(score => score.player);
            }

            // Create new filename with "-2" before ".json"
            const newFileName = file.replace('.json', '-2.json');
            const newFilePath = path.join(gamesDir, newFileName);

            // Write the modified data to the new file
            fs.writeFileSync(
                newFilePath, 
                JSON.stringify(gameData, null, 2)
            );
            
            console.log(`Wrote ${newFileName}`);
        });

        console.log('\nProcessing complete!');

    } catch (error) {
        console.error('Error processing games:', error);
        throw error;
    }
}

// Run the processor
processGames(); 