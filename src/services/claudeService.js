/**
 * Claude Service
 * Handles Claude API integration for generating analysis code
 */

const Anthropic = require("@anthropic-ai/sdk");

// Initialize Anthropic client - uses ANTHROPIC_API_KEY env variable
const anthropic = new Anthropic();

/**
 * System prompt that explains the game data structure and how to write analysis code
 */
const SYSTEM_PROMPT = `You are an expert at analyzing Jeopardy! game data. You write JavaScript code that analyzes an array of game objects.

## Game Data Structure

Each game object has this structure:
\`\`\`javascript
{
  gameId: number,           // Unique game ID
  showNumber: string,       // Show number (e.g., "9386")
  title: string,            // Full title with date
  date: string,             // Date in YYYY-MM-DD format
  comments: string,         // Game comments (may include "First game of Season X")
  contestants: string[],    // Array of 3 contestant names

  rounds: {
    jeopardy: {
      categories: string[],   // 6 category names
      clues: [{
        category: string,
        value: number,        // Dollar value (200-1000 for J, 400-2000 for DJ)
        clue: string,         // The clue text
        answer: string,       // The correct response
        isDailyDouble: boolean,
        orderNumber: number,  // Order clue was selected (1-30)
        correctContestants: string[],    // Names who answered correctly
        incorrectContestants: string[],  // Names who answered incorrectly
        wasTripleStumper: boolean,       // No one got it right
        runningScores: [{player: string, score: number}]
      }],
      firstBreakScores: [{player: string, score: number}],
      endOfRoundScores: [{player: string, score: number}]
    },

    doubleJeopardy: {
      // Same structure as jeopardy round
      categories: string[],
      clues: [{...}],
      endOfRoundScores: [{player: string, score: number}]
    },

    finalJeopardy: {
      category: string,
      clue: string,
      answer: string,
      responses: [{
        contestant: string,
        response: string,
        isCorrect: boolean,
        isIncorrect: boolean,
        value: number,        // Amount wagered
        finalScore: number    // Score after Final Jeopardy
      }]
    }
  },

  finalScores: [{player: string, score: string}],  // e.g., "$40,000"
  coryatScores: [{player: string, score: number}], // Scores without DD/FJ
  classification: string    // "regularGame" or tournament type
}
\`\`\`

## Helper Functions Available

The following helper functions are available in the \`helpers\` object:

- \`helpers.parseScore(score)\` - Converts "$20,200" or 20200 to number 20200
- \`helpers.getWinner(game)\` - Returns winner's name (highest final score)
- \`helpers.rankByEndOfRound(scores)\` - Returns {first, second, third, scores} sorted by score
- \`helpers.getJeopardyEndScores(game)\` - Returns end of round scores for J round
- \`helpers.getDoubleJeopardyEndScores(game)\` - Returns end of round scores for DJ round
- \`helpers.getFJResponse(game, playerName)\` - Returns player's FJ response object
- \`helpers.isValidGame(game)\` - Checks if game has all required data
- \`helpers.countCorrectAnswers(clues, playerName)\` - Count correct answers in clue array

## Your Task

Write a JavaScript function that analyzes the games array and returns results in this format:

\`\`\`javascript
{
  description: "Brief description of analysis",
  totalGames: number,      // Games analyzed
  results: [               // Array of result rows for table display
    { column1: value1, column2: value2, ... },
    ...
  ]
}
\`\`\`

## Important Rules

1. Your code receives \`games\` (array) and \`helpers\` (object) as globals
2. The last expression should be the result object wrapped in parentheses: \`({description, totalGames, results})\`
3. CRITICAL: The final object MUST be wrapped in parentheses like \`({...})\` - a bare \`{...}\` is interpreted as a code block, not an object
4. Use descriptive column names that will display well in a table
5. Include percentage columns where appropriate (as numbers like "75.5", not "75.5%")
6. Handle edge cases (missing data, empty arrays, etc.)
7. Keep the code simple and efficient
8. Only output the JavaScript code, no explanation needed
9. DO NOT use require() or import - only use the provided globals

## Example Output Pattern

\`\`\`javascript
// ... analysis code ...

({
  description: "My analysis results",
  totalGames: games.length,
  results: myResultsArray
})
\`\`\``;

// Claude Sonnet 4 pricing (per million tokens)
const PRICING = {
  input: 3.0, // $3 per million input tokens
  output: 15.0, // $15 per million output tokens
};

/**
 * Calculate cost from token usage
 * @param {Object} usage - {input_tokens, output_tokens}
 * @returns {Object} Cost breakdown
 */
function calculateCost(usage) {
  const inputCost = (usage.input_tokens / 1_000_000) * PRICING.input;
  const outputCost = (usage.output_tokens / 1_000_000) * PRICING.output;
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    inputCost: inputCost,
    outputCost: outputCost,
    totalCost: inputCost + outputCost,
  };
}

/**
 * Generate analysis code using Claude API
 * @param {string} questionText - The user's question about the data
 * @returns {Promise<{code: string, usage: Object}>} Generated JavaScript code and token usage
 */
async function generateAnalysisCode(questionText) {
  const userPrompt = `Write JavaScript code to answer this question about Jeopardy games:

"${questionText}"

Remember:
- \`games\` array and \`helpers\` object are available as globals
- The last expression should be the result object
- Return format: { description, totalGames, results: [{...}, ...] }
- Only output the code, no explanation or markdown code blocks`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    // Extract the text content from the response
    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    let code = content.text.trim();

    // Remove markdown code blocks if present
    if (code.startsWith("```javascript")) {
      code = code.slice(13);
    } else if (code.startsWith("```js")) {
      code = code.slice(5);
    } else if (code.startsWith("```")) {
      code = code.slice(3);
    }
    if (code.endsWith("```")) {
      code = code.slice(0, -3);
    }

    code = code.trim();

    // Fix common issue: bare object at end needs parentheses
    // Look for pattern like "}\n\n{" or ending with "{ description:" without opening paren
    // If code ends with an object literal that's not wrapped in parens, wrap it
    const lastBraceIndex = code.lastIndexOf("{");
    if (lastBraceIndex > 0) {
      // Check if this brace is the start of the result object (has description:)
      const afterBrace = code.substring(lastBraceIndex);
      if (
        afterBrace.includes("description:") &&
        afterBrace.includes("totalGames:") &&
        afterBrace.includes("results:")
      ) {
        // Check if it's not already wrapped in parens
        const beforeBrace = code.substring(0, lastBraceIndex).trimEnd();
        if (!beforeBrace.endsWith("(")) {
          // Wrap the final object in parentheses
          code =
            code.substring(0, lastBraceIndex) +
            "(" +
            afterBrace.trimEnd();
          if (!code.endsWith(")")) {
            code = code + ")";
          }
        }
      }
    }

    // Calculate cost from usage
    const usage = calculateCost(response.usage);

    return { code, usage };
  } catch (err) {
    console.error("Claude API error:", err.message);
    throw new Error(`Failed to generate analysis code: ${err.message}`);
  }
}

module.exports = {
  generateAnalysisCode,
};
