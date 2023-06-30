const puppeteer = require('puppeteer');
const readline = require('readline');

async function scrapeCategoryLinks(page, link) {
   await page.goto(link);

   const categoryLinks = await page.$$eval('a', elements => elements.map(el => el.href));
   const filteredCategoryLinksSet = new Set(categoryLinks.filter(link => link.includes('?h=')));

   const filteredCategoryLinks = Array.from(filteredCategoryLinksSet);

   console.log(`Went into ${link} and found this:`, filteredCategoryLinks);

   return filteredCategoryLinks;
}

async function scrapeWebsite(link) {

   const browser = await puppeteer.launch();
   const page = await browser.newPage();

   await page.goto(link);

   const title = await page.title();
   console.log('Title:', title);

   const links = await page.$$eval('a', elements => elements.map(el => el.href));
   const filteredLinks = Array.from(new Set(links.filter(link => link.includes('?h'))));

   const categoryLinksSet = new Set();

   console.log("Filtered links:", filteredLinks);

   for (const filteredLink of filteredLinks) {
      const categoryLinks = await scrapeCategoryLinks(page, filteredLink);
      categoryLinks.forEach(categoryLink => categoryLinksSet.add(categoryLink));
   }

   const categoryLinksArray = Array.from(categoryLinksSet);
   console.log('Category links:', categoryLinksArray);

   await browser.close();
}

const r1 = readline.createInterface({
   input: process.stdin,
   output: process.stdout
});

r1.question('Enter a speedrun.com link to scrape: ', async (link) => {
   await scrapeWebsite(link);
   r1.close();
})