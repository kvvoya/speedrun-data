import puppeteer from 'puppeteer';
import chalk from 'chalk';

const validUrlRegex = /^(ftp|http|https):\/\/[^ "]+$/;

async function scrapeCategoryLinks(page, link, oldLinks = []) {

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
         const categoryLinks = await scrapeCategoryLinks(page, filteredLink, [...oldLinks, ...filteredCategoryLinks]);
         filteredCategoryLinks = filteredCategoryLinks.concat(categoryLinks);
      }
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

   return Array.from(filteredCategoryLinksSet);
}

function filterToLevelLinks(links) {
   const filteredLevelLinks = Array.from(new Set(links.filter(link => link.includes('/level/'))));
   return filteredLevelLinks;
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
         const categoryLinks = await scrapeCategoryLinks(page, filteredLink, filteredLinks);
         categoryLinks.forEach(categoryLink => categoryLinksSet.add(categoryLink));
      }
   }

   const categoryLinksArray = Array.from(categoryLinksSet);
   console.log('Category links:', categoryLinksArray);
   console.log(chalk.black.bgGreen(`Found ${categoryLinksArray.length} categories.`));

   await browser.close();
}