import readline from 'readline';
import chalk from 'chalk';
import clear from 'clear';
import { scrapeWebsite } from './scrapping.js';

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
   console.log(chalk.yellow.bold('Speedrun Data v1.2.0'));
}

const r1 = readline.createInterface({
   input: process.stdin,
   output: process.stdout
});


async function main() {
   displayWelcomeMessage();

   while (true) {
      const link = await askQuestion('Enter a speedrun.com link to scrape: ');
      if (link.toLowerCase() === 'exit') {
         break;
      }

      await scrapeWebsite(link);
   }

   r1.close();
}

function askQuestion(q) {
   return new Promise((resolve) => {
      r1.question(q, (a) => {
         resolve(a);
      });
   });
}

main();