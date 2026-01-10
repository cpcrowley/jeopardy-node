# Overall goal

- The purpose of this app is to answer statistical questions about past jeopardy! games.

- Example: you might want to know what percentage of the time does the player with the highest score at the end of the double jeopardy round win the game. WE might refine that to ask the same question but only for the years 2015-2020.

# Data Sources

- The site https://j-archive.com/ records almost all jeopardy games.
Over the years I have downloaded most of those games.
The directory games/ contains the results of this downloading.
I would like to check to know exactly which games I have and which ones I am missing.

- some people have scraped that site, collected the data, and put it online.

  a. one site is https://github.com/jwolle1/jeopardy_clue_dataset.
  I downloaded this data, it is in data/jeopardy_clue_dataset.
  The problem with this data is that it is clues by season.
  You could go through the database and reconstruct the games based on the data.

  b. There are some APIs on the web that will serve jeopardy game data.

- I need to have all the game data local since I will be going through all of it a lot.
So I would like to reorganize and update the data to include all available games.

- Once we have all the games I need to decide if I should keep the data as text or put it into a database.
I would only want to do that if it was quite a bit faster.

# Tasks to accomplish

- Once I have the data I want to do two things.

1. Use node to serve a website that allows me to look at the data in various ways.

2. Be able to answer specific questions like how often would a change in final jeopardy bets affect who wins the game.

# Initial tasks for Claude

1. Examine the files in this directory and tell me what the program does and what state is it in (will it run?). 

2. Tell me what Jeopardy games I have and which ones I need. Formulate a plan to fetch any games I am missing.