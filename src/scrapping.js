import puppeteer from 'puppeteer';
import chalk from 'chalk';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

class Category {
   constructor(link, runs, wrTime) {
      this.link = link;
      this.runs = runs;
      this.wrTime = wrTime;
   }
}

const validUrlRegex = /^(ftp|http|https):\/\/[^ "]+$/;
const categoriesOutput = [];
const processedLinks = [];

async function scrapeCategoryLinks(page, link, oldLinks = []) {
   if (processedLinks.includes(link)) return;

   await page.goto(link);

   let filteredCategoryLinks = [];

   const rawDropdownElements = await page.$$('.x-input-dropdown-button');
   const dropdownElements = rawDropdownElements.slice(2, -1);

   if (dropdownElements && dropdownElements.length > 0) {
      for (const dropdownElement of dropdownElements) {
         await dropdownElement.click();
         // await page.waitForNavigation();

         const links = await page.$$eval('a', elements => elements.map(el => el.href));
         const filteredLinks = links.filter(link =>
            link.includes('?h=') &&
            !link.includes('&page=') &&
            !link.includes('&rules=') &&
            !link.includes('#') &&
            !link.includes('/runs/new') &&
            !oldLinks.includes(link)
         );

         filteredCategoryLinks = filteredCategoryLinks.concat(filteredLinks);
      }


      // await page.goto(link);
   } else {
      const categoryLinks = await page.$$eval('a', elements => elements.map(el => el.href));

      filteredCategoryLinks = categoryLinks.filter(link =>
         link.includes('?h=') &&
         !link.includes('&page=') &&
         !link.includes('&rules=') &&
         !link.includes('#') &&
         !link.includes('/runs/new') &&
         !oldLinks.includes(link)
      );
   }

   for (const filteredLink of filteredCategoryLinks) {
      const categoryLinks = await scrapeCategoryLinks(page, filteredLink, [...oldLinks, ...filteredCategoryLinks]);
      filteredCategoryLinks = filteredCategoryLinks.concat(categoryLinks);
   }
   const filteredCategoryLinksSet = new Set(filteredCategoryLinks);
   await page.goto(link);

   console.log(chalk.cyan(`Went into ${link}`));

   const category = await createCategoryObject(page, link);
   categoriesOutput.push(category);
   processedLinks.push(link);

   return Array.from(filteredCategoryLinksSet);
}

async function createCategoryObject(page, link) {

   await page.waitForTimeout(100);
   const cleanedTitle = ''; // temporary

   const runsElement = await page.$('div.flex.flex-row.flex-wrap.px-5.py-2 .text-sm');
   const runsAmount = await page.$$eval('tr.cursor-pointer', elements => elements.length);
   const wrTimeElement = await page.$('tbody tr td:nth-child(4) a span span span span');

   let runs = 0;
   let wrTime = 0;

   if (runsElement && runsAmount === 100) {
      const runsText = await page.evaluate(element => element.textContent, runsElement);
      const runsMatch = runsText.match(/(\d+)\s*Runs/);
      runs = runsMatch ? parseInt(runsMatch[1], 10) : 0;
   } else if (runsAmount) {
      runs = runsAmount ? parseInt(runsAmount, 10) : 0;
   }

   if (wrTimeElement) {
      const wrTimeText = await page.evaluate(element => element.textContent, wrTimeElement);
      console.log('WR time:', wrTimeText);
      const wrTimeMatch = wrTimeText.match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?\s*(?:(\d+)\s*ms)?/);
      const wrHours = wrTimeMatch ? parseInt(wrTimeMatch[1], 10) || 0 : 0;
      const wrMinutes = wrTimeMatch ? parseInt(wrTimeMatch[2], 10) || 0 : 0;
      const wrSeconds = wrTimeMatch ? parseInt(wrTimeMatch[3], 10) || 0 : 0;
      const wrMiliseconds = wrTimeMatch ? parseInt(wrTimeMatch[4], 10) || 0 : 0;
      wrTime = wrHours * 3600000 + wrMinutes * 60000 + wrSeconds * 1000 + wrMiliseconds;
   }

   const category = new Category(link, runs, wrTime);
   console.log(chalk.magenta(`Created an object. Link: ${link}. Runs: ${runs}. WR Time: ${wrTime}`))

   return category;
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

   categoriesOutput.length = 0; processedLinks.length = 0; // clears arrays
   const page = await browser.newPage();

   await page.goto(link);

   const leaderboardElement = await page.$$eval('button div.text-sm.font-medium', (divs) => {
      return divs.map((div) => div.textContent);
   });
   if (leaderboardElement[0] !== 'Leaderboards') {
      console.log(chalk.red('INVALID LINK (MUST BE A GAME LEADERBOARD):', link));
      await browser.close();
      return;
   }

   const links = await page.$$eval('a', elements => elements.map(el => el.href));
   const filteredLinks = Array.from(new Set(links.filter(link =>
      link.includes('?h') &&
      !link.includes('&page=') &&
      !link.includes('&rules=') &&
      !link.includes('#') &&
      !link.includes('/runs/new')
   )));
   // const levelLinks = filterToLevelLinks(links);
   const dropdownElements = await page.$$('.x-input-dropdown-button[id]');
   await dropdownElements[1].click();
   const refetchedLinks = await page.$$eval('a', elements => elements.map(el => el.href));

   const levelLinks = refetchedLinks.filter(link => !links.includes(link));

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
         !link.includes('#') &&
         !link.includes('/runs/new')
      )));

      for (const filteredLink of filteredLinks) {
         const categoryLinks = await scrapeCategoryLinks(page, filteredLink, filteredLinks);
         categoryLinks.forEach(categoryLink => categoryLinksSet.add(categoryLink));
      }
   }

   // const categoryLinksArray = Array.from(categoryLinksSet);
   console.log(chalk.black.bgGreen(`Found ${categoriesOutput.length} categories.`));

   await browser.close();

   createExcelSpreadsheet();
}

function createExcelSpreadsheet() {
   const workbook = xlsx.utils.book_new();
   const worksheet = xlsx.utils.json_to_sheet([]);

   const headers = ['Category', 'Runs', 'WR Time'];

   xlsx.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' });

   const categoriesData = categoriesOutput
      .filter((category) => category !== null)
      .map((category) => [category.link, category.runs, category.wrTime]);

   xlsx.utils.sheet_add_aoa(worksheet, categoriesData, { origin: 'A2' });

   const columnTitleLen = categoriesData.map(row => row[0].length);
   const maxTitleLen = Math.max(...columnTitleLen);
   worksheet['!cols'] = [{ width: maxTitleLen + 2 }];

   xlsx.utils.book_append_sheet(workbook, worksheet, 'Categories');

   const outputFolder = 'output';
   if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder);
   }

   const desiredFileName = 'speedrun_data.xlsx';
   const outputPath = path.join(outputFolder, desiredFileName);

   let excelFileName = outputPath;
   let counter = 1;

   while (fs.existsSync(excelFileName)) {
      const fileExtension = path.extname(desiredFileName);
      const fileName = path.basename(desiredFileName, fileExtension);
      const newFileName = `${fileName}_${counter}${fileExtension}`;
      excelFileName = path.join(outputFolder, newFileName);
      counter++
   }

   xlsx.writeFile(workbook, excelFileName);

   console.log(chalk.green(`Data saved in ${excelFileName}`));
}