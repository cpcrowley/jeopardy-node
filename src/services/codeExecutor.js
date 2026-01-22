/**
 * Code Executor Service
 * Executes generated analysis code in a sandboxed VM environment
 */

const vm = require("vm");
const {
  parseScore,
  getWinner,
  rankByEndOfRound,
  countCorrectAnswers,
  getFJResponse,
  isValidGame,
  getJeopardyEndScores,
  getDoubleJeopardyEndScores,
} = require("../utils/gameHelpers");

// Timeout for code execution (30 seconds)
const EXECUTION_TIMEOUT_MS = 30000;

/**
 * Helper functions available to the sandboxed code
 */
const helpers = {
  parseScore,
  getWinner,
  rankByEndOfRound,
  countCorrectAnswers,
  getFJResponse,
  isValidGame,
  getJeopardyEndScores,
  getDoubleJeopardyEndScores,
};

/**
 * Execute analysis code in a sandboxed VM
 * @param {string} code - JavaScript code to execute
 * @param {Array} games - Array of game objects to analyze
 * @returns {Object} Analysis result
 * @throws {Error} If code execution fails or times out
 */
function executeAnalysis(code, games) {
  // Create a minimal sandbox context with only what's needed
  // No access to require, process, fs, or any Node.js APIs
  const sandbox = {
    games: games,
    helpers: helpers,
    // Basic JavaScript built-ins that are safe
    Math: Math,
    Date: Date,
    JSON: JSON,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean,
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    isFinite: isFinite,
    // Console for debugging (logs are captured but not exposed)
    console: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  };

  // Create a VM context from the sandbox
  const context = vm.createContext(sandbox);

  try {
    // Execute the code with a timeout
    const script = new vm.Script(code, {
      filename: "analysis.js",
      timeout: EXECUTION_TIMEOUT_MS,
    });

    const result = script.runInContext(context, {
      timeout: EXECUTION_TIMEOUT_MS,
    });

    // Validate the result structure
    if (!result || typeof result !== "object") {
      throw new Error("Analysis code must return an object");
    }

    if (!result.description || typeof result.description !== "string") {
      throw new Error("Result must include a 'description' string");
    }

    if (typeof result.totalGames !== "number") {
      throw new Error("Result must include 'totalGames' as a number");
    }

    if (!Array.isArray(result.results)) {
      throw new Error("Result must include 'results' as an array");
    }

    return result;
  } catch (err) {
    // Handle specific error types
    if (err.code === "ERR_SCRIPT_EXECUTION_TIMEOUT") {
      throw new Error("Analysis code timed out (exceeded 30 seconds)");
    }

    // Re-throw with more context
    throw new Error(`Code execution failed: ${err.message}`);
  }
}

/**
 * Validate that code doesn't contain dangerous patterns
 * @param {string} code - Code to validate
 * @returns {boolean} True if code appears safe
 * @throws {Error} If dangerous patterns detected
 */
function validateCode(code) {
  // Patterns that indicate potentially dangerous code
  const dangerousPatterns = [
    /require\s*\(/i, // Node.js require
    /import\s+/i, // ES6 imports
    /process\./i, // Node.js process object
    /child_process/i, // Spawning processes
    /fs\./i, // File system access
    /eval\s*\(/i, // Dynamic code execution
    /Function\s*\(/i, // Dynamic function creation
    /\.constructor\s*\(/i, // Constructor access
    /__proto__/i, // Prototype pollution
    /prototype\s*\[/i, // Prototype manipulation
    /globalThis/i, // Global access
    /Reflect\./i, // Reflection API
    /Proxy\s*\(/i, // Proxy creation
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      throw new Error(
        `Potentially dangerous code pattern detected: ${pattern.toString()}`
      );
    }
  }

  return true;
}

/**
 * Execute analysis code safely
 * Validates and runs code in sandbox with timeout
 * @param {string} code - JavaScript code to execute
 * @param {Array} games - Array of game objects
 * @returns {Object} Analysis result
 */
function safeExecute(code, games) {
  // First validate the code
  validateCode(code);

  // Then execute in sandbox
  return executeAnalysis(code, games);
}

module.exports = {
  executeAnalysis,
  validateCode,
  safeExecute,
};
