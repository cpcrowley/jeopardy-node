/**
 * Jeopardy Stats Frontend Application
 */

// DOM elements - Predefined tab
const querySelect = document.getElementById("queryType");
const startSeasonInput = document.getElementById("startSeason");
const endSeasonInput = document.getElementById("endSeason");
const analyzeBtn = document.getElementById("analyzeBtn");
const queryDescription = document.getElementById("queryDescription");

// DOM elements - Ask tab
const savedQuestionsSelect = document.getElementById("savedQuestions");
const questionTextArea = document.getElementById("questionText");
const questionSummaryInput = document.getElementById("questionSummary");
const askStartSeasonInput = document.getElementById("askStartSeason");
const askEndSeasonInput = document.getElementById("askEndSeason");
const saveQuestionCheckbox = document.getElementById("saveQuestion");
const askBtn = document.getElementById("askBtn");
const askDescription = document.getElementById("askDescription");

// DOM elements - Common
const loadingDiv = document.getElementById("loading");
const resultsDiv = document.getElementById("results");
const resultsTitle = document.getElementById("resultsTitle");
const resultsMeta = document.getElementById("resultsMeta");
const resultsTable = document.getElementById("resultsTable");
const apiCostDiv = document.getElementById("apiCost");
const errorDiv = document.getElementById("error");
const helpBtn = document.getElementById("helpBtn");
const helpModal = document.getElementById("helpModal");
const closeHelpBtn = document.getElementById("closeHelp");
const helpQueries = document.getElementById("helpQueries");

// Tab elements
const tabBtns = document.querySelectorAll(".tab-btn");
const predefinedTab = document.getElementById("predefined-tab");
const askTab = document.getElementById("ask-tab");

// Store data
let queries = [];
let savedQuestions = [];

/**
 * Initialize the app
 */
async function init() {
  try {
    // Load available queries
    const queriesRes = await fetch("/api/queries");
    const queriesData = await queriesRes.json();
    if (queriesData.success) {
      queries = queriesData.queries;
      populateQuerySelect(queries);
      populateHelpQueries(queries);
    }

    // Load available seasons
    const seasonsRes = await fetch("/api/seasons");
    const seasonsData = await seasonsRes.json();
    if (seasonsData.success && seasonsData.seasons.length > 0) {
      // Predefined tab season inputs
      startSeasonInput.min = seasonsData.min;
      startSeasonInput.max = seasonsData.max;
      startSeasonInput.value = seasonsData.min;
      endSeasonInput.min = seasonsData.min;
      endSeasonInput.max = seasonsData.max;
      endSeasonInput.value = seasonsData.max;

      // Ask tab season inputs
      askStartSeasonInput.min = seasonsData.min;
      askStartSeasonInput.max = seasonsData.max;
      askStartSeasonInput.value = seasonsData.min;
      askEndSeasonInput.min = seasonsData.min;
      askEndSeasonInput.max = seasonsData.max;
      askEndSeasonInput.value = seasonsData.max;
    }

    // Load saved questions for the Ask tab
    await loadSavedQuestions();
  } catch (err) {
    showError("Failed to initialize: " + err.message);
  }
}

/**
 * Populate the query dropdown
 */
function populateQuerySelect(queries) {
  querySelect.innerHTML = queries
    .map((q) => `<option value="${q.id}">${q.name}</option>`)
    .join("");
  updateDescription();
}

/**
 * Populate the help modal with query descriptions
 */
function populateHelpQueries(queries) {
  helpQueries.innerHTML = queries
    .map((q) => `<p><strong>${q.name}:</strong> ${q.description}</p>`)
    .join("");
}

/**
 * Update the description text based on selected query
 */
function updateDescription() {
  const selectedId = querySelect.value;
  const query = queries.find((q) => q.id === selectedId);
  queryDescription.textContent = query ? query.description : "";
}

/**
 * Run the analysis
 */
