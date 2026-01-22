/**
 * Question Store Service
 * CRUD operations for saved questions in data/questions.json
 */

const fs = require("fs");
const path = require("path");

const QUESTIONS_FILE = path.join(__dirname, "../../data/questions.json");

/**
 * Load questions from the JSON file
 * @returns {Object} Questions data object with questions array
 */
function loadQuestions() {
  try {
    if (!fs.existsSync(QUESTIONS_FILE)) {
      // Create file with empty array if it doesn't exist
      const initialData = { questions: [] };
      fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    const data = fs.readFileSync(QUESTIONS_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error loading questions:", err.message);
    return { questions: [] };
  }
}

/**
 * Save questions to the JSON file
 * @param {Object} data - Questions data object
 */
function saveQuestions(data) {
  try {
    fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error saving questions:", err.message);
    throw err;
  }
}

/**
 * Get all questions, sorted by lastUsedAt (most recent first)
 * @returns {Array} Array of question objects
 */
function getAllQuestions() {
  const data = loadQuestions();
  return data.questions.sort((a, b) => {
    const dateA = new Date(a.lastUsedAt || a.createdAt);
    const dateB = new Date(b.lastUsedAt || b.createdAt);
    return dateB - dateA;
  });
}

/**
 * Get a single question by ID
 * @param {string} id - Question ID
 * @returns {Object|null} Question object or null if not found
 */
function getQuestionById(id) {
  const data = loadQuestions();
  return data.questions.find((q) => q.id === id) || null;
}

/**
 * Create a new question
 * @param {Object} questionData - Question data {text, summary, tags}
 * @returns {Object} Created question object
 */
function createQuestion(questionData) {
  const data = loadQuestions();
  const now = new Date().toISOString();

  const question = {
    id: `q_${Date.now()}`,
    text: questionData.text,
    summary: questionData.summary || "",
    tags: questionData.tags || [],
    createdAt: now,
    lastUsedAt: now,
  };

  data.questions.push(question);
  saveQuestions(data);
  return question;
}

/**
 * Update a question's lastUsedAt timestamp
 * @param {string} id - Question ID
 * @returns {Object|null} Updated question or null if not found
 */
function updateLastUsed(id) {
  const data = loadQuestions();
  const question = data.questions.find((q) => q.id === id);

  if (question) {
    question.lastUsedAt = new Date().toISOString();
    saveQuestions(data);
  }

  return question || null;
}

/**
 * Delete a question by ID
 * @param {string} id - Question ID
 * @returns {boolean} True if deleted, false if not found
 */
function deleteQuestion(id) {
  const data = loadQuestions();
  const initialLength = data.questions.length;
  data.questions = data.questions.filter((q) => q.id !== id);

  if (data.questions.length < initialLength) {
    saveQuestions(data);
    return true;
  }
  return false;
}

/**
 * Check if a question with similar text already exists
 * @param {string} text - Question text to check
 * @returns {Object|null} Existing question or null
 */
function findSimilarQuestion(text) {
  const data = loadQuestions();
  const normalizedText = text.toLowerCase().trim();
  return (
    data.questions.find(
      (q) => q.text.toLowerCase().trim() === normalizedText
    ) || null
  );
}

module.exports = {
  getAllQuestions,
  getQuestionById,
  createQuestion,
  updateLastUsed,
  deleteQuestion,
  findSimilarQuestion,
};
