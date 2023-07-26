import readline from 'readline';
import chalk from 'chalk';
import clear from 'clear';
import fs from 'fs';
import { scrapeWebsite, createExcelSpreadsheet } from './scrapping.js';

const kvvoyaAscii = `

oooo                                                                
\`888                                                                
 888  oooo  oooo    ooo oooo    ooo  .ooooo.  oooo    ooo  .oooo.   
 888 .8P'    \`88.  .8'   \`88.  .8'  d88' \`88b  \`88.  .8'  \`P  )88b  
 888888.      \`88..8'     \`88..8'   888   888   \`88..8'    .oP"888  
 888 \`88b.     \`888'       \`888'    888   888    \`888'    d8(  888  
o888o o888o     \`8'         \`8'     \`Y8bod8P'     .8'     \`Y888""8o 
                                              .o..P'                
                                              \`Y8P'                 

`;

function displayWelcomeMessage() {
   clear();
   console.log(chalk.magentaBright(kvvoyaAscii));
   console.log(chalk.yellow.bold('Speedrun Data v1.2.1'));
}

const r1 = readline.createInterface({
   input: process.stdin,
   output: process.stdout
});

async function readLinksFromFile(filename) {
   try {
      const data = await fs.promises.readFile(filename, 'utf8');
      return data.split('\n').map(link => link.trim()).filter(link => link.length > 0);
   } catch (err) {
      console.error(chalk.red('Error reading the links.txt file ->', err.message));
      return [];
   }
}


async function main() {

   try {
      displayWelcomeMessage();

      while (true) {
         const link = await askQuestion('Enter a speedrun.com link to scrape (or enter special commands like "links" or "exit"): ');
         if (link.toLowerCase() === 'exit') {
            break;
         }

         if (link.toLowerCase() === 'links') {
            const linksFromFile = await readLinksFromFile('links.txt');
            if (linksFromFile.length === 0) {
               console.log(chalk.red('No links found in a file!'));
               continue;
            }

            const mergeStats = (await askQuestion('Do you want to MERGE all stats into a single Excel spreadsheet? (y/n): ')).toLowerCase() === 'y';

            if (mergeStats) {
               await mergeStatsLogic(linksFromFile);
            } else {
               for (const link of linksFromFile) {
                  await scrapeWebsite(link);
               }
            }
         } else {
            await scrapeWebsite(link);
         }
      }
      r1.close();
   } catch (error) {
      console.error(chalk.red('An error has occured ->', error.message));
      r1.close();
   }

}

async function mergeStatsLogic(links) {
   const allCategoriesOutput = [];

   for (const link of links) {
      const categoriesOutput = await scrapeWebsite(link);
      allCategoriesOutput.push(...categoriesOutput);
   }

   createExcelSpreadsheet(allCategoriesOutput, true);
}

function askQuestion(q) {
   return new Promise((resolve) => {
      r1.question(q, (a) => {
         resolve(a);
      });
   });
}

main();