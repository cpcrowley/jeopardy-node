/**
 * API routes for Jeopardy statistics
 */

const express = require("express");
const router = express.Router();

const { loadSeasonRange, getAvailableSeasons } = require("../services/dataLoader");
const { getAvailableQueries, runAnalyzer } = require("../services/analyzers");
const {
  getAllQuestions,
  getQuestionById,
  createQuestion,
  updateLastUsed,
  findSimilarQuestion,
} = require("../services/questionStore");
const { generateAnalysisCode } = require("../services/claudeService");
const { safeExecute } = require("../services/codeExecutor");

/**
 * GET /api/seasons
 * Returns list of available seasons
 */
router.get("/seasons", (req, res) => {
  try {
    const seasons = getAvailableSeasons();
    res.json({
      success: true,
      seasons,
      min: seasons.length > 0 ? seasons[0] : null,
      max: seasons.length > 0 ? seasons[seasons.length - 1] : null,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/queries
 * Returns list of available query types
 */
router.get("/queries", (req, res) => {
  try {
    const queries = getAvailableQueries();
    res.json({ success: true, queries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/analyze
 * Run an analysis query
 * Body: { query: string, startSeason: number, endSeason: number }
 */
router.post("/analyze", (req, res) => {
  try {
    const { query, startSeason, endSeason } = req.body;

    // Validate input
    if (!query) {
      return res.status(400).json({ success: false, error: "Missing query parameter" });
    }

    const start = parseInt(startSeason) || 1;
    const end = parseInt(endSeason) || 99;

    // Load games for the requested season range
    console.log(`Loading games for seasons ${start}-${end}...`);
    const games = loadSeasonRange(start, end);
    console.log(`Loaded ${games.length} games`);

    if (games.length === 0) {
      return res.json({
        success: true,
        warning: "No games found for the specified season range",
        result: null,
      });
    }

    // Run the analyzer
    const result = runAnalyzer(query, games);

    if (!result) {
      return res.status(400).json({
        success: false,
        error: `Unknown query type: ${query}`,
      });
    }

    res.json({
      success: true,
      seasonRange: { start, end },
      gamesLoaded: games.length,
      result,
    });
  } catch (err) {
    console.error("Analysis error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/questions
 * Returns list of saved questions sorted by lastUsedAt
 */
router.get("/questions", (req, res) => {
  try {
    const questions = getAllQuestions();
    res.json({ success: true, questions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/questions
 * Save a new question
 * Body: { text: string, summary: string, tags?: string[] }
 */
router.post("/questions", (req, res) => {
  try {
    const { text, summary, tags } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: "Question text is required" });
    }

    // Check for existing similar question
    const existing = findSimilarQuestion(text);
    if (existing) {
      // Update lastUsedAt and return existing
      updateLastUsed(existing.id);
      return res.json({ success: true, question: existing, existed: true });
    }

    const question = createQuestion({ text, summary, tags });
    res.json({ success: true, question, existed: false });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/ask
 * Generate analysis code using Claude and execute it
 * Body: { questionText: string, summary?: string, startSeason: number, endSeason: number, saveQuestion?: boolean }
 */
router.post("/ask", async (req, res) => {
  try {
    const { questionText, summary, startSeason, endSeason, saveQuestion } = req.body;

    if (!questionText) {
      return res.status(400).json({ success: false, error: "Question text is required" });
    }

    const start = parseInt(startSeason) || 1;
    const end = parseInt(endSeason) || 99;

    console.log(`[/api/ask] Question: "${questionText}"`);
    console.log(`[/api/ask] Season range: ${start}-${end}`);

    // Step 1: Generate analysis code using Claude
    console.log("[/api/ask] Generating analysis code...");
    let code;
    let usage;
    try {
      const generated = await generateAnalysisCode(questionText);
      code = generated.code;
      usage = generated.usage;
      console.log("[/api/ask] Generated code:\n", code);
      console.log("[/api/ask] Token usage:", usage);
    } catch (err) {
      console.error("[/api/ask] Code generation failed:", err.message);
      return res.status(500).json({
        success: false,
        error: `Failed to generate analysis code: ${err.message}`,
      });
    }

    // Step 2: Load games for the requested season range
    console.log(`[/api/ask] Loading games for seasons ${start}-${end}...`);
    const games = loadSeasonRange(start, end);
    console.log(`[/api/ask] Loaded ${games.length} games`);

    if (games.length === 0) {
      return res.json({
        success: true,
        warning: "No games found for the specified season range",
        result: null,
        code,
      });
    }

    // Step 3: Execute the generated code safely
    console.log("[/api/ask] Executing analysis code...");
    let result;
    try {
      result = safeExecute(code, games);
      console.log("[/api/ask] Analysis complete, totalGames:", result.totalGames);
    } catch (err) {
      console.error("[/api/ask] Code execution failed:", err.message);
      return res.status(500).json({
        success: false,
        error: `Analysis execution failed: ${err.message}`,
        code,
      });
    }

    // Step 4: Optionally save the question
    let savedQuestion = null;
    if (saveQuestion) {
      const existing = findSimilarQuestion(questionText);
      if (existing) {
        updateLastUsed(existing.id);
        savedQuestion = existing;
      } else {
        savedQuestion = createQuestion({
          text: questionText,
          summary: summary || "",
          tags: [],
        });
      }
    }

    res.json({
      success: true,
      seasonRange: { start, end },
      gamesLoaded: games.length,
      result,
      code,
      usage,
      savedQuestion,
    });
  } catch (err) {
    console.error("[/api/ask] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