async function runAnalysis() {
  const query = querySelect.value;
  const startSeason = parseInt(startSeasonInput.value);
  const endSeason = parseInt(endSeasonInput.value);

  if (!query) {
    showError("Please select a question to analyze");
    return;
  }

  if (startSeason > endSeason) {
    showError("Start season must be less than or equal to end season");
    return;
  }

  // Show loading, hide results/error
  loadingDiv.classList.remove("hidden");
  resultsDiv.classList.add("hidden");
  errorDiv.classList.add("hidden");

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, startSeason, endSeason }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Analysis failed");
    }

    if (data.warning) {
      showError(data.warning);
      return;
    }

    displayResults(data);
  } catch (err) {
    showError(err.message);
  } finally {
    loadingDiv.classList.add("hidden");
  }
}

/**
 * Display analysis results
 */
function displayResults(data) {
  const { result, seasonRange, gamesLoaded, usage } = data;

  resultsTitle.textContent = result.description;
  resultsMeta.textContent = `Seasons ${seasonRange.start}-${seasonRange.end} | ${result.totalGames.toLocaleString()} games analyzed`;

  // Build table based on result structure
  const thead = resultsTable.querySelector("thead");
  const tbody = resultsTable.querySelector("tbody");

  // Determine columns from first result
  if (result.results && result.results.length > 0) {
    const firstRow = result.results[0];
    const columns = Object.keys(firstRow);

    // Header row
    thead.innerHTML = `<tr>${columns
      .map((col) => `<th>${formatColumnName(col)}</th>`)
      .join("")}</tr>`;

    // Data rows
    tbody.innerHTML = result.results
      .map(
        (row) =>
          `<tr>${columns
            .map((col) => `<td class="${col.includes('percentage') || col.includes('Pct') ? 'percentage' : ''}">${formatValue(col, row[col])}</td>`)
            .join("")}</tr>`
      )
      .join("");
  }

  // Show API cost if available (only for /api/ask queries)
  if (usage) {
    const costFormatted = usage.totalCost < 0.01
      ? `<$0.01`
      : `$${usage.totalCost.toFixed(4)}`;
    apiCostDiv.innerHTML = `<strong>API Cost:</strong> ${costFormatted} (${usage.inputTokens.toLocaleString()} input + ${usage.outputTokens.toLocaleString()} output tokens)`;
    apiCostDiv.classList.remove("hidden");
  } else {
    apiCostDiv.classList.add("hidden");
  }

  resultsDiv.classList.remove("hidden");
}

/**
 * Format column names for display
 */
function formatColumnName(col) {
  // Convert camelCase to Title Case
  return col
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/Pct$/, "%")
    .replace(/Avg/, "Avg.");
}

/**
 * Format cell values for display
 */
function formatValue(col, value) {
  if (col.includes("percentage") || col.includes("Pct")) {
    return value + "%";
  }
  if (typeof value === "number") {
    return value.toLocaleString();
  }
  return value;
}

/**
 * Show error message
 */
function showError(message) {
  errorDiv.textContent = message;
  errorDiv.classList.remove("hidden");
  resultsDiv.classList.add("hidden");
  loadingDiv.classList.add("hidden");
}

/**
 * Show/hide help modal
 */
function toggleHelp() {
  helpModal.classList.toggle("hidden");
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
  // Update tab buttons
  tabBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  // Update tab content
  predefinedTab.classList.toggle("hidden", tabName !== "predefined");
  predefinedTab.classList.toggle("active", tabName === "predefined");
  askTab.classList.toggle("hidden", tabName !== "ask");
  askTab.classList.toggle("active", tabName === "ask");

  // Clear results and errors when switching tabs
  resultsDiv.classList.add("hidden");
  errorDiv.classList.add("hidden");
}

/**
 * Load saved questions from the server
 */
async function loadSavedQuestions() {
  try {
    const res = await fetch("/api/questions");
    const data = await res.json();
    if (data.success) {
      savedQuestions = data.questions;
      populateSavedQuestions(savedQuestions);
    }
  } catch (err) {
    console.error("Failed to load saved questions:", err.message);
  }
}

