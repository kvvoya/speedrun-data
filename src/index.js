import readline from 'readline';
import chalk from 'chalk';
import clear from 'clear';
import { scrapeWebsite } from './scrapping.js';

function displayWelcomeMessage() {
   clear();
   console.log(chalk.yellow.bold('Speedrun Data v0.1.0'));
   console.log(chalk.green('by kvvoya'));
}

const r1 = readline.createInterface({
   input: process.stdin,
   output: process.stdout
});


displayWelcomeMessage();

while (true) {
   const link = await askQuestion('Enter a speedrun.com link to scrape: ');
   if (link.toLowerCase() === 'exit') {
      break;
   }

   await scrapeWebsite(link);
}

r1.close();

// r1.question('Enter a speedrun.com link to scrape: ', async (link) => {
//    await scrapeWebsite(link);
//    r1.close();
// })

function askQuestion(q) {
   return new Promise((resolve) => {
      r1.question(q, (a) => {
         resolve(a);
      });
   });
}