import puppeteer from 'puppeteer';
import chalk from 'chalk';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

class Category {
   constructor(title, runs, wrTime, link) {
      this.link = link;
      this.title = title;
      this.runs = runs;
      this.wrTime = wrTime;
   }
}

const validUrlRegex = /^(ftp|http|https):\/\/[^ "]+$/;
const categoriesOutput = [];

async function scrapeCategoryLinks(page, link, oldLinks = [], isLevelCategory = false) {
   if (isLevelCategory) {
      link = addLevelToPath(link);
   }

   await page.goto(link);

   let filteredCategoryLinks = [];

   const dropdownElements = await page.$$('.py-1.px-2.text-sm.border.border-solid.border-divider.rounded-lg.cursor-pointer.transition-all.duration-200');

   if (dropdownElements.length > 0) {
      for (const dropdownElement of dropdownElements) {
         await dropdownElement.click();
         // await page.waitForNavigation();

         const links = await page.$$eval('a', elements => elements.map(el => el.href));
         const filteredLinks = links.filter(link => 
            link.includes('?h=') &&
            !link.includes('&page=') && 
            !link.includes('&rules=') && 
            !link.includes('#') &&
            !oldLinks.includes(link)
         );

         filteredCategoryLinks = filteredCategoryLinks.concat(filteredLinks);
      }

      for (const filteredLink of filteredCategoryLinks) {
         const categoryLinks = await scrapeCategoryLinks(page, filteredLink, [...oldLinks, ...filteredCategoryLinks], isLevelCategory);
         filteredCategoryLinks = filteredCategoryLinks.concat(categoryLinks);
      }

      await page.goto(link);
   } else {
      const categoryLinks = await page.$$eval('a', elements => elements.map(el => el.href));

      filteredCategoryLinks = categoryLinks.filter(link => 
         link.includes('?h=') &&
         !link.includes('&page=') && 
         !link.includes('&rules=') && 
         !link.includes('#')
      );
   }

   const filteredCategoryLinksSet = new Set(filteredCategoryLinks);


   console.log(chalk.cyan(`Went into ${link}`));

   const category = await createCategoryObject(page, link);
   categoriesOutput.push(category);

   return Array.from(filteredCategoryLinksSet);
}

async function createCategoryObject(page, link) {

   await page.waitForTimeout(100);
   const pageTitle = await page.title();

   const cleanedTitle = cleanTitle(pageTitle);
   console.log('Page title:', cleanedTitle);

   const runsElement = await page.$('div.flex.px-4.py-3 .text-sm.text-on-panel');
   const runsAmount = await page.$$eval('a .inline-flex.flex-nowrap.justify-start.items-end.gap-1', elements => elements.length);
   const wrTimeElement = await page.$('#game-leaderboard tbody tr td:nth-child(3) a span');

   let runs = 0;
   let wrTime = 0;

   if (runsElement && runsAmount === 200) {
      const runsText = await page.evaluate(element => element.textContent, runsElement);
      console.log('Runs text:', runsText);
      const runsMatch = runsText.match(/(\d+)\s*runs/);
      runs = runsMatch ? parseInt(runsMatch[1], 10) : 0;
   } else if (runsAmount) {
      runs = runsAmount ? parseInt(runsAmount, 10) : 0;
   }

   if (wrTimeElement) {
      const wrTimeText = await page.evaluate(element => element.textContent, wrTimeElement);
      console.log('WR text:', wrTimeText);
      const wrTimeMatch = wrTimeText.match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?\s*(?:(\d+)\s*ms)?/);
      const wrHours = wrTimeMatch ? parseInt(wrTimeMatch[1], 10) || 0 : 0;
      const wrMinutes = wrTimeMatch ? parseInt(wrTimeMatch[2], 10) || 0 : 0;
      const wrSeconds = wrTimeMatch ? parseInt(wrTimeMatch[3], 10) || 0 : 0;
      const wrMiliseconds = wrTimeMatch ? parseInt(wrTimeMatch[4], 10) || 0 : 0;
      wrTime = wrHours * 3600000 + wrMinutes * 60000 + wrSeconds * 1000 + wrMiliseconds;
   }

   const category = new Category(cleanedTitle, runs, wrTime, link);
   console.log(chalk.magenta(`Created an object. Link: ${link}. Runs: ${runs}. WR Time: ${wrTime}`))

   return runs > 0 ? category : null;
}

