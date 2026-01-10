# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Jeopardy! game data scraper and analyzer that fetches game data from j-archive.com, stores it locally, classifies games by type/season, and enables statistical analysis.

## Commands

```bash
# Run the scraper (fetches games from j-archive.com)
node jeopardy-scraper.js

# Classify games into seasons and tournament types
node classify-games.js

# Analyze season statistics
node analyze-seasons.js

# Deploy to server
make upload   # or: make up

# SSH to server
make ssh
```

## Architecture

### Data Pipeline
1. **jeopardy-scraper.js** - Scrapes games from j-archive.com by game ID
   - Outputs JSON to `games/` (one file per game, named `j-{date}-{showNumber}-{gameId}.json`)
   - Outputs raw HTML to `html/`
   - Includes 4-10 second random delays between requests to avoid rate limiting
   - Modify `iRanges` variable to select which game ID range to scrape

2. **classify-games.js** - Reads all games from `games/`, classifies them by type
   - Outputs to `gameData/` with files like `season-01`, `tournamentOfChampions`, etc.
   - Detects season boundaries via "First game of Season X" in comments

3. **analyze-seasons.js** - Reads classified season data and computes statistics
   - Modify the season range in the for loop to analyze specific seasons

### Game Data Structure
Each game JSON contains:
- `gameId`, `showNumber`, `date`, `title`, `comments`
- `contestants` - array of player names
- `finalScores` - array of `{player, score}`
- `coryatScores` - scores excluding Daily Doubles and Final Jeopardy
- `rounds.jeopardy`, `rounds.doubleJeopardy` - each with `categories` and `clues`
- `rounds.finalJeopardy` - with `category`, `clue`, `answer`, `responses`

Each clue includes:
- `category`, `value`, `clue`, `answer`
- `isDailyDouble`, `orderNumber`
- `correctContestants`, `incorrectContestants`
- `runningScores` - cumulative scores after this clue

### Game Classifications
Regular games go to `season-XX`. Special games are classified as:
- `tournamentOfChampions`, `collegeChampionship`, `teenTournament`
- `celebrityJeopardy`, `jeopardyMasters`, `jeopartyGOAT`
- `teachersTournament`, `professorsTournament`, `seniorsTournament`
- And others (see `classify-games.js` for full list)

## Data Locations

- `games/` - Individual game JSON files (~9000+ games)
- `html/` - Raw HTML from j-archive.com
- `gameData/` - Classified games grouped by season/tournament type
- `data/jeopardy_clue_dataset/` - Alternative dataset from GitHub (clues by season)
- `games.csv` - Game metadata in CSV format
