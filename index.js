import puppeteer from 'puppeteer';
import readline from 'readline';
import chalk from 'chalk';
import clear from 'clear';

const validUrlRegex = /^(ftp|http|https):\/\/[^ "]+$/;

async function scrapeCategoryLinks(page, link) {

   await page.goto(link);

   const categoryLinks = await page.$$eval('a', elements => elements.map(el => el.href));
   const filteredCategoryLinksSet = new Set(categoryLinks.filter(link => link.includes('?h=')));

   const filteredCategoryLinks = Array.from(filteredCategoryLinksSet);

   console.log(`Went into ${link} and found this:`, filteredCategoryLinks);

   return filteredCategoryLinks;
}

function filterToLevelLinks(links) {
   const filteredLevelLinks = Array.from(new Set(links.filter(link => link.includes('/level/'))));
   console.log('Level links:', filteredLevelLinks);
   return filteredLevelLinks;
}

async function scrapeWebsite(link) {

   if (!validUrlRegex.test(link)) {
      console.log(chalk.red('INVALID LINK:', link));
      return;
   }

   const page = await browser.newPage();

   await page.goto(link);

   const title = await page.title();
   console.log('Title:', title);

   const leaderboardElement = await page.$('#leaderboard-dropdown');
   if (!leaderboardElement) {
      console.log(chalk.red('INVALID LINK (MUST BE A GAME LEADERBOARD):', link));
      return;
   }

   const links = await page.$$eval('a', elements => elements.map(el => el.href));
   const filteredLinks = Array.from(new Set(links.filter(link => link.includes('?h'))));
   const levelLinks = filterToLevelLinks(links);

   const categoryLinksSet = new Set();

   console.log("Filtered links:", filteredLinks);

   for (const filteredLink of filteredLinks) {
      const categoryLinks = await scrapeCategoryLinks(page, filteredLink);
      categoryLinks.forEach(categoryLink => categoryLinksSet.add(categoryLink));
   }

   const categoryLinksArray = Array.from(categoryLinksSet);
   console.log('Category links:', categoryLinksArray);
}

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

const browserOptions = {
   headless: 'old'
};
const browser = await puppeteer.launch(browserOptions);
r1.question('Enter a speedrun.com link to scrape: ', async (link) => {
   await scrapeWebsite(link);
   r1.close();
})