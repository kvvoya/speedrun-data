# Speedrun Data

![v1.3.0](https://img.shields.io/badge/version-1.3.0-8A2BE2)

## Overview

Speedrun Data is a Node.js application that utilizes [speedrun.com](https://speedrun.com) API to generate an Excel spreadsheet with leaderboard data for a specific game.

## Features

- Gets statistics from speedrun.com leaderboard
- Generates an Excel spreadsheet with categories, run counts, and world record times (in milliseconds)
- Option to easily merge stats into a single Excel spreadsheet
- Simple installation and usage process

## Installation and Usage

1. **Install [Node.js](https://nodejs.org)**.
2. **Download the program from the releases page**.
3. **Open the command line in the program's directory** and run `npm install` or execute `setup.bat`
4. **Run the program** using `run.bat` or execute `npm start` in the program's directory
5. **Enter a valid speedrun.com name of the game**. Make sure it's named sorta like it's named on the website.
6. **If you want to analyze multiple games**, create a file named `games.txt` in the program's directory. Each line in the file should contain a valid speedrun.com game name. And type `games` when asked for a game.
7. **If you want to use `games` functionality and merge all stats into a single spreadsheet**, type `y` when prompted.
8. **Once the program has completed the analysis and has generated the spreadsheet**, you can exit by typing `exit`

## License

This project is licensed under the MIT license - see the [LICENSE.md](LICENSE.md) file for details.

###### by kvvoya