/**
 * Populate the saved questions dropdown
 */
function populateSavedQuestions(questions) {
  savedQuestionsSelect.innerHTML =
    '<option value="">-- New Question --</option>' +
    questions
      .map((q) => {
        const displayText = q.summary || q.text.substring(0, 40) + "...";
        return `<option value="${q.id}">${displayText}</option>`;
      })
      .join("");
}

/**
 * Handle selection of a saved question
 */
function selectSavedQuestion(id) {
  if (!id) {
    // Clear form for new question
    questionTextArea.value = "";
    questionSummaryInput.value = "";
    return;
  }

  const question = savedQuestions.find((q) => q.id === id);
  if (question) {
    questionTextArea.value = question.text;
    questionSummaryInput.value = question.summary || "";
  }
}

/**
 * Ask a custom question using Claude
 */
async function askQuestion() {
  const questionText = questionTextArea.value.trim();
  const summary = questionSummaryInput.value.trim();
  const startSeason = parseInt(askStartSeasonInput.value);
  const endSeason = parseInt(askEndSeasonInput.value);
  const saveQuestion = saveQuestionCheckbox.checked;

  if (!questionText) {
    showError("Please enter a question");
    return;
  }

  if (startSeason > endSeason) {
    showError("Start season must be less than or equal to end season");
    return;
  }

  // Show loading, hide results/error
  loadingDiv.classList.remove("hidden");
  resultsDiv.classList.add("hidden");
  errorDiv.classList.add("hidden");

  // Update loading message
  loadingDiv.querySelector("span").textContent =
    "Generating analysis code and running...";

  try {
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionText,
        summary,
        startSeason,
        endSeason,
        saveQuestion,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      // If there's generated code, show it for debugging
      if (data.code) {
        console.log("Generated code that failed:\n", data.code);
        throw new Error(data.error + "\n\nGenerated code (see console for full code):\n" + data.code.substring(0, 200) + "...");
      }
      throw new Error(data.error || "Analysis failed");
    }

    if (data.warning) {
      showError(data.warning);
      return;
    }

    // Display results
    displayResults(data);

    // Reload saved questions if we saved one
    if (data.savedQuestion) {
      await loadSavedQuestions();
      // Select the saved question in the dropdown
      savedQuestionsSelect.value = data.savedQuestion.id;
    }
  } catch (err) {
    showError(err.message);
  } finally {
    loadingDiv.classList.add("hidden");
    loadingDiv.querySelector("span").textContent = "Analyzing games...";
  }
}

// Event listeners - Predefined tab
querySelect.addEventListener("change", updateDescription);
analyzeBtn.addEventListener("click", runAnalysis);

// Event listeners - Ask tab
savedQuestionsSelect.addEventListener("change", (e) => {
  selectSavedQuestion(e.target.value);
});
askBtn.addEventListener("click", askQuestion);

// Event listeners - Tabs
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// Event listeners - Help modal
helpBtn.addEventListener("click", toggleHelp);
closeHelpBtn.addEventListener("click", toggleHelp);
helpModal.addEventListener("click", (e) => {
  if (e.target === helpModal) toggleHelp();
});

// Allow Enter key to submit (but not in textarea)
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !helpModal.classList.contains("hidden")) {
    toggleHelp();
  } else if (
    e.key === "Enter" &&
    document.activeElement !== querySelect &&
    document.activeElement !== questionTextArea &&
    document.activeElement !== savedQuestionsSelect
  ) {
    // Determine which tab is active and run appropriate action
    if (!predefinedTab.classList.contains("hidden")) {
      runAnalysis();
    } else if (!askTab.classList.contains("hidden")) {
      askQuestion();
    }
  }
  if (e.key === "Escape" && !helpModal.classList.contains("hidden")) {
    toggleHelp();
  }
});

// Initialize on load
init();
