# Speedrun Data

![v1.2.1](https://img.shields.io/badge/version-1.2.1-8A2BE2)

## Overview

Speedrun Data is a Node.js application that utilizes web scraping to extract information from [speedrun.com](https://speedrun.com) and generate an Excel spreadsheet with leaderboard data for a specific game.

## Features

- Web scrapes speedrun.com to gather leaderboard information
- Generates an Excel spreadsheet with categories, run counts, and world record times (in milliseconds)
- Option to easily merge stats into a single Excel spreadsheet
- Simple installation and usage process

## Installation and Usage

1. **Install [Node.js](https://nodejs.org)**.
2. **Download the program from the releases page**.
3. **Open the command line in the program's directory** and run `npm install` or execute `setup.bat`
4. **Run the program** using `run.bat` or execute `npm start` in the program's directory
5. **Enter a valid speedrun.com leaderboard link**. Use the following format:
`https://speedrun.com/game_name`, where _game_name_ represents the name of the game in the URL
6. **If you want to scrape multiple links**, create a file named `links.txt` in the program's directory. Each line in the file should contain a valid speedrun.com leaderboard link. And type `links` when asked for a link.
7. **If you want to use `links` functionality and merge all stats into a single spreadsheet**, type `y` when prompted.
8. **Once the program has completed scraping and generating the spreadsheet**, you can exit by typing `exit`

> **Note:** The code may not be optimized and was primarily developed for personal use. If you encounter any inconveniences while using the program, I apologize in advance.

## License

This project is licensed under the MIT license - see the [LICENSE.md](LICENSE.md) file for details.

###### by kvvoya