const cleanTitle = (title) => {
   const gameNameIndex = title.lastIndexOf(' - ');
   if (gameNameIndex !== -1) {
      return title.substring(0, gameNameIndex).trim();
   }
   return title;
}

function filterToLevelLinks(links) {
   const filteredLevelLinks = Array.from(new Set(links.filter(link => link.includes('/level/'))));
   return filteredLevelLinks;
}

function addLevelToPath(link) {
   const url = new URL(link);
   
   if (url.pathname.includes('/level/')) {
      return link;
   }

   const segments = url.pathname.split('/');
   segments.splice(segments.length - 1, 0, 'level');

   url.pathname = segments.join('/');
   return url.href;
}

export async function scrapeWebsite(link) {

   const browserOptions = {
      headless: 'old'
   };
   const browser = await puppeteer.launch(browserOptions);

   if (!validUrlRegex.test(link)) {
      console.log(chalk.red('INVALID LINK:', link));
      await browser.close();
      return;
   }

   const page = await browser.newPage();

   await page.goto(link);

   const leaderboardElement = await page.$('#leaderboard-dropdown');
   if (!leaderboardElement) {
      console.log(chalk.red('INVALID LINK (MUST BE A GAME LEADERBOARD):', link));
      await browser.close();
      return;
   }

   const links = await page.$$eval('a', elements => elements.map(el => el.href));
   const filteredLinks = Array.from(new Set(links.filter(link => 
      link.includes('?h') &&
      !link.includes('&page=') && 
      !link.includes('&rules=') && 
      !link.includes('#')
   )));
   const levelLinks = filterToLevelLinks(links);

   const categoryLinksSet = new Set();

   console.log(chalk.greenBright('Going through full-game categories....'));

   for (const filteredLink of filteredLinks) {
      const categoryLinks = await scrapeCategoryLinks(page, filteredLink, filteredLinks);
      categoryLinks.forEach(categoryLink => categoryLinksSet.add(categoryLink));
   }

   
   console.log('------------');
   console.log(chalk.greenBright('Going through ILs....'));
   

   for (const ilLink of levelLinks) {
      await page.goto(ilLink);

      const links = await page.$$eval('a', elements => elements.map(el => el.href));
      const filteredLinks = Array.from(new Set(links.filter(link => 
         link.includes('?h') &&
         !link.includes('&page=') && 
         !link.includes('&rules=') && 
         !link.includes('#')
      )));

      for (const filteredLink of filteredLinks) {
         const categoryLinks = await scrapeCategoryLinks(page, filteredLink, filteredLinks, true);
         categoryLinks.forEach(categoryLink => categoryLinksSet.add(categoryLink));
      }
   }

   const categoryLinksArray = Array.from(categoryLinksSet);
   console.log('Category links:', categoryLinksArray);
   console.log(chalk.black.bgGreen(`Found ${categoryLinksArray.length} categories.`));

   await browser.close();

   createExcelSpreadsheet();
}

function createExcelSpreadsheet() {
   const workbook = xlsx.utils.book_new();
   const worksheet = xlsx.utils.json_to_sheet([]);

   const headers = ['Category', 'Runs', 'WR Time', 'Link'];

   xlsx.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' });

   const categoriesData = categoriesOutput
      .filter((category) => category !== null)
      .map((category) => [category.title, category.runs, category.wrTime, category.link]);

   xlsx.utils.sheet_add_aoa(worksheet, categoriesData, { origin: 'A2'});

   const columnTitleLen = categoriesData.map(row => row[0].length);
   const maxTitleLen = Math.max(...columnTitleLen);
   worksheet['!cols'] = [{width: maxTitleLen + 2}];

   xlsx.utils.book_append_sheet(workbook, worksheet, 'Categories');

   const desiredFileName = 'speedrun_data.xlsx'

   let excelFileName = desiredFileName;
   let counter = 1;

   while (fs.existsSync(excelFileName)) {
      const fileExtension = path.extname(desiredFileName);
      const fileName = path.basename(desiredFileName, fileExtension);
      const newFileName = `${fileName}_${counter}${fileExtension}`;
      excelFileName = path.join(path.dirname(desiredFileName), newFileName);
      counter++
   }

   xlsx.writeFile(workbook, excelFileName);

   console.log(chalk.green(`Data saved in ${excelFileName}`));
}